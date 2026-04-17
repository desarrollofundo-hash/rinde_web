import { useCallback, useEffect, useRef, useState } from "react";
import { centerCrop, makeAspectCrop } from "react-image-crop";
import { getDropdownOptionsPolitica } from "../../../services/politica";
import { getDropdownOptionsCategoria } from "../../../services/categoria";
import { getDropdownOptionsCentroCosto } from "../../../services/centrocosto";
import { getDropdownOptionsTipoGasto } from "../../../services/tipogasto";
import { getDropdownOptionsTipoComprobante } from "../../../services/tipocomprobante";
import { saveRendicionGasto } from "../../../services/save/saveGasto";
import { saveDetalleGasto } from "../../../services/save_detalle/saveGastoDetalle";
import { saveEvidenciaGasto } from "../../../services/evidencia";
import { getApiRuc } from "../../../services/ruc/api_ruc";
import EvidenciaUploader from "./EvidenciaUploader";
import EvidenciaCropModal from "./EvidenciaCropModal";
import QrScannerModal from "./QrScannerModal";
import Toast from "../../shared/Toast.jsx";

const getUserDni = (user) => {
    if (!user || typeof user !== "object") return "";

    const candidates = [
        user.dni,
        user.DNI,
        user.usedoc,
        user.nrodoc,
        user.numdoc,
        user.documento,
        user.docident,
        user.doc,
        user.usuario,
    ];

    const dni = candidates.find(
        (value) => value !== undefined && value !== null && String(value).trim() !== ""
    );

    return dni ? String(dni).trim() : "";
};

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

const normalizeQrDate = (value) => {
    const dateText = String(value || "").trim();
    if (!dateText) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        return dateText;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateText)) {
        const [dd, mm, yyyy] = dateText.split("/");
        return `${yyyy}-${mm}-${dd}`;
    }

    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateText)) {
        return dateText.replaceAll("/", "-");
    }

    return "";
};

const getLocalIsoDateTime = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 23);
};

const normalizeText = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const normalizeRuc = (value) => String(value ?? "").replace(/\D/g, "").trim();

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

const INITIAL_FORM_DATA = {
    dni: "",
    politica: "",
    categoria: "",
    centroCosto: "",
    tipoGasto: "",
    rucEmisor: "",
    razonSocial: "",
    proveedor: "",
    tipoComprobante: "",
    serie: "",
    numeroSerie: "",
    numero: "",
    igv: "",
    fecha: "",
    total: "",
    moneda: "",
    rucCliente: "",
    gerencia: "",
    consumidor: "",
    placa: "",
    glosa: "",
    obs: "",
    evidencia: null,
};

const FALLBACK_TIPOS_COMPROBANTE = [
    { id: "01", name: "FACTURA ELECTRONICA" },
    { id: "03", name: "BOLETA DE VENTA" },
    { id: "07", name: "NOTA DE CREDITO" },
    { id: "08", name: "NOTA DE DEBITO" },
    { id: "10", name: "RECIBO POR HONORARIO" },
    { id: "11", name: "OTROS" },
];

const parseQrPayload = (rawText) => {
    const payload = String(rawText || "").trim();
    if (!payload) return {};

    try {
        const json = JSON.parse(payload);
        return {
            rucEmisor: String(json.ruc || json.rucEmisor || json.RUC || ""),
            tipoComprobante: String(json.tipoComprobante || json.tipocomprobante || json.tipo || ""),
            serie: String(json.serie || ""),
            numero: String(json.numero || json.correlativo || ""),
            igv: String(json.igv || ""),
            total: String(json.total || json.monto || ""),
            fecha: normalizeQrDate(json.fecha || json.fechaEmision || ""),
            rucCliente: String(json.rucCliente || json.rucReceptor || ""),
            razonSocial: String(
                json.razonSocial ||
                json.razonsocial ||
                json.nombre ||
                json.nombreComercial ||
                json.proveedor ||
                ""
            ),
            proveedor: String(json.proveedor || json.nombre || json.razonSocial || ""),
        };
    } catch {
        const parts = payload.split("|").map((item) => item.trim());
        if (parts.length < 4) {
            return {};
        }

        return {
            rucEmisor: String(parts[0] || ""),
            tipoComprobante: String(parts[1] || ""),
            serie: String(parts[2] || ""),
            numero: String(parts[3] || ""),
            igv: String(parts[4] || ""),
            total: String(parts[5] || ""),
            fecha: normalizeQrDate(parts[6] || ""),
            rucCliente: String(parts[8] || ""),
            razonSocial: "",
            proveedor: "",
        };
    }
};

export default function GastoGeneral({ selectedPolitica: selectedPoliticaProp = null }) {
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    const [politicas, setPoliticas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [centrosCosto, setCentrosCosto] = useState([]);
    const [_tiposGasto, setTiposGasto] = useState([]);
    const [tiposComprobante, setTiposComprobante] = useState(FALLBACK_TIPOS_COMPROBANTE);
    const [evidenciaPreviewUrl, setEvidenciaPreviewUrl] = useState("");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isCropMode, setIsCropMode] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [selectedPreset, setSelectedPreset] = useState("doc");
    const [cropShape, setCropShape] = useState("rect");
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [toastConfig, setToastConfig] = useState({ isVisible: false, message: "", type: "success" });
    const imageCropRef = useRef(null);

    const showToast = (message, type = "success") => {
        setToastConfig({ isVisible: true, message, type });
    };

    const closeToast = () => {
        setToastConfig((prev) => ({ ...prev, isVisible: false }));
    };

    const loadCentrosCosto = useCallback(async () => {
        const rawUser = localStorage.getItem("user");
        const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");

        if (!rawUser || !rawEmpresa) {
            throw new Error("No hay sesion completa para cargar centros de costo");
        }

        const user = JSON.parse(rawUser);
        const empresa = JSON.parse(rawEmpresa);

        const iduser = user?.usecod ?? user?.iduser ?? user?.id;
        const empresaNombre = empresa?.empresa ?? empresa?.nombre ?? empresa?.name;

        if (!iduser || !empresaNombre) {
            throw new Error("Faltan datos de usuario o empresa para centros de costo");
        }

        const centrosData = await getDropdownOptionsCentroCosto({
            iduser: String(iduser),
            empresa: String(empresaNombre),
        });
        setCentrosCosto(centrosData);
    }, []);

    const loadTiposGasto = async () => {
        const tiposData = await getDropdownOptionsTipoGasto();
        /* console.log("🔥 Tipos de gasto:", tiposData); */
        setTiposGasto(tiposData);
    };

    const loadTiposComprobante = useCallback(async () => {
        try {
            const tiposData = await getDropdownOptionsTipoComprobante();
            if (Array.isArray(tiposData) && tiposData.length > 0) {
                setTiposComprobante(tiposData);
            } else {
                setTiposComprobante(FALLBACK_TIPOS_COMPROBANTE);
            }
        } catch (error) {
            console.error("Error cargando tipos de comprobante:", error);
            setTiposComprobante(FALLBACK_TIPOS_COMPROBANTE);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;

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
                }
            }

            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value,
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
            console.error("❌ Error recortando imagen:", error);
            showToast("No se pudo recortar la imagen", "error");
        }
    };

    const handleQrDetected = async (decodedText) => {
        const parsed = parseQrPayload(decodedText);
        const rucEmisorLimpio = String(parsed.rucEmisor || "").replace(/\D/g, "");
        const razonSocialQr = String(parsed.razonSocial || "").trim();
        const proveedorQr = String(parsed.proveedor || "").trim();
        const razonSocialInicial = razonSocialQr || proveedorQr;

        setFormData((prev) => ({
            ...prev,
            rucEmisor: rucEmisorLimpio || prev.rucEmisor,
            tipoComprobante: parsed.tipoComprobante || prev.tipoComprobante,
            serie: parsed.serie || prev.serie,
            numero: parsed.numero || prev.numero,
            igv: parsed.igv || prev.igv,
            total: parsed.total || prev.total,
            fecha: parsed.fecha || prev.fecha,
            rucCliente: parsed.rucCliente || prev.rucCliente,
            razonSocial: razonSocialInicial || prev.razonSocial,
            proveedor: razonSocialInicial || prev.proveedor,
        }));

        if (!razonSocialInicial && /^\d{11}$/.test(rucEmisorLimpio)) {
            try {
                const data = await getApiRuc({ ruc: rucEmisorLimpio });
                const razonSocial =
                    data?.razonSocial ||
                    data?.nombre_o_razon_social ||
                    data?.nombreORazonSocial ||
                    data?.nombre ||
                    data?.nombreComercial ||
                    data?.nombreComercialSunat ||
                    "";

                if (razonSocial) {
                    setFormData((prev) => ({
                        ...prev,
                        razonSocial,
                        proveedor: razonSocial,
                    }));
                }
            } catch (error) {
                console.error("No se pudo autocompletar razon social por RUC:", error);
            }
        }

        showToast("QR escaneado. Se autocompletaron los datos detectados", "success");
    };

    const handleRucEmisorBlur = async () => {
        const ruc = String(formData.rucEmisor || "").trim();
        if (!/^\d{11}$/.test(ruc)) return;

        try {
            const data = await getApiRuc({ ruc });
            const razonSocial =
                data?.razonSocial ||
                data?.nombre_o_razon_social ||
                data?.nombreORazonSocial ||
                data?.nombre ||
                data?.nombreComercial ||
                data?.nombreComercialSunat ||
                "";

            if (razonSocial) {
                setFormData((prev) => ({
                    ...prev,
                    razonSocial,
                    proveedor: razonSocial,
                }));
            }
        } catch (error) {
            console.error("❌ Error validando RUC emisor:", error.message);
        }
    };

    const loadCategorias = useCallback(async (politica = "todos") => {
        const categoriasData = await getDropdownOptionsCategoria({ politica });
        setCategorias(categoriasData);

        setFormData((prev) => {
            if (prev.categoria && categoriasData.some((c) => String(c.id) === String(prev.categoria))) {
                return prev;
            }
            return { ...prev, categoria: "" };
        });
                }, []);

    const handlePoliticaChange = async (e) => {
        const politicaId = e.target.value;
        setCategorias([]);
        setFormData((prev) => ({
            ...prev,
            politica: politicaId,
            categoria: "",
        }));

        const politicaSeleccionada = politicas.find((p) => String(p.id) === String(politicaId));
        const politicaNombre = politicaSeleccionada?.name || "todos";

        try {
            await loadCategorias(politicaNombre);
        } catch (error) {
            console.error("Error cargando categorias por politica:", error);
            setCategorias([]);
        }
    };

    useEffect(() => {
        if (!selectedPoliticaProp) {
            return;
        }

        const politicaId = String(selectedPoliticaProp.id ?? "");
        const politicaNombre = String(selectedPoliticaProp.name ?? "todos").trim() || "todos";

        Promise.resolve().then(() => {
            setCategorias([]);

            setFormData((prev) => {
                if (String(prev.politica ?? "") === politicaId) {
                    return prev;
                }

                return {
                    ...prev,
                    politica: politicaId,
                    categoria: "",
                };
            });
        });

        Promise.resolve().then(() => loadCategorias(politicaNombre)).catch((error) => {
            console.error("Error cargando categorias por politica seleccionada:", error);
            setCategorias([]);
        });
    }, [loadCategorias, politicas, selectedPoliticaProp]);

    const selectedCategoria = categorias.find((categoria) => String(categoria.id) === String(formData.categoria));
    const isPlanillaMovilidad = normalizeText(selectedCategoria?.name).includes("PLANILLA DE MOVILIDAD");

    useEffect(() => {
        if (!isPlanillaMovilidad || centrosCosto.length === 0) {
            return;
        }

        const centroAutomatico = centrosCosto[0];

        Promise.resolve().then(() => {
            setFormData((prev) => {
                const currentCentro = String(prev.centroCosto || "");
                const autoCentro = String(centroAutomatico?.id || "");

                if (currentCentro === autoCentro && prev.tipoGasto) {
                    return prev;
                }

                return {
                    ...prev,
                    centroCosto: autoCentro,
                    tipoGasto: resolveTipoGastoFromCentroCosto(centroAutomatico),
                    consumidor: centroAutomatico?.consumidor || centroAutomatico?.name || "",
                };
            });
        });
    }, [centrosCosto, isPlanillaMovilidad]);

    const handleCentroCostoChange = (e) => {
        const { value } = e.target;
        const centroSeleccionado = centrosCosto.find((cc) => String(cc.id) === String(value));
        setFormData((prev) => ({
            ...prev,
            centroCosto: value,
            tipoGasto: resolveTipoGastoFromCentroCosto(centroSeleccionado),
            consumidor: centroSeleccionado?.consumidor || centroSeleccionado?.name || "",
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const rawUser = localStorage.getItem("user");
        if (!rawUser) {
            console.error("❌ No se ha encontrado el usuario en el localStorage.");
            showToast("Error de autenticación. Por favor, inicie sesión de nuevo.", "error");
            return;
        }
        const user = JSON.parse(rawUser);
        const userId = user?.id ?? user?.usecod ?? user?.iduser;
        const userDni = getUserDni(user);
        const dniToSend = String(formData.dni || userDni || "").trim();
        const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
        const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;
        const rucClienteFormulario = normalizeRuc(formData.rucCliente);
        const rucEmpresaSesion = normalizeRuc(empresa?.ruc ?? empresa?.RUC ?? empresa?.numRuc);


        if (!userId) {
            console.error("❌ No se ha encontrado el usuario en el localStorage o no tiene ID.");
            showToast("Error de autenticación. Por favor, inicie sesión de nuevo.", "error");
            return;
        }

        if (!rucClienteFormulario || !rucEmpresaSesion || rucClienteFormulario !== rucEmpresaSesion) {
            showToast("No se puede guardar: el RUC Cliente debe ser igual al RUC de la empresa logueada.", "error");
            return;
        }

        try {
            const politicaSeleccionada = politicas.find((p) => String(p.id) === String(formData.politica));
            const categoriaSeleccionada = categorias.find((c) => String(c.id) === String(formData.categoria));
            const centroCostoSeleccionado = centrosCosto.find((cc) => String(cc.id) === String(formData.centroCosto));
            const resolvedIdCuenta = String(
                centroCostoSeleccionado?.id ||
                centroCostoSeleccionado?.raw?.idCuenta ||
                centroCostoSeleccionado?.raw?.idcuenta ||
                formData.centroCosto ||
                ""
            );
            const resolvedTipoGasto = String(
                formData.tipoGasto ||
                resolveTipoGastoFromCentroCosto(centroCostoSeleccionado) ||
                ""
            );
            const resolvedConsumidor = String(
                formData.consumidor ||
                centroCostoSeleccionado?.consumidor ||
                centroCostoSeleccionado?.raw?.consumidor ||
                centroCostoSeleccionado?.name ||
                ""
            );

            if (!resolvedIdCuenta) {
                showToast("Selecciona un centro de costo antes de guardar", "warning");
                return;
            }

            const tipoComprobanteDescripcion =
                formData.tipoComprobante === "01"
                    ? "FACTURA ELECTRONICA"
                    : formData.tipoComprobante === "03"
                        ? "BOLETA"
                        : formData.tipoComprobante === "07"
                            ? "NOTA DE CRÉDITO"
                            : formData.tipoComprobante === "08"
                                ? "NOTA DE DÉBITO"
                                : String(formData.tipoComprobante || "");

            const monedaDescripcion =
                formData.moneda === "01"
                    ? "PEN"
                    : formData.moneda === "03"
                        ? "USD"
                        : String(formData.moneda || "");

            const igvNumber = Number(formData.igv);
            const totalNumber = Number(formData.total);
            const nowIso = getLocalIsoDateTime();

            const payloadCabecera = {
                idUser: String(userId),
                dni: dniToSend,
                politica: String(politicaSeleccionada?.name ?? formData.politica),
                categoria: String(categoriaSeleccionada?.name ?? formData.categoria),
                tipogasto: String(resolvedTipoGasto),
                idCuenta: resolvedIdCuenta,
                consumidor: resolvedConsumidor,
                ruc: String(formData.rucEmisor || ""),
                rucCliente: String(formData.rucCliente || ""),
                desEmp: String(empresa?.nombre || empresa?.empresa || ""),
                desSed: "",
                gerencia: String(empresa?.gerencia || ""),
                area: String(empresa?.area || ""),
                proveedor: String(formData.razonSocial || formData.proveedor || ""),
                tipoComprobante: tipoComprobanteDescripcion,
                tipocomprobante: tipoComprobanteDescripcion,
                tipoCombrobante: tipoComprobanteDescripcion,
                serie: String(formData.serie),
                numero: String(formData.numero),
                fecha: String(formData.fecha || ""),
                igv: Number.isFinite(igvNumber) ? igvNumber : 0,
                total: Number.isFinite(totalNumber) ? totalNumber : 0,
                moneda: monedaDescripcion,
                estadoActual: "BORRADOR",
                glosa: String(formData.glosa || ""),
                motivoViaje: "",
                lugarOrigen: "",
                lugarDestino: "",
                tipoMovilidad: "",
                obs: String(formData.obs || ""),
                estado: "S",
                fecCre: nowIso,
                useReg: String(userId),
                hostname: "WEB",
                FecEdit: nowIso,
                DecEdit: nowIso,
                UseEdit: 0,
                useElim: 0,
            };
            /* console.log("📡 Payload cabecera:", payloadCabecera); */

            const responseCabecera = await saveRendicionGasto(payloadCabecera);

            const payloadDetalle = {
                // Enviar payload completo para evitar que updaterendiciongasto pise columnas en null.
                ...payloadCabecera,
                idRend: String(responseCabecera),
                idrend: String(responseCabecera),
                FecEdit: nowIso,
                DecEdit: nowIso,
                useEdit: 0,
                UseEdit: 0,
                idcuenta: resolvedIdCuenta,
                consumidor: resolvedConsumidor,
                dni: dniToSend,
                gerencia: String(empresa?.gerencia || formData.gerencia || ""),
                placa: String(formData.placa || ""),
                obs: String(formData.obs || ""),
            };

            /* console.log("📡 Payload detalle:", JSON.stringify(payloadDetalle, null, 2)); */

            await saveDetalleGasto(payloadDetalle);

            if (formData.evidencia) {
                const evidenciaResult = await saveEvidenciaGasto({
                    idRend: responseCabecera,
                    file: formData.evidencia,
                    gastoData: {
                        ruc: String(formData.rucEmisor || ""),
                        serie: String(formData.serie || ""),
                        numero: String(formData.numero || ""),
                    },
                });

                const evidenciaPath = String(evidenciaResult?.path || "").trim();

                if (evidenciaPath) {
                    const payloadDetalleEvidencia = {
                        ...payloadDetalle,
                        idRend: String(responseCabecera),
                        idrend: String(responseCabecera),
                        path: evidenciaPath,
                        ruta: evidenciaPath,
                        rutaArchivo: evidenciaPath,
                        pathArchivo: evidenciaPath,
                        evidenciaPath,
                        nombreArchivo: String(evidenciaResult?.fileName || formData.evidencia?.name || ""),
                        nomArchivo: String(evidenciaResult?.fileName || formData.evidencia?.name || ""),
                        ig: Number.isFinite(igvNumber) ? igvNumber : 0,
                        FecEdit: nowIso,
                        DecEdit: nowIso,
                        useEdit: String(userId),
                        UseEdit: String(userId),
                    };

                    try {
                        await saveDetalleGasto(payloadDetalleEvidencia);
                    } catch (persistRutaError) {
                        /* console.warn("⚠️ No se pudo persistir ruta de evidencia en updaterendiciongasto:", persistRutaError?.message); */
                    }
                }
            }

            /* console.log("✅ Guardado ID:", responseCabecera); */

            showToast("Guardado correctamente", "success");

            if (evidenciaPreviewUrl) {
                URL.revokeObjectURL(evidenciaPreviewUrl);
            }

            setFormData(INITIAL_FORM_DATA);
            setEvidenciaPreviewUrl("");
            setIsPreviewOpen(false);
            setIsCropMode(false);
            setCrop(undefined);
            setCompletedCrop(null);
            setSelectedPreset("doc");
            setCropShape("rect");
            setIsQrOpen(false);
            imageCropRef.current = null;

        } catch (error) {
            console.error("❌ Error:", error);
            showToast("Error al guardar", "error");
        }
    };

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const rawUser = localStorage.getItem("user");
                const user = rawUser ? JSON.parse(rawUser) : null;
                const dniSesion = getUserDni(user);
                const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
                const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;
                const rucClienteSesion = String(empresa?.ruc || "").trim();

                if (dniSesion || rucClienteSesion) {
                    setFormData((prev) => ({
                        ...prev,
                        dni: prev.dni || dniSesion,
                        rucCliente: prev.rucCliente || rucClienteSesion,
                    }));
                }

                const politicasData = await getDropdownOptionsPolitica();

                setPoliticas(politicasData);

                await loadCategorias("todos");
                await loadCentrosCosto();
                await loadTiposGasto();
                await loadTiposComprobante();
            } catch (error) {
                console.error("Error cargando dropdowns:", error);
            }
        };

        cargarDatos();
    }, [loadCategorias, loadCentrosCosto, loadTiposComprobante]);

    useEffect(() => {
        return () => {
            if (evidenciaPreviewUrl) {
                URL.revokeObjectURL(evidenciaPreviewUrl);
            }
        };
    }, [evidenciaPreviewUrl]);

    const fieldClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
    const labelClass = "text-sm font-semibold text-slate-700";
    const hasEvidencia = Boolean(formData.evidencia);
    const canCropImage = hasEvidencia && String(formData.evidencia?.type || "").startsWith("image/");

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-6xl space-y-2 rounded-3xl  from-slate-50 via-white to-cyan-50 p-4 shadow-lg sm:p-6 lg:p-2">
            {/*   <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm sm:p-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Formulario de Gasto General</h2>
                <p className="mt-1 text-sm text-slate-600">Completa los datos de rendición y guarda el comprobante.</p>
            </div> */}

            {/* Evidencia y QR */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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

                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <label className={labelClass}>Lector de código QR</label>
                    <p className="mt-1 text-sm text-slate-500">Escanea para autocompletar datos del comprobante.</p>
                    <button
                        type="button"
                        className="mt-2 inline-flex items-center rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        onClick={() => setIsQrOpen(true)}
                    >
                        Escanear QR
                    </button>
                </div>
            </div>

            {/* Datos generales */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-2">
                <h3 className="mb-2 text-base font-bold text-slate-800">Datos generales</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
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

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Categoría</label>
                        <select
                            name="categoria"
                            className={fieldClass}
                            value={formData.categoria}
                            onChange={handleChange}
                        >
                            <option value="">Seleccionar categoría</option>
                            {categorias.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Centro de costo</label>
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

                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Tipo de gasto</label>
                        <input
                            name="tipoGasto"
                            className={`${fieldClass} bg-slate-100 text-slate-500`}
                            value={formData.tipoGasto || ""}
                            placeholder="Automático según centro de costo"
                            disabled
                            readOnly
                        />
                    </div>
                </div>
            </section>

            {/* Datos del comprobante */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-3">
                <h3 className="mb-2 text-base font-bold text-slate-800">Datos del comprobante</h3>
                {isPlanillaMovilidad ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>RUC Cliente</label>
                            <input
                                type="text"
                                name="rucCliente"
                                placeholder="Ej. 20123456789"
                                className={fieldClass}
                                value={formData.rucCliente}
                                readOnly
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Fecha de emisión</label>
                            <input
                                type="date"
                                name="fecha"
                                className={fieldClass}
                                value={formData.fecha}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Total</label>
                            <input
                                type="text"
                                name="total"
                                placeholder="000000.00"
                                className={fieldClass}
                                value={formData.total}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Moneda</label>
                            <select
                                name="moneda"
                                className={fieldClass}
                                value={formData.moneda}
                                onChange={handleChange}
                            >
                                <option value="">Seleccionar</option>
                                <option value="01">PEN</option>
                                <option value="03">USD</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <div className="grid grid-cols-1 gap-2 lg:col-span-3 lg:grid-cols-3">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>RUC Emisor:</label>
                                <input
                                    type="number"
                                    name="rucEmisor"
                                    placeholder="Ej. 20123456789"
                                    className={fieldClass}
                                    value={formData.rucEmisor}
                                    onChange={handleChange}
                                    onBlur={handleRucEmisorBlur}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Razón Social:</label>
                                <input
                                    type="text"
                                    name="razonSocial"
                                    placeholder="Ej. Empresa S.A."
                                    className={fieldClass}
                                    value={formData.razonSocial}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>RUC Cliente:</label>
                                <input
                                    type="text"
                                    name="rucCliente"
                                    placeholder="Ej. 20123456789"
                                    className={fieldClass}
                                    value={formData.rucCliente}
                                    readOnly
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Tipo de comprobante:</label>
                            <select
                                name="tipoComprobante"
                                className={fieldClass}
                                value={formData.tipoComprobante}
                                onChange={handleChange}
                            >
                                <option value="">Seleccionar</option>
                                {tiposComprobante.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Fecha</label>
                            <input
                                type="date"
                                name="fecha"
                                className={fieldClass}
                                value={formData.fecha}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Serie:</label>
                            <input
                                type="text"
                                name="serie"
                                placeholder="F001"
                                className={fieldClass}
                                value={formData.serie}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2 lg:col-span-3 lg:grid-cols-4">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Número:</label>
                                <input
                                    type="number"
                                    name="numero"
                                    placeholder="0001"
                                    className={fieldClass}
                                    value={formData.numero}
                                    onChange={handleChange}
                                    min="0"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>IGV</label>
                                <input
                                    type="number"
                                    name="igv"
                                    placeholder="0.00"
                                    className={fieldClass}
                                    value={formData.igv}
                                    onChange={handleChange}
                                   
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Total:</label>
                                <input
                                    type="text"
                                    name="total"
                                    placeholder="00.00"
                                    className={fieldClass}
                                    value={formData.total}
                                    onChange={handleChange}
                                    min="0"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Moneda:</label>
                                <select
                                    name="moneda"
                                    className={fieldClass}
                                    value={formData.moneda}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccionar</option>
                                    <option value="01">PEN</option>
                                    <option value="03">USD</option>
                                </select>
                            </div>
                        </div>

                    </div>
                )}
            </section>

            {/* Glosa */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <label className={`${labelClass} mb-1 block`}>Glosa o Nota</label>
                <textarea
                    name="glosa"
                    type="text"
                    placeholder="Agrega una descripcion breve del gasto o nota"
                    className={`${fieldClass} min-h-28 resize-y`}
                    onChange={handleChange}
                />
            </section>

            {/* Botones */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              
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

            <Toast
                message={toastConfig.message}
                type={toastConfig.type}
                isVisible={toastConfig.isVisible}
                onClose={closeToast}
                duration={3000}
            />
        </form>
    );
}