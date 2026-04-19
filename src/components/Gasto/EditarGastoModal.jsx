import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { centerCrop, makeAspectCrop } from "react-image-crop";
import { updateDetalleGasto } from "../../services/update/updateGasto";
import { saveEvidenciaGasto } from "../../services/evidencia";
import { getDropdownOptionsCategoria } from "../../services/categoria";
import { getDropdownOptionsCentroCosto } from "../../services/centrocosto";
import EvidenciaUploader from "./FormGasto/EvidenciaUploader";
import EvidenciaCropModal from "./FormGasto/EvidenciaCropModal";
import EvidenciaImagen from "./EvidenciaImagen";
import { IconEdit } from "@/Icons/edit";
import { Save, X } from "lucide-react";

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


const getLocalIsoDateTime = () => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false,
    });

    const parts = formatter.formatToParts(new Date()).reduce((accumulator, part) => {
        if (part.type !== "literal") {
            accumulator[part.type] = part.value;
        }
        return accumulator;
    }, {});

    const fractionalSeconds = String(parts.fractionalSecond || "000").padEnd(3, "0").slice(0, 3);
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${fractionalSeconds}-05:00`;
};

const toInputDate = (value) => {
    if (!value) return "";
    const text = String(value);
    if (text.includes("T")) return text.split("T")[0];
    return text;
};

const firstDefined = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }
    return "";
};

const getFieldValue = (source, keys) => {
    if (!source || typeof source !== "object") return "";

    for (const key of keys) {
        const directValue = source[key];
        if (directValue !== undefined && directValue !== null && String(directValue).trim() !== "") {
            return directValue;
        }

        const matchedKey = Object.keys(source).find((currentKey) => currentKey.toLowerCase() === String(key).toLowerCase());
        if (matchedKey) {
            const matchedValue = source[matchedKey];
            if (matchedValue !== undefined && matchedValue !== null && String(matchedValue).trim() !== "") {
                return matchedValue;
            }
        }
    }

    return "";
};

const resolveTipoComprobante = (gasto) => {
    const value = getFieldValue(gasto, [
        "tipoComprobante",
        "tipocomprobante",
        "tipoCombrobante",
        "tipo_comprobante",
        "comprobante",
        "tipo",
        "nomTipoComprobante",
        "nomtipocomprobante",
        "nom_tipo_comprobante",
        "nomtipo_comprobante",
    ]);

    if (value && typeof value === "object") {
        return String(firstDefined(
            value.name,
            value.nombre,
            value.descripcion,
            value.description,
            value.label,
            value.value,
            value.codigo,
            value.code,
            value.id,
            ""
        ));
    }

    return String(value || "");
};

export default function EditarGastoModal({ gasto, isOpen, onClose, onSaved }) {
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState("");
    const [categorias, setCategorias] = useState([]);
    const [centrosCosto, setCentrosCosto] = useState([]);
    // Estados para cambio de evidencia
    const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
    const [newEvidencia, setNewEvidencia] = useState(null);
    const [newEvidenciaPreviewUrl, setNewEvidenciaPreviewUrl] = useState("");
    const [isEvidenciaCropMode, setIsEvidenciaCropMode] = useState(false);
    const [evidenciaCrop, setEvidenciaCrop] = useState();
    const [completedEvidenciaCrop, setCompletedEvidenciaCrop] = useState(null);
    const [selectedEvidenciaPreset, setSelectedEvidenciaPreset] = useState("doc");
    const [evidenciaCropShape, setEvidenciaCropShape] = useState("rect");
    const [isEvidenciaSaving, setIsEvidenciaSaving] = useState(false);
    const imageCropRef = useRef(null);
    const [formData, setFormData] = useState({
        proveedor: "",
        glosa: "",
        obs: "",
        centroCostoId: "",
        centroCosto: "",
        categoriaId: "",
        rucEmisor: "",
        razonSocial: "",
        rucCliente: "",
        tipoComprobante: "",
        serie: "",
        numero: "",
        fecha: "",
        total: "",
        igv: "",
        moneda: "",
        categoria: "",
        tipogasto: "",
        politica: "",
    });

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!gasto) return;

        const glosaRaw = String(gasto.glosa || "").trim();
        const glosaIsPlaceholder = ["CREAR GASTO", "CREAR GASTO MOVILIDAD"].includes(glosaRaw.toUpperCase());
        const glosaValue = glosaRaw && !glosaIsPlaceholder
            ? glosaRaw
            : String(gasto.obs || gasto.nota || gasto.observacion || gasto.observaciones || "").trim();

        const initialData = {
            proveedor: String(gasto.proveedor || ""),
            glosa: glosaValue,
            obs: String(gasto.obs || ""),
            centroCostoId: String(gasto.idCuenta || gasto.idcuenta || ""),
            centroCosto: String(gasto.centroCosto || gasto.consumidor || gasto.idCuenta || gasto.idcuenta || ""),
            categoriaId: String(gasto.idCategoria || gasto.idcategoria || gasto.categoriaId || gasto.categoria_id || ""),
            rucEmisor: String(gasto.rucEmisor || gasto.ruc || ""),
            razonSocial: String(gasto.razonSocial || gasto.proveedor || ""),
            rucCliente: String(gasto.rucCliente || gasto.ruccliente || ""),
            tipoComprobante: resolveTipoComprobante(gasto),
            serie: String(gasto.serie || ""),
            numero: String(gasto.numero || ""),
            fecha: toInputDate(gasto.fecha),
            total: String(gasto.total ?? ""),
            igv: String(gasto.igv ?? ""),
            moneda: String(gasto.moneda || ""),
            categoria: String(gasto.categoria || ""),
            tipogasto: String(gasto.tipogasto || ""),
            politica: String(gasto.politica || ""),
        };
        setFormData(initialData);
        setError("");
        setIsEditing(false);
        // Limpiar modal de evidencia al cambiar de gasto
        if (newEvidenciaPreviewUrl) {
            URL.revokeObjectURL(newEvidenciaPreviewUrl);
        }
        setShowEvidenciaModal(false);
        setNewEvidencia(null);
        setNewEvidenciaPreviewUrl("");
        setIsEvidenciaCropMode(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gasto]);

    useEffect(() => {
        const loadEditOptions = async () => {
            if (!isOpen) return;

            try {
                const categoriasData = await getDropdownOptionsCategoria({
                    politica: String(formData.politica || "todos"),
                });
                setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
            } catch (loadError) {
/*                 console.warn("No se pudieron cargar categorias para editar:", loadError?.message);
 */                setCategorias([]);
            }

            try {
                const userRaw = localStorage.getItem("user");
                const companyRaw = localStorage.getItem("company") || localStorage.getItem("empresa");
                const user = userRaw ? JSON.parse(userRaw) : null;
                const company = companyRaw ? JSON.parse(companyRaw) : null;

                const iduser = String(user?.usecod ?? user?.iduser ?? user?.id ?? "");
                const empresa = String(company?.empresa ?? company?.nombre ?? company?.name ?? "");

                if (!iduser || !empresa) {
                    setCentrosCosto([]);
                    return;
                }

                const centrosData = await getDropdownOptionsCentroCosto({ iduser, empresa });
                setCentrosCosto(Array.isArray(centrosData) ? centrosData : []);
            } catch (loadError) {
                /*  console.warn("No se pudieron cargar centros de costo para editar:", loadError?.message); */
                setCentrosCosto([]);
            }
        };

        loadEditOptions();
    }, [isOpen, formData.politica]);

    useEffect(() => {
        if (!categorias.length || formData.categoriaId) return;

        const matchByText = categorias.find((item) =>
            String(item.name || "").trim().toLowerCase() === String(formData.categoria || "").trim().toLowerCase()
        );

        if (!matchByText) return;

        setFormData((prev) => ({
            ...prev,
            categoriaId: String(matchByText.id || ""),
        }));
    }, [categorias, formData.categoria, formData.categoriaId]);

    useEffect(() => {
        if (!centrosCosto.length) return;
        if (formData.centroCostoId) return;

        const matchByText = centrosCosto.find((item) => {
            const label = String(item.consumidor || item.name || "").trim().toLowerCase();
            return label && label === String(formData.centroCosto || "").trim().toLowerCase();

        });

        if (!matchByText) return;

        setFormData((prev) => ({
            ...prev,
            centroCostoId: String(matchByText.id || ""),
        }));
    }, [centrosCosto, formData.centroCosto, formData.centroCostoId]);

    const title = useMemo(() => {
        const proveedor = String(gasto?.proveedor || "").trim();
        const idRend = String(firstDefined(gasto?.idrend, gasto?.idRend, gasto?.id, "-")).trim();

        return (
            <span className="flex flex-wrap items-center gap-1.5">
                <span>Editar gasto -</span>
                {proveedor && (
                    <>
                        <span className="text-slate-300">·</span>
                        <span className="text-blue-700">{proveedor}</span>
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 sm:text-xs">#ID Rend:{idRend}</span>
                    </>
                )}

            </span>
        );
    }, [gasto]);

    const evidenciaVisibleSrc = newEvidenciaPreviewUrl;

    const handleCategoriaChange = (e) => {
        const selectedId = String(e.target.value || "");
        const categoria = categorias.find((item) => String(item.id) === selectedId);
        setFormData((prev) => ({
            ...prev,
            categoriaId: selectedId,
            categoria: String(categoria?.name || prev.categoria || ""),
        }));
    };

    const handleCentroCostoChange = (e) => {
        const selectedId = String(e.target.value || "");
        const centro = centrosCosto.find((item) => String(item.id) === selectedId);
        setFormData((prev) => ({
            ...prev,
            centroCostoId: selectedId,
            centroCosto: String(centro?.consumidor || centro?.name || prev.centroCosto || ""),
        }));
    };

    const handleOpenEvidenciaChangeModal = () => {
        setError("");
        setShowEvidenciaModal(true);
    };

    const handleEvidenciaFileChange = (e) => {
        const selectedFile = e.target.files?.[0] || null;
        setNewEvidencia(selectedFile);

        if (selectedFile) {
            if (newEvidenciaPreviewUrl) {
                URL.revokeObjectURL(newEvidenciaPreviewUrl);
            }
            setNewEvidenciaPreviewUrl(URL.createObjectURL(selectedFile));
            setIsEvidenciaCropMode(false);
            setEvidenciaCrop(undefined);
            setCompletedEvidenciaCrop(null);
            setSelectedEvidenciaPreset("doc");
            setEvidenciaCropShape("rect");
        } else {
            setNewEvidenciaPreviewUrl("");
        }
    };

    const handleImageLoaded = useCallback(
        (event) => {
            const image = event.currentTarget;
            imageCropRef.current = image;
            const selectedAspect = cropPresets.find((item) => item.key === selectedEvidenciaPreset)?.aspect || null;
            setEvidenciaCrop(createInitialCrop(image.width, image.height, selectedAspect));
            setCompletedEvidenciaCrop(null);
        },
        [selectedEvidenciaPreset]
    );

    const handleStartEvidenciaCrop = () => {
        setIsEvidenciaCropMode(true);
    };

    const handleCancelEvidenciaCrop = () => {
        setIsEvidenciaCropMode(false);
    };

    const handleCompleteEvidenciaCrop = (crop) => {
        setCompletedEvidenciaCrop(crop);
    };

    const handleApplyEvidenciaCrop = async () => {
        if (!newEvidencia || !completedEvidenciaCrop || !imageCropRef.current) return;

        try {
            const croppedFile = await getCroppedFile(
                imageCropRef.current,
                completedEvidenciaCrop,
                newEvidencia
            );

            if (newEvidenciaPreviewUrl) {
                URL.revokeObjectURL(newEvidenciaPreviewUrl);
            }

            const newPreview = URL.createObjectURL(croppedFile);
            setNewEvidencia(croppedFile);
            setNewEvidenciaPreviewUrl(newPreview);
            setIsEvidenciaCropMode(false);
        } catch (cropError) {
            console.error("❌ Error recortando imagen:", cropError);
            alert("No se pudo recortar la imagen");
        }
    };

    const handleChangeEvidenciaPreset = (presetKey) => {
        const presetAspect = cropPresets.find((item) => item.key === presetKey)?.aspect || null;
        setSelectedEvidenciaPreset(presetKey);

        if (imageCropRef.current) {
            setEvidenciaCrop(
                createInitialCrop(
                    imageCropRef.current.width,
                    imageCropRef.current.height,
                    presetAspect
                )
            );
            setCompletedEvidenciaCrop(null);
        }
    };

    const handleSetEvidenciaCropShape = (shape) => {
        setEvidenciaCropShape(shape);
    };

    const handleResetEvidenciaCrop = () => {
        if (imageCropRef.current) {
            const selectedAspect = cropPresets.find((item) => item.key === selectedEvidenciaPreset)?.aspect || null;
            setEvidenciaCrop(
                createInitialCrop(
                    imageCropRef.current.width,
                    imageCropRef.current.height,
                    selectedAspect
                )
            );
            setCompletedEvidenciaCrop(null);
        } else {
            setEvidenciaCrop(undefined);
            setCompletedEvidenciaCrop(null);
        }
        setSelectedEvidenciaPreset("doc");
        setEvidenciaCropShape("rect");
    };

    const handleSaveNewEvidencia = async () => {
        setError("");
        setShowEvidenciaModal(false);
    };

    const buildEvidenceUpdate = async () => {
        if (!newEvidencia) return null;

        const idRend = String(
            gasto?.idrend ||
            gasto?.idRend ||
            gasto?.IDREND ||
            gasto?.IdRend ||
            formData?.idRend ||
            gasto?.id ||
            ""
        ).trim();

        if (!idRend) {
            throw new Error("No se pudo obtener el ID de la rendición. Por favor recarga el modal.");
        }

        const result = await saveEvidenciaGasto({
            idRend,
            file: newEvidencia,
            gastoData: {
                ruc: String(formData.rucEmisor || gasto.rucEmisor || gasto.ruc || ""),
                serie: String(formData.serie || gasto.serie || ""),
                numero: String(formData.numero || gasto.numero || ""),
            },
        });

        if (!result?.path) {
            throw new Error("La respuesta del servidor no contiene la ruta de la evidencia");
        }

        const evidenciaPath = String(result.path).trim();
        const evidenciaFileName = String(result?.fileName || newEvidencia?.name || "").trim();
        const evidenciaPatch = {
            obs: evidenciaPath,
            evidenciaPath,
            evidenciaFileName,
            evidenciaUpdatedAt: getLocalIsoDateTime(),
            path: evidenciaPath,
            ruta: evidenciaPath,
            rutaArchivo: evidenciaPath,
            pathArchivo: evidenciaPath,
            archivo: evidenciaFileName,
            fileName: evidenciaFileName,
            filename: evidenciaFileName,
            nombreArchivo: evidenciaFileName,
            nombrearchivo: evidenciaFileName,
            nomArchivo: evidenciaFileName,
            nomarchivo: evidenciaFileName,
        };

        return {
            idRend,
            evidenciaPath,
            evidenciaFileName,
            evidenciaPatch,
        };
    };

    const handleCloseEvidenciaModal = () => {
        setError("");
        setShowEvidenciaModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsSaving(true);

        try {
            const nowIso = getLocalIsoDateTime();
            const idRendValue = String(gasto.idrend || gasto.idRend || gasto.id || "");

            const rawUser = localStorage.getItem("user");
            const user = rawUser ? JSON.parse(rawUser) : null;
            const userId = Number.parseInt(String(user?.id ?? user?.usecod ?? user?.iduser ?? 0), 10) || 0;
            const userDni = String(
                user?.dni ||
                user?.DNI ||
                user?.usedoc ||
                user?.nrodoc ||
                user?.numdoc ||
                user?.documento ||
                user?.doc ||
                user?.usuario ||
                ""
            ).trim();

            const categoriaSeleccionada = categorias.find((item) => String(item.id) === String(formData.categoriaId || categoriaSelectedId)) || null;
            const centroCostoSeleccionado = centrosCosto.find((item) => String(item.id) === String(formData.centroCostoId || centroSelectedId)) || null;

            const resolvedCategoria = String(categoriaSeleccionada?.name || formData.categoria || gasto.categoria || "");
            const resolvedIdCuenta = String(
                formData.centroCostoId ||
                centroCostoSeleccionado?.id ||
                centroCostoSeleccionado?.raw?.idCuenta ||
                centroCostoSeleccionado?.raw?.idcuenta ||
                gasto.idCuenta ||
                gasto.idcuenta ||
                ""
            );
            const resolvedConsumidor = String(
                formData.centroCosto ||
                centroCostoSeleccionado?.consumidor ||
                centroCostoSeleccionado?.name ||
                centroCostoSeleccionado?.raw?.consumidor ||
                gasto.centroCosto ||
                gasto.consumidor ||
                ""
            );

            // Construir payload con TODOS los campos necesarios (backend puede esperar el objeto completo)
            let evidenciaUpdate = null;
            if (newEvidencia) {
                setIsEvidenciaSaving(true);
                try {
                    evidenciaUpdate = await buildEvidenceUpdate();
                    if (evidenciaUpdate?.evidenciaPatch) {
                        setFormData((prev) => ({
                            ...prev,
                            obs: evidenciaUpdate.evidenciaPath,
                            ...evidenciaUpdate.evidenciaPatch,
                        }));
                    }
                } finally {
                    setIsEvidenciaSaving(false);
                }
            }

            const payload = {
                rendicion: idRendValue,  // CAMPO REQUERIDO: alias de idRend para el backend
                idRend: idRendValue,
                idrend: idRendValue,
                idUser: userId,
                dni: userDni,
                politica: String(formData.politica || gasto.politica || ""),
                categoria: resolvedCategoria,
                categoriaId: String(formData.categoriaId || categoriaSeleccionada?.id || gasto.idCategoria || gasto.idcategoria || gasto.categoriaId || gasto.categoria_id || ""),
                idCategoria: String(formData.categoriaId || categoriaSeleccionada?.id || gasto.idCategoria || gasto.idcategoria || gasto.categoriaId || gasto.categoria_id || ""),
                tipogasto: String(formData.tipogasto || gasto.tipogasto || ""),
                ruc: String(formData.rucEmisor || gasto.rucEmisor || gasto.ruc || ""),
                proveedor: String(formData.razonSocial || formData.proveedor || gasto.proveedor || ""),
                tipoComprobante: String(formData.tipoComprobante || resolveTipoComprobante(gasto) || ""),
                tipocomprobante: String(formData.tipoComprobante || resolveTipoComprobante(gasto) || ""),
                tipoCombrobante: String(formData.tipoComprobante || resolveTipoComprobante(gasto) || ""),
                serie: String(formData.serie || gasto.serie || ""),
                numero: String(formData.numero || gasto.numero || ""),
                igv: Number(formData.igv || 0),
                fecha: String(formData.fecha || ""),
                total: Number(formData.total || 0),
                moneda: String(formData.moneda || ""),
                rucCliente: String(formData.rucCliente || gasto.rucCliente || gasto.ruccliente || ""),
                desEmp: String(gasto.desEmp || ""),
                desSed: String(gasto.desSed || ""),
                gerencia: String(gasto.gerencia || ""),
                area: String(gasto.area || ""),
                idCuenta: resolvedIdCuenta,
                idcuenta: resolvedIdCuenta,
                centroCostoId: resolvedIdCuenta,
                consumidor: resolvedConsumidor,
                centroCosto: resolvedConsumidor,
                placa: String(gasto.placa || ""),
                estadoActual: String(gasto.estadoActual || gasto.estado || ""),
                glosa: String(formData.glosa || ""),
                motivoViaje: String(gasto.motivoViaje || ""),
                lugarOrigen: String(gasto.lugarOrigen || ""),
                lugarDestino: String(gasto.lugarDestino || ""),
                tipoMovilidad: String(gasto.tipoMovilidad || ""),
                // IMPORTANTE: obs contiene la ruta de evidencia si se cambió
                obs: String(evidenciaUpdate?.evidenciaPath || formData.obs || ""),
                evidenciaPath: String(evidenciaUpdate?.evidenciaPath || formData.obs || ""),
                evidenciaFileName: String(evidenciaUpdate?.evidenciaFileName || ""),
                evidenciaUpdatedAt: String(evidenciaUpdate?.evidenciaPatch?.evidenciaUpdatedAt || getLocalIsoDateTime()),
                ...(evidenciaUpdate?.evidenciaPatch || {}),
                estado: String(gasto.estado || "S"),
                fecCre: String(gasto.fecCre || nowIso),
                useReg: userId,
                hostname: String(gasto.hostname || "WEB"),
                fecEdit: nowIso,
                useEdit: userId,
                useElim: 0,
            };
            /* 
                        console.log("📡 Enviando payload completo con cambios:", payload);
                        await updateDetalleGasto(payload);
                        console.log("✅ Gasto actualizado en BD"); */

            if (evidenciaUpdate) {
            }

            if (typeof onSaved === "function") {
                await onSaved(payload);
            }

            onClose();
        } catch (submitError) {
            console.error("❌ Error al guardar:", submitError);
            setError(submitError?.message || "No se pudo actualizar el gasto");
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-sm text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.02)] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
    const inputReadOnlyClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600";
    const selectReadOnlyClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500";
    const labelClass = "min-w-0 flex flex-col gap-1 text-[12px] font-semibold text-slate-500 sm:text-[13px]";
    const sectionClass = "rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm sm:p-3.5";
    const sectionTitleClass = "mb-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 sm:text-xs";

    const categoriaSelectedId = useMemo(() => {
        if (formData.categoriaId) return String(formData.categoriaId);
        const match = categorias.find((item) => String(item.name || "").trim().toLowerCase() === String(formData.categoria || "").trim().toLowerCase());
        return String(match?.id || "");
    }, [categorias, formData.categoria, formData.categoriaId]);

    const centroSelectedId = useMemo(() => {
        if (formData.centroCostoId) return String(formData.centroCostoId);
        const match = centrosCosto.find((item) => String(item.consumidor || item.name || "").trim().toLowerCase() === String(formData.centroCosto || "").trim().toLowerCase());
        return String(match?.id || "");
    }, [centrosCosto, formData.centroCosto, formData.centroCostoId]);

    if (!isOpen || !gasto) return null;

    return (
        <>
            <button
                type="button"
                aria-label="Cerrar modal"
                className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-50 flex justify-center items-end overflow-x-hidden p-0 sm:items-start sm:overflow-auto sm:p-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-full flex-col overflow-hidden border border-slate-200/80 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)] ring-1 ring-white/60 backdrop-blur-sm max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-[1.35rem] max-w-5xl">
                    {title && (
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-blue-100 bg-linear-to-r from-blue-50 via-white to-indigo-50 px-4 py-2.5 sm:px-6 sm:py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span className="h-7 w-1 rounded-full bg-linear-to-b from-blue-600 via-blue-700 to-indigo-500 sm:h-9" />
                                <h2 className="min-w-0 text-sm font-extrabold text-slate-800 sm:text-base">{title}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="cursor-pointer rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 sm:px-3.5 sm:py-1.5 sm:text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto bg-linear-to-b from-white to-slate-50/70 p-3 sm:p-5 lg:p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
                                <div className="space-y-4">
                                    <section className={sectionClass}>
                                        <h3 className={sectionTitleClass}>Datos Generales :</h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <label className={labelClass}>
                                                Politica
                                                <input name="politica" value={formData.politica} readOnly className={inputReadOnlyClass} />
                                            </label>
                                            <label className={labelClass}>
                                                Categoria
                                                <select
                                                    value={categoriaSelectedId}
                                                    onChange={handleCategoriaChange}
                                                    disabled={!isEditing}
                                                    className={isEditing ? inputClass : selectReadOnlyClass}
                                                >
                                                    <option value="">Selecciona una categoria</option>
                                                    {categorias.map((item) => (
                                                        <option key={item.id} value={item.id}>{item.name}</option>
                                                    ))}
                                                    {!categoriaSelectedId && formData.categoria && (
                                                        <option value="__current__">{formData.categoria}</option>
                                                    )}
                                                </select>
                                            </label>
                                            <label className={labelClass}>
                                                Centro de costo
                                                <select
                                                    value={centroSelectedId}
                                                    onChange={handleCentroCostoChange}
                                                    disabled={!isEditing}
                                                    className={isEditing ? inputClass : selectReadOnlyClass}
                                                >
                                                    <option value="">Selecciona un centro de costo</option>
                                                    {centrosCosto.map((item) => (
                                                        <option key={item.id} value={item.id}>{item.consumidor || item.name}</option>
                                                    ))}
                                                    {!centroSelectedId && formData.centroCosto && (
                                                        <option value="__current__">{formData.centroCosto}</option>
                                                    )}
                                                </select>
                                            </label>
                                            <label className={labelClass}>
                                                Tipo de gasto
                                                <input name="tipogasto" value={formData.tipogasto} readOnly className={inputReadOnlyClass} />
                                            </label>
                                        </div>
                                    </section>

                                    <section className={sectionClass}>
                                        <h3 className={sectionTitleClass}>Datos del Comprobante : </h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            <label className={labelClass}>
                                                Tipo Comprobante:
                                                <input type="text" name="tipoComprobante" value={formData.tipoComprobante} readOnly className={inputReadOnlyClass} />
                                            </label>
                                            {/* Movil: RUC en una sola fila (2 columnas). Tablet/PC: en fila con mayor ancho para evitar cortes. */}
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:col-span-2 sm:gap-3 lg:col-span-2">
                                                <label className={labelClass}>
                                                    RUC Emisor:
                                                    <input type="text" name="rucEmisor" value={formData.rucEmisor} readOnly className={inputReadOnlyClass} />
                                                </label>
                                                <label className={labelClass}>
                                                    RUC Cliente:
                                                    <input type="text" name="rucCliente" value={formData.rucCliente} readOnly className={inputReadOnlyClass} />
                                                </label>
                                            </div>

                                            <label className={`${labelClass} lg:col-span-3`}>
                                                Razon Social:
                                                <input type="text" name="razonSocial" value={formData.razonSocial} readOnly className={inputReadOnlyClass} />
                                            </label>
                                            {/* Movil: Serie y Numero en una sola fila. Tablet/PC: en fila con mayor ancho. */}
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:col-span-2 sm:gap-3 lg:col-span-2">
                                                <label className={labelClass}>
                                                    Serie:
                                                    <input type="text" name="serie" value={formData.serie} readOnly className={inputReadOnlyClass} />
                                                </label>
                                                <label className={labelClass}>
                                                    Numero:
                                                    <input type="text" name="numero" value={formData.numero} readOnly className={inputReadOnlyClass} />
                                                </label>
                                            </div>

                                            <label className={labelClass}>
                                                Fecha:
                                                <input type="date" name="fecha" value={formData.fecha} readOnly className={inputReadOnlyClass} />
                                            </label>

                                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:col-span-2 sm:gap-3 lg:col-span-2">
                                                <label className={labelClass}>
                                                    IGV:
                                                    <input type="number" step="0.01" name="igv" value={formData.igv} readOnly className={inputReadOnlyClass} />
                                                </label>
                                                <label className={labelClass}>
                                                    Total:
                                                    <input type="number" step="0.01" name="total" value={formData.total} readOnly className={inputReadOnlyClass} />
                                                </label>
                                                <label className={labelClass}>
                                                    Moneda:
                                                    <input name="moneda" value={formData.moneda} readOnly className={inputReadOnlyClass} />
                                                </label>
                                            </div>


                                            <label className={`${labelClass} sm:col-span-2 lg:col-span-3`}>
                                                Nota u obs de gasto
                                                <textarea name="glosa" rows="4" value={formData.glosa} readOnly className={`${inputReadOnlyClass} resize-none`} />
                                            </label>
                                        </div>
                                    </section>
                                </div>

                                <aside className="space-y-4 xl:sticky xl:top-2 xl:self-start">
                                    <section className={sectionClass}>
                                        <h3 className={sectionTitleClass}>Evidencia</h3>
                                        <button
                                            type="button"
                                            onClick={handleOpenEvidenciaChangeModal}
                                            disabled={!isEditing}
                                            className={isEditing ? "mb-4 w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer" : "mb-4 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed opacity-60"}
                                        >
                                            Cambiar evidencia
                                        </button>
                                        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                                            {evidenciaVisibleSrc ? (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                        Vista previa nueva
                                                    </p>
                                                    <img
                                                        src={evidenciaVisibleSrc}
                                                        alt="Evidencia del gasto"
                                                        className="max-h-[55vh] w-full rounded-xl border border-slate-200 object-contain bg-white"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ) : (
                                                <EvidenciaImagen
                                                    key={`${gasto?.id || gasto?.idrend || gasto?.evidenciaPath || gasto?.evidenciaFileName || formData.obs || "evidencia"}`}
                                                    gasto={gasto}
                                                    fallbackObs={formData.obs}
                                                    alt="Evidencia del gasto"
                                                    className="max-h-[55vh] w-full rounded-xl border border-slate-200 object-contain bg-white"
                                                    fallback={
                                                        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
                                                            No hay evidencia registrada para este gasto.
                                                        </p>
                                                    }
                                                />
                                            )}
                                        </div>
                                    </section>
                                </aside>
                            </div>

                            <div className="sticky bottom-0 -mx-3 border-t border-slate-200 bg-white/95 px-3 pt-2.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
                                {/* <div className="mb-2 text-xs font-semibold text-slate-500">
                        {isEditing ? "Modo edicion activo: puedes cambiar categoria y centro de costo." : "Modo lectura: presiona Editar para habilitar cambios."}
                    </div> */}
                                <div className="flex flex-row gap-2 sm:flex-row sm:justify-end">
                                    <div className="flex flex-1 gap-2 sm:flex-none sm:w-auto sm:gap-2">
                                        {!isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(true)}
                                                className="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 sm:w-auto cursor-pointer"
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    <IconEdit className="h-4 w-4 text-blue-600" />
                                                    <span className="hidden sm:inline">Editar</span>
                                                </span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 sm:w-auto cursor-pointer"
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <X className="h-4 w-4" />
                                                <span className="hidden sm:inline">Cancelar</span>
                                            </span>
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSaving || !isEditing}
                                        className="w-full rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto cursor-pointer"
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <Save className="h-4 w-4" />
                                            <span className="hidden sm:inline">{isSaving ? "Guardando..." : "Guardar cambios"}</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Modal para cambiar evidencia */}
                        {showEvidenciaModal && (
                            // Movil: aparece desde abajo. PC/Tablet (sm+): centrado.
                            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/70 p-2 sm:items-center sm:p-4">
                                <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-5">
                                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3 ">
                                        <h4 className="text-base font-bold text-slate-800">Cambiar evidencia</h4>
                                        <button
                                            type="button"
                                            onClick={handleCloseEvidenciaModal}
                                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                        >
                                            Cerrar
                                        </button>
                                    </div>

                                    {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

                                    <div className="space-y-4">
                                        <EvidenciaUploader
                                            labelClass={labelClass}
                                            formData={{ evidencia: newEvidencia }}
                                            hasEvidencia={!!newEvidencia}
                                            canCropImage={newEvidencia?.type?.startsWith("image/")}
                                            onFileChange={handleEvidenciaFileChange}
                                            onOpenPreview={() => { }}
                                            onStartCrop={handleStartEvidenciaCrop}
                                        />

                                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={handleCloseEvidenciaModal}
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 sm:w-auto"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveNewEvidencia}
                                                disabled={!newEvidencia || isEvidenciaSaving}
                                                className="w-full rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                            >
                                                {isEvidenciaSaving ? "Guardando..." : "Listo"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <EvidenciaCropModal
                            isOpen={showEvidenciaModal && isEvidenciaCropMode}
                            hasEvidencia={!!newEvidencia}
                            canCropImage={newEvidencia?.type?.startsWith("image/")}
                            isCropMode={isEvidenciaCropMode}
                            onClose={handleCancelEvidenciaCrop}
                            onStartCrop={handleStartEvidenciaCrop}
                            onCancelCrop={handleCancelEvidenciaCrop}
                            onApplyCrop={handleApplyEvidenciaCrop}
                            previewUrl={newEvidenciaPreviewUrl}
                            fileName={newEvidencia?.name}
                            crop={evidenciaCrop}
                            onChangeCrop={setEvidenciaCrop}
                            onCompleteCrop={handleCompleteEvidenciaCrop}
                            selectedAspect={cropPresets.find((item) => item.key === selectedEvidenciaPreset)?.aspect}
                            cropShape={evidenciaCropShape}
                            onImageLoaded={handleImageLoaded}
                            selectedPreset={selectedEvidenciaPreset}
                            onSelectPreset={handleChangeEvidenciaPreset}
                            cropPresets={cropPresets}
                            onSetCropShape={handleSetEvidenciaCropShape}
                            onReset={handleResetEvidenciaCrop}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}