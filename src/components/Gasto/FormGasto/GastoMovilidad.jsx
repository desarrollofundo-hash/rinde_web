import { useCallback, useEffect, useRef, useState } from "react";
import { centerCrop, makeAspectCrop } from "react-image-crop";
import EvidenciaUploader from "./EvidenciaUploader";
import EvidenciaCropModal from "./EvidenciaCropModal";
import QrScannerModal from "./QrScannerModal";
import Toast from "../../shared/Toast";
import useMovilidadForm from "../../../services/hooks/useMovilidadForm";

const getCroppedFile = async (imageElement, pixelCrop, originalFile) => {
    const canvas = document.createElement("canvas");
    const scaleX = imageElement.naturalWidth / imageElement.width;
    const scaleY = imageElement.naturalHeight / imageElement.height;
    const cropWidth = Math.max(1, Math.floor(pixelCrop.width * scaleX));
    const cropHeight = Math.max(1, Math.floor(pixelCrop.height * scaleY));

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
        imageElement,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        cropWidth,
        cropHeight
    );

    const mimeType = originalFile?.type || "image/jpeg";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.95));

    if (!blob) {
        throw new Error("No se pudo crear la imagen recortada");
    }

    return new File([blob], originalFile.name || "evidencia.jpg", {
        type: mimeType,
        lastModified: Date.now(),
    });
};

const cropPresets = [
    { key: "doc", label: "Documento", aspect: 4 / 3 },
    { key: "square", label: "Cuadrado", aspect: 1 / 1 },
    { key: "ticket", label: "Ticket", aspect: 16 / 9 },
    { key: "vertical", label: "Vertical", aspect: 3 / 4 },
    { key: "free", label: "Libre", aspect: null },
];

const createInitialCrop = (mediaWidth, mediaHeight, aspect) => {
    if (!aspect) {
        return centerCrop(
            {
                unit: "%",
                width: 80,
                height: 80,
            },
            mediaWidth,
            mediaHeight
        );
    }

    return centerCrop(
        makeAspectCrop(
            {
                unit: "%",
                width: 80,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    );
};

const normalizeText = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const resolveTipoGastoFromCentroCosto = (centroCosto) => {
    const raw = centroCosto?.raw ?? centroCosto ?? {};
    const metadata = raw?.metadata ?? centroCosto?.metadata ?? {};

    const candidates = [
        metadata.tipogasto,
        metadata.tipoGasto,
        raw.tipogasto,
        raw.tipoGasto,
        raw.nomtipogasto,
        raw.tipoGastoDesc,
        raw.descripcionTipoGasto,
        raw.consumidor,
        centroCosto?.name,
        centroCosto?.consumidor,
    ];

    const resolved = candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
    return resolved ? String(resolved).trim() : "";
};

const getLocalDateInputValue = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
};

export default function GastoMovilidad({ selectedPolitica: selectedPoliticaProp = null }) {
    const {
        formData,
        setFormData,
        politicas,
        categorias,
        centrosCosto,
        tiposMovilidad,
        handleFieldChange,
        handlePoliticaChange,
        handleCentroCostoChange,
        handleRucEmisorBlur,
        handleQrDetected,
        handleSubmit,
        errorMessage,
        setErrorMessage,
    } = useMovilidadForm({ selectedPolitica: selectedPoliticaProp });

    const [evidenciaPreviewUrl, setEvidenciaPreviewUrl] = useState("");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isCropMode, setIsCropMode] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [selectedPreset, setSelectedPreset] = useState("doc");
    const [cropShape, setCropShape] = useState("rect");
    const [isQrOpen, setIsQrOpen] = useState(false);
    const imageCropRef = useRef(null);

    const handleChange = (e) => {
        const { name, files } = e.target;

        if (files) {
            const selectedFile = files[0] || null;
            setFormData((prev) => ({
                ...prev,
                [name]: selectedFile,
            }));

            if (name === "evidencia") {
                if (evidenciaPreviewUrl) {
                    URL.revokeObjectURL(evidenciaPreviewUrl);
                }

                if (selectedFile) {
                    setEvidenciaPreviewUrl(URL.createObjectURL(selectedFile));
                    setCrop(undefined);
                    setCompletedCrop(null);
                    setSelectedPreset("doc");
                    setCropShape("rect");
                } else {
                    setEvidenciaPreviewUrl("");
                    setIsPreviewOpen(false);
                    setIsCropMode(false);
                    setCrop(undefined);
                    setCompletedCrop(null);
                    setSelectedPreset("doc");
                    setCropShape("rect");
                }
            }

            return;
        }

        handleFieldChange(e);
    };

    const selectedCategoria = categorias.find((categoria) => String(categoria.id) === String(formData.categoria));
    const isPlanillaMovilidad = normalizeText(selectedCategoria?.name).includes("PLANILLA DE MOVILIDAD");

    const handleCategoriaChange = (e) => {
        const { value } = e.target;
        const categoriaSeleccionada = categorias.find((categoria) => String(categoria.id) === String(value));
        const planillaSeleccionada = normalizeText(categoriaSeleccionada?.name).includes("PLANILLA DE MOVILIDAD");

        if (planillaSeleccionada && centrosCosto.length > 0) {
            const centroAutomatico = centrosCosto[0];
            const fechaDefault = String(formData.fecha || "").trim() || getLocalDateInputValue();

            setFormData((prev) => ({
                ...prev,
                categoria: value,
                centroCosto: String(centroAutomatico?.id || ""),
                tipoGasto: resolveTipoGastoFromCentroCosto(centroAutomatico),
                consumidor: centroAutomatico?.consumidor || centroAutomatico?.name || "",
                fecha: prev.fecha || fechaDefault,
            }));

            return;
        }

        setFormData((prev) => ({
            ...prev,
            categoria: value,
        }));
    };

    const selectedAspect = cropPresets.find((item) => item.key === selectedPreset)?.aspect || (4 / 3);

    const handleResetCropState = () => {
        if (imageCropRef.current) {
            setCrop(
                createInitialCrop(
                    imageCropRef.current.width,
                    imageCropRef.current.height,
                    selectedAspect
                )
            );
            setCompletedCrop(null);
        } else {
            setCrop(undefined);
            setCompletedCrop(null);
        }
        setSelectedPreset("doc");
        setCropShape("rect");
    };

    const handleImageLoaded = useCallback(
        (event) => {
            const image = event.currentTarget;
            imageCropRef.current = image;
            setCrop(createInitialCrop(image.width, image.height, selectedAspect));
            setCompletedCrop(null);
        },
        [selectedAspect]
    );

    const handleChangePreset = (presetKey) => {
        const presetAspect = cropPresets.find((item) => item.key === presetKey)?.aspect || null;
        setSelectedPreset(presetKey);

        if (imageCropRef.current) {
            setCrop(
                createInitialCrop(
                    imageCropRef.current.width,
                    imageCropRef.current.height,
                    presetAspect
                )
            );
            setCompletedCrop(null);
        }
    };

    const handleApplyCrop = async () => {
        if (!formData.evidencia || !completedCrop || !imageCropRef.current) return;

        try {
            const croppedFile = await getCroppedFile(
                imageCropRef.current,
                completedCrop,
                formData.evidencia
            );

            if (evidenciaPreviewUrl) {
                URL.revokeObjectURL(evidenciaPreviewUrl);
            }

            const newPreview = URL.createObjectURL(croppedFile);
            setFormData((prev) => ({ ...prev, evidencia: croppedFile }));
            setEvidenciaPreviewUrl(newPreview);
            setIsCropMode(false);
        } catch (error) {
            console.error("Error recortando imagen en movilidad:", error);
            alert("No se pudo recortar la imagen");
        }
    };


    useEffect(() => {
        return () => {
            if (evidenciaPreviewUrl) {
                URL.revokeObjectURL(evidenciaPreviewUrl);
            }
        };
    }, [evidenciaPreviewUrl]);

    const fieldClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200";
    const labelClass = "mb-1 block text-sm font-semibold text-slate-700";
    const hasEvidencia = Boolean(formData.evidencia);
    const canCropImage = hasEvidencia && String(formData.evidencia?.type || "").startsWith("image/");

    return (
        <>
            <form onSubmit={handleSubmit} className="mx-auto mt-4 w-full max-w-6xl space-y-4 rounded-3xl bg-linear-to-br from-slate-50 via-white to-cyan-50 ">


                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <EvidenciaUploader
                        labelClass={labelClass}
                        formData={formData}
                        hasEvidencia={hasEvidencia}
                        canCropImage={canCropImage}
                        onFileChange={handleChange}
                        onOpenPreview={() => {
                            setIsPreviewOpen(true);
                            setIsCropMode(false);
                        }}
                        onStartCrop={() => {
                            setIsPreviewOpen(true);
                            setIsCropMode(true);
                        }}
                    />

                    {!isPlanillaMovilidad && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <label className={labelClass}>Lector de código QR</label>
                            <p className="mt-1 text-sm text-slate-500">Escanea para autocompletar datos del comprobante.</p>
                            <button
                                type="button"
                                className="mt-3 inline-flex items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                onClick={() => setIsQrOpen(true)}
                            >
                                Escanear QR
                            </button>
                        </div>
                    )}
                </div>

                {/*DATOS GENERALES */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <h3 className="mb-3 text-lg font-bold text-slate-800">Datos Generales</h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>Política</label>
                            <select
                                name="politica"
                                className={`${fieldClass} ${selectedPoliticaProp ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
                                value={formData.politica}
                                onChange={handlePoliticaChange}
                                disabled={Boolean(selectedPoliticaProp)}
                                title={selectedPoliticaProp ? "La política ya fue seleccionada desde el formulario principal" : undefined}
                            >
                                <option value="">Seleccionar política</option>
                                {politicas.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Categoría</label>
                            <select
                                name="categoria"
                                className={fieldClass}
                                value={formData.categoria}
                                onChange={handleCategoriaChange}
                            >
                                <option value="">Seleccionar categoría</option>
                                {categorias.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelClass}>Centro de Costo</label>
                            {isPlanillaMovilidad ? (
                                <input
                                    type="text"
                                    className={`${fieldClass} bg-slate-100 text-slate-500`}
                                    value={centrosCosto.find((cc) => String(cc.id) === String(formData.centroCosto))?.name || "Centro automático"}
                                    readOnly
                                    disabled
                                />
                            ) : (
                                <select
                                    name="centroCosto"
                                    className={fieldClass}
                                    value={formData.centroCosto}
                                    onChange={handleCentroCostoChange}
                                >
                                    <option value="">Seleccionar centro de costo</option>
                                    {centrosCosto.map((cc) => (
                                        <option key={cc.id} value={cc.id}>
                                            {cc.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/*TIPO DE GASTO */}
                        <div>
                            <label className={labelClass}>Tipo de Gasto</label>
                            <input
                                type="text"
                                value={formData.tipoGasto || ""}
                                placeholder="Automático según centro de costo"
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
                            />
                        </div>

                    </div>
                </section>

                {isPlanillaMovilidad ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h3 className="mb-3 text-lg font-bold text-slate-800">Datos del comprobante</h3>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className={labelClass}>RUC Cliente</label>
                                <input type="text" name="rucCliente" className={fieldClass} value={formData.rucCliente} readOnly onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Fecha de emisión</label>
                                <input type="date" name="fecha" className={fieldClass} value={formData.fecha} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className={labelClass}>Total</label>
                                <input type="number" name="total" className={fieldClass} value={formData.total} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Moneda</label>
                                <select name="moneda" className={fieldClass} value={formData.moneda} onChange={handleChange}>
                                    <option value="">Seleccionar</option>
                                    <option value="01">PEN</option>
                                    <option value="03">USD</option>
                                </select>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h3 className="mb-3 text-lg font-bold text-slate-800">Datos del comprobante</h3>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className={labelClass}>RUC Emisor</label>
                                <input type="text" name="rucEmisor" placeholder="RUC del Emisor" className={fieldClass} value={formData.rucEmisor} onChange={handleChange} onBlur={handleRucEmisorBlur} />
                            </div>
                            <div>
                                <label className={labelClass}>Razón Social</label>
                                <input type="text" name="razonSocial" placeholder="Proveedor / Razón social" className={fieldClass} value={formData.razonSocial} readOnly />
                            </div>
                            <div>
                                <label className={labelClass}>RUC Cliente</label>
                                <input type="text" name="rucCliente" placeholder="RUC del Cliente" className={fieldClass} value={formData.rucCliente} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Tipo Comprobante</label>
                                <select name="tipoComprobante" className={fieldClass} value={formData.tipoComprobante} onChange={handleChange}>
                                    <option value="">Seleccionar</option>
                                    <option value="01">FACTURA ELECTRONICA</option>
                                    <option value="03">BOLETA</option>
                                    <option value="07">NOTA DE CRÉDITO</option>
                                    <option value="08">NOTA DE DÉBITO</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Fecha</label>
                                <input type="date" name="fecha" className={fieldClass} value={formData.fecha} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Serie</label>
                                <input type="text" name="serie" placeholder="Serie" className={fieldClass} value={formData.serie} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Número</label>
                                <input type="number" name="numero" placeholder="Número" className={fieldClass} value={formData.numero} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>IGV</label>
                                <input type="number" name="igv" placeholder="IGV" className={fieldClass} value={formData.igv} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Total</label>
                                <input type="number" name="total" placeholder="Total" className={fieldClass} value={formData.total} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Moneda</label>
                                <select name="moneda" className={fieldClass} value={formData.moneda} onChange={handleChange}>
                                    <option value="">Seleccionar</option>
                                    <option value="01">PEN</option>
                                    <option value="03">USD</option>
                                </select>
                            </div>
                        </div>
                    </section>
                )}
                {isPlanillaMovilidad && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h3 className="mb-3 text-lg font-bold text-slate-800">Datos de la Movilidad</h3>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className={labelClass}>Origen</label>
                                <input type="text" name="origen" placeholder="Origen" className={fieldClass} value={formData.origen || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Destino</label>
                                <input type="text" name="destino" placeholder="Destino" className={fieldClass} value={formData.destino || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Motivo de viaje</label>
                                <input type="text" name="motivoViaje" placeholder="Motivo de viaje" className={fieldClass} value={formData.motivoViaje || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>Tipo de movilidad</label>
                                <select
                                    name="tipoMovilidad"
                                    className={fieldClass}
                                    value={formData.tipoMovilidad || ""}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccionar tipo de movilidad</option>
                                    {tiposMovilidad.map((item) => (
                                        <option key={item.id} value={item.name}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Placa</label>
                                <input type="text" name="placa" placeholder="Placa" className={fieldClass} value={formData.placa || ""} onChange={handleChange} />
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <label className={`${labelClass} mb-1`}>Glosa o Nota</label>
                    <textarea
                        name="glosa"
                        placeholder="Glosa o Nota"
                        className={`${fieldClass} min-h-28 resize-y`}
                        value={formData.glosa}
                        onChange={handleChange}
                    />
                </section>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    /* onClick={() => console.log("Cancelar")} */
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                        Guardar
                    </button>
                </div>

                <EvidenciaCropModal
                    isOpen={isPreviewOpen}
                    hasEvidencia={hasEvidencia}
                    canCropImage={canCropImage}
                    isCropMode={isCropMode}
                    onClose={() => {
                        setIsPreviewOpen(false);
                        setIsCropMode(false);
                    }}
                    onStartCrop={() => setIsCropMode(true)}
                    onCancelCrop={() => setIsCropMode(false)}
                    onApplyCrop={handleApplyCrop}
                    previewUrl={evidenciaPreviewUrl}
                    fileName={formData.evidencia?.name}
                    crop={crop}
                    onChangeCrop={(nextCrop) => setCrop(nextCrop)}
                    onCompleteCrop={(pixelCrop) => setCompletedCrop(pixelCrop)}
                    selectedAspect={selectedAspect}
                    cropShape={cropShape}
                    onImageLoaded={handleImageLoaded}
                    selectedPreset={selectedPreset}
                    onSelectPreset={handleChangePreset}
                    cropPresets={cropPresets}
                    onSetCropShape={setCropShape}
                    onReset={handleResetCropState}
                />

                <QrScannerModal
                    isOpen={isQrOpen}
                    onClose={() => setIsQrOpen(false)}
                    onDetected={handleQrDetected}
                />
            </form>

            <Toast
                message={errorMessage}
                type="error"
                isVisible={Boolean(errorMessage)}
                onClose={() => setErrorMessage("")}
                duration={5000}
            />
        </>
    );
}