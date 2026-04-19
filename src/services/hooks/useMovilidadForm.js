import { useCallback, useEffect, useState } from "react";
import { getDropdownOptionsPolitica } from "../politica";
import { getDropdownOptionsCategoria } from "../categoria";
import { getDropdownOptionsCentroCosto } from "../centrocosto";
import { getDropdownOptionsTipoMovilidad } from "../tipo_movilidad";
import { getApiRuc } from "../ruc/api_ruc";
import { saveRendicionGasto } from "../save/saveGasto";
import { saveDetalleGasto } from "../save_detalle/saveGastoDetalle";
import { saveEvidenciaGasto } from "../evidencia";

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

const parseQrPayload = (rawText) => {
    const payload = String(rawText || "").trim();
    if (!payload) return {};

    try {
        const json = JSON.parse(payload);
        const serie = String(json.serie || "").trim();
        const numero = String(json.numero || json.correlativo || "").trim();

        return {
            rucEmisor: String(json.ruc || json.rucEmisor || json.RUC || "").replace(/\D/g, ""),
            tipoComprobante: String(json.tipoComprobante || json.tipocomprobante || json.tipo || ""),
            serie,
            numero,
            fecha: normalizeQrDate(json.fecha || json.fechaEmision || ""),
            total: String(json.total || json.monto || ""),
            igv: String(json.igv || ""),
            numeroSerie: serie && numero ? `${serie}-${numero}` : (serie || numero),
            rucCliente: String(json.rucCliente || json.rucReceptor || "").replace(/\D/g, ""),
        };
    } catch {
        const parts = payload.split("|").map((item) => item.trim());
        if (parts.length < 4) {
            return {};
        }

        const serie = String(parts[2] || "");
        const numero = String(parts[3] || "");

        return {
            rucEmisor: String(parts[0] || "").replace(/\D/g, ""),
            tipoComprobante: String(parts[1] || ""),
            serie,
            numero,
            igv: String(parts[4] || ""),
            total: String(parts[5] || ""),
            fecha: normalizeQrDate(parts[6] || ""),
            numeroSerie: serie && numero ? `${serie}-${numero}` : (serie || numero),
            rucCliente: String(parts[8] || "").replace(/\D/g, ""),
        };
    }
};

const TIPO_COMPROBANTE_MAP = {
    "01": "FACTURA ELECTRONICA",
    "03": "BOLETA",
    "07": "NOTA DE CRÉDITO",
    "08": "NOTA DE DÉBITO",
};

const MONEDA_MAP = {
    "01": "PEN",
    "03": "USD",
};

const toFiniteNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};

const toNullableInt = (value) => {
    const parsed = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRuc = (value) => String(value ?? "").replace(/\D/g, "").trim();

const normalizeText = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const hasValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
};

const resolvePlacaFromCentros = (centros) => {
    if (!Array.isArray(centros)) return "";

    const firstWithPlaca = centros.find((item) => {
        const value = item?.raw?.placa ?? item?.placa ?? "";
        return String(value).trim() !== "";
    });

    return String(firstWithPlaca?.raw?.placa ?? firstWithPlaca?.placa ?? "").trim();
};

const resolveSerieNumero = (formData) => {
    const [serieDesdeCompuesto, numeroDesdeCompuesto] = String(formData.numeroSerie || "").split("-");
    const serieFinal = String(formData.serie || serieDesdeCompuesto || "");
    const numeroFinal = String(formData.numero || numeroDesdeCompuesto || "");

    return { serieFinal, numeroFinal };
};

const resolveTipoComprobanteDescripcion = (tipoComprobante) => {
    return TIPO_COMPROBANTE_MAP[tipoComprobante] || String(tipoComprobante || "");
};

const resolveMonedaDescripcion = (moneda) => {
    return MONEDA_MAP[moneda] || String(moneda || "");
};

const getLocalIsoDateTime = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 23);
};

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

const buildPayloadCabeceraMovilidad = ({
    formData,
    userId,
    dniToSend,
    empresa,
    politicaNombre,
    categoriaNombre,
    resolvedIdCuenta,
    resolvedConsumidor,
    resolvedTipoGasto,
    resolvedPlaca,
    nowIso,
}) => {
    const { serieFinal, numeroFinal } = resolveSerieNumero(formData);
    const tipoComprobanteDescripcion = resolveTipoComprobanteDescripcion(formData.tipoComprobante);
    const monedaDescripcion = resolveMonedaDescripcion(formData.moneda);
    const idUserValue = toNullableInt(userId);

    return {
        idUser: idUserValue,
        dni: dniToSend,
        politica: String(politicaNombre),
        categoria: String(categoriaNombre),
        tipogasto: String(resolvedTipoGasto || formData.tipoGasto || ""),
        tipoGastoCentroCosto: String(resolvedTipoGasto || formData.tipoGasto || ""),
        idCuenta: resolvedIdCuenta,
        consumidor: resolvedConsumidor,
        ruc: String(formData.rucEmisor || ""),
        rucCliente: String(formData.rucCliente || ""),
        desEmp: String(empresa?.nombre || empresa?.empresa || ""),
        desSed: "",
        gerencia: String(empresa?.gerencia || ""),
        area: String(empresa?.area || ""),
        proveedor: String(formData.razonSocial || ""),
        tipoComprobante: tipoComprobanteDescripcion,
        tipocomprobante: tipoComprobanteDescripcion,
        tipoCombrobante: tipoComprobanteDescripcion,
        serie: serieFinal,
        numero: numeroFinal,
        fecha: String(formData.fecha || "") || null,
        igv: toFiniteNumber(formData.igv),
        total: toFiniteNumber(formData.total),
        moneda: monedaDescripcion,
        estadoActual: "BORRADOR",
        glosa: String(formData.glosa || "CREAR GASTO MOVILIDAD"),
        motivoViaje: String(formData.motivoViaje || ""),
        lugarOrigen: String(formData.origen || ""),
        lugarDestino: String(formData.destino || ""),
        tipoMovilidad: String(formData.tipoMovilidad || ""),
        placa: String(resolvedPlaca || formData.placa || ""),
        placaVehiculo: String(resolvedPlaca || formData.placa || ""),
        vehiculoPlaca: String(resolvedPlaca || formData.placa || ""),
        nroPlaca: String(resolvedPlaca || formData.placa || ""),
        obs: "",
        estado: "S",
        fecCre: nowIso,
        useReg: String(userId),
        hostname: "WEB",
        FecEdit: nowIso,
        DecEdit: nowIso,
        UseEdit: 0,
        useElim: 0,
    };
};

const buildPayloadDetalleMovilidad = ({
    formData,
    empresa,
    userId,
    politicaNombre,
    categoriaNombre,
    resolvedIdCuenta,
    resolvedConsumidor,
    resolvedTipoGasto,
    resolvedPlaca,
    dniToSend,
    idRend,
    nowIso,
}) => {
    const { serieFinal, numeroFinal } = resolveSerieNumero(formData);
    const tipoComprobanteDescripcion = resolveTipoComprobanteDescripcion(formData.tipoComprobante);
    const monedaDescripcion = resolveMonedaDescripcion(formData.moneda);
    const idUserValue = toNullableInt(userId);
    const rendicionValue = toNullableInt(idRend);

    return {
        idUser: idUserValue,
        // Reenviar bloque completo para evitar nulls por update parcial.
        politica: String(politicaNombre),
        categoria: String(categoriaNombre),
        tipogasto: String(resolvedTipoGasto || formData.tipoGasto || "MOVILIDAD"),
        ruc: String(formData.rucEmisor || ""),
        rucCliente: String(formData.rucCliente || ""),
        desEmp: String(empresa?.nombre || empresa?.empresa || ""),
        desSed: "",
        gerencia: String(empresa?.gerencia || ""),
        area: String(empresa?.area || ""),
        proveedor: String(formData.razonSocial || ""),
        tipoComprobante: tipoComprobanteDescripcion,
        tipocomprobante: tipoComprobanteDescripcion,
        tipoCombrobante: tipoComprobanteDescripcion,
        serie: serieFinal,
        numero: numeroFinal,
        igv: toFiniteNumber(formData.igv),
        fecha: String(formData.fecha || "") || null,
        total: toFiniteNumber(formData.total),
        moneda: monedaDescripcion,
        estadoActual: "BORRADOR",
        glosa: String(formData.glosa || ""),
        motivoViaje: String(formData.motivoViaje || ""),
        lugarOrigen: String(formData.origen || ""),
        lugarDestino: String(formData.destino || ""),
        tipoMovilidad: String(formData.tipoMovilidad || ""),
        estado: "S",
        fecCre: nowIso,
        useReg: String(userId || 0),
        hostname: "WEB",
        rendicion: rendicionValue,
        idRend: rendicionValue,
        idrend: rendicionValue,
        FecEdit: nowIso,
        DecEdit: nowIso,
        useEdit: 0,
        UseEdit: 0,
        idcuenta: resolvedIdCuenta,
        consumidor: resolvedConsumidor,
        dni: dniToSend,
        placa: String(resolvedPlaca || formData.placa || ""),
        placaVehiculo: String(resolvedPlaca || formData.placa || ""),
        vehiculoPlaca: String(resolvedPlaca || formData.placa || ""),
        nroPlaca: String(resolvedPlaca || formData.placa || ""),
        obs: String(formData.glosa || ""),
    };
};

const INITIAL_FORM_DATA = {
    politica: "",
    categoria: "",
    centroCosto: "",
    consumidor: "",
    rucCliente: "",
    rucEmisor: "",
    razonSocial: "",
    tipoComprobante: "",
    serie: "",
    numero: "",
    fecha: "",
    total: "",
    igv: "",
    moneda: "",
    numeroSerie: "",
    tipoGasto: "",
    origen: "",
    destino: "",
    motivoViaje: "",
    tipoMovilidad: "",
    placa: "",
    glosa: "",
    evidencia: null,
};

export default function useMovilidadForm({ selectedPolitica = null } = {}) {
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [politicas, setPoliticas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [centrosCosto, setCentrosCosto] = useState([]);
    const [tiposMovilidad, setTiposMovilidad] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");

    const loadCentrosCosto = useCallback(async () => {
        const rawUser = localStorage.getItem("user");
        const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");

        if (!rawUser || !rawEmpresa) return;

        const user = JSON.parse(rawUser);
        const empresa = JSON.parse(rawEmpresa);

        const iduser = user?.usecod ?? user?.iduser ?? user?.id;
        const empresaNombre = empresa?.empresa ?? empresa?.nombre ?? empresa?.name;

        if (!iduser || !empresaNombre) return;

        const centrosData = await getDropdownOptionsCentroCosto({
            iduser: String(iduser),
            empresa: String(empresaNombre),
        });

        setCentrosCosto(centrosData);
        const placaBackend = resolvePlacaFromCentros(centrosData);
        if (placaBackend) {
            setFormData((prev) => ({
                ...prev,
                placa: placaBackend,
            }));
        }
    }, []);

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

    const handleFieldChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    }, []);

    const handlePoliticaChange = useCallback(async (e) => {
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
    }, [loadCategorias, politicas]);

    useEffect(() => {
        if (!selectedPolitica) {
            return;
        }

        const politicaId = String(selectedPolitica.id ?? "");
        const politicaNombre = String(selectedPolitica.name ?? "todos").trim() || "todos";

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
            console.error("Error cargando categorias por politica seleccionada en movilidad:", error);
            setCategorias([]);
        });
    }, [loadCategorias, politicas, selectedPolitica]);

    const handleCentroCostoChange = useCallback((e) => {
        const { value } = e.target;
        const centroSeleccionado = centrosCosto.find((cc) => String(cc.id) === String(value));
        const placaCentro = String(centroSeleccionado?.raw?.placa ?? centroSeleccionado?.placa ?? "").trim();

        setFormData((prev) => ({
            ...prev,
            centroCosto: value,
            tipoGasto: resolveTipoGastoFromCentroCosto(centroSeleccionado),
            consumidor: "",
            placa: placaCentro || prev.placa || "",
        }));
    }, [centrosCosto]);

    const handleQrDetected = useCallback(async (decodedText) => {
        const parsed = parseQrPayload(decodedText);

        setFormData((prev) => ({
            ...prev,
            rucEmisor: parsed.rucEmisor || prev.rucEmisor,
            tipoComprobante: parsed.tipoComprobante || prev.tipoComprobante,
            serie: parsed.serie || prev.serie,
            numero: parsed.numero || prev.numero,
            razonSocial: prev.razonSocial,
            fecha: parsed.fecha || prev.fecha,
            total: parsed.total || prev.total,
            igv: parsed.igv || prev.igv,
            numeroSerie: parsed.numeroSerie || prev.numeroSerie,
            rucCliente: parsed.rucCliente || prev.rucCliente,
        }));

        if (/^\d{11}$/.test(String(parsed.rucEmisor || ""))) {
            try {
                const data = await getApiRuc({ ruc: String(parsed.rucEmisor) });
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
                    }));
                }
            } catch (error) {
                console.error("No se pudo autocompletar razon social por RUC en movilidad:", error);
            }
        }

        alert("QR escaneado. Se autocompletaron los datos detectados ✅");
    }, []);

    const handleRucEmisorBlur = useCallback(async () => {
        const ruc = String(formData.rucEmisor || "").replace(/\D/g, "").trim();
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
                    rucEmisor: ruc,
                    razonSocial,
                }));
            }
        } catch (error) {
            console.error("Error validando RUC emisor en movilidad:", error);
        }
    }, [formData.rucEmisor]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        const rawUser = localStorage.getItem("user");
        if (!rawUser) {
            alert("Error de autenticación. Por favor, inicie sesión de nuevo.");
            return;
        }

        const user = JSON.parse(rawUser);
        const userId = user?.id ?? user?.usecod ?? user?.iduser;
        const userDni = getUserDni(user);
        const dniToSend = String(userDni || "").trim();
        const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
        const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;
        const rucClienteFormulario = normalizeRuc(formData.rucCliente);
        const rucEmpresaSesion = normalizeRuc(empresa?.ruc ?? empresa?.RUC ?? empresa?.numRuc);

        if (!userId) {
            alert("Error de autenticación. Por favor, inicie sesión de nuevo.");
            return;
        }

        if (!rucClienteFormulario || !rucEmpresaSesion || rucClienteFormulario !== rucEmpresaSesion) {
            alert("No se puede guardar: el RUC Cliente debe ser igual al RUC de la empresa logueada.");
            return;
        }

        const centroCostoSeleccionado = centrosCosto.find((cc) => String(cc.id) === String(formData.centroCosto));
        const politicaSeleccionada = politicas.find((p) => String(p.id) === String(formData.politica));
        const categoriaSeleccionada = categorias.find((c) => String(c.id) === String(formData.categoria));
        const isPlanillaMovilidad = normalizeText(categoriaSeleccionada?.name).includes("PLANILLA DE MOVILIDAD");

        const resolvedIdCuenta = String(
            centroCostoSeleccionado?.id ||
            centroCostoSeleccionado?.raw?.idCuenta ||
            centroCostoSeleccionado?.raw?.idcuenta ||
            formData.centroCosto ||
            ""
        );

        const resolvedConsumidor = String(
            formData.consumidor ||
            centroCostoSeleccionado?.consumidor ||
            centroCostoSeleccionado?.raw?.consumidor ||
            centroCostoSeleccionado?.name ||
            ""
        );

        const resolvedTipoGasto = String(
            formData.tipoGasto ||
            resolveTipoGastoFromCentroCosto(centroCostoSeleccionado) ||
            ""
        );

        const resolvedPlaca = String(
            formData.placa ||
            centroCostoSeleccionado?.raw?.placa ||
            centroCostoSeleccionado?.placa ||
            ""
        ).trim();

        const requiredCommonFields = [
            { label: "Política", value: formData.politica },
            { label: "Categoría", value: formData.categoria },
            { label: "Centro de Costo", value: formData.centroCosto },
            { label: "Tipo de Gasto", value: resolvedTipoGasto },
            { label: "RUC Cliente", value: formData.rucCliente },
            { label: "Fecha", value: formData.fecha },
            { label: "Total", value: formData.total },
            { label: "Moneda", value: formData.moneda },
            { label: "Glosa o Nota", value: formData.glosa },
            { label: "Evidencia", value: formData.evidencia },
        ];

        const requiredPlanillaFields = [
            { label: "Origen", value: formData.origen },
            { label: "Destino", value: formData.destino },
            { label: "Motivo de viaje", value: formData.motivoViaje },
            { label: "Tipo de movilidad", value: formData.tipoMovilidad },
            { label: "Placa", value: resolvedPlaca },
        ];

        const requiredNoPlanillaFields = [
            { label: "RUC Emisor", value: formData.rucEmisor },
            { label: "Razón Social", value: formData.razonSocial },
            { label: "Tipo Comprobante", value: formData.tipoComprobante },
            { label: "Serie", value: formData.serie },
            { label: "Número", value: formData.numero },
            { label: "IGV", value: formData.igv },
        ];

        const fieldsToValidate = isPlanillaMovilidad
            ? [...requiredCommonFields, ...requiredPlanillaFields]
            : [...requiredCommonFields, ...requiredNoPlanillaFields];

        const missingFields = fieldsToValidate
            .filter((field) => !hasValue(field.value))
            .map((field) => field.label);

        if (missingFields.length > 0) {
            const validationMessage = `Completa los campos obligatorios: ${missingFields.join(", ")}`;
            setErrorMessage(validationMessage);
            return;
        }

        if (!resolvedIdCuenta) {
            alert("Selecciona un centro de costo antes de guardar");
            return;
        }

        const nowIso = getLocalIsoDateTime();

        try {
            const payloadCabecera = buildPayloadCabeceraMovilidad({
                formData,
                userId,
                dniToSend,
                empresa,
                politicaNombre: politicaSeleccionada?.name ?? formData.politica,
                categoriaNombre: categoriaSeleccionada?.name ?? formData.categoria,
                resolvedIdCuenta,
                resolvedConsumidor,
                resolvedTipoGasto,
                resolvedPlaca,
                nowIso,
            });

            const responseCabecera = await saveRendicionGasto(payloadCabecera);

            const payloadDetalle = buildPayloadDetalleMovilidad({
                formData,
                empresa,
                userId,
                politicaNombre: politicaSeleccionada?.name ?? formData.politica,
                categoriaNombre: categoriaSeleccionada?.name ?? formData.categoria,
                resolvedIdCuenta,
                resolvedConsumidor,
                resolvedTipoGasto,
                resolvedPlaca,
                dniToSend,
                idRend: responseCabecera,
                nowIso,
            });

            await saveDetalleGasto(payloadDetalle);

            if (formData.evidencia) {
                await saveEvidenciaGasto({
                    idRend: responseCabecera,
                    file: formData.evidencia,
                    gastoData: {
                        ruc: String(formData.rucEmisor || ""),
                        serie: String(formData.serie || ""),
                        numero: String(formData.numero || ""),
                    },
                });
            }

            alert("Guardado correctamente ✅");
            setFormData({
                ...INITIAL_FORM_DATA,
                rucCliente: rucEmpresaSesion,
                placa: String(formData.placa || ""),
            });
        } catch (error) {
            console.error("Error guardando movilidad:", error);
            // Extraer mensaje del servidor si está disponible
            let errorMsg = "No se pudo guardar el gasto";

            if (error?.message) {
                const messageStr = String(error.message);
                // Si el error contiene JSON, intentar extraerlo
                try {
                    const jsonMatch = messageStr.match(/Response: ({.*})/);
                    if (jsonMatch) {
                        const responseData = JSON.parse(jsonMatch[1]);
                        if (responseData.message) {
                            errorMsg = responseData.message;
                        }
                    } else {
                        errorMsg = messageStr;
                    }
                } catch {
                    errorMsg = messageStr;
                }
            }

            setErrorMessage(errorMsg);
        }
    }, [categorias, centrosCosto, formData, politicas]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
                const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;

                setFormData((prev) => ({
                    ...prev,
                    rucCliente: prev.rucCliente || String(empresa?.ruc || "").trim(),
                }));

                const politicaInicial = String(selectedPolitica?.name ?? "todos").trim() || "todos";

                const politicasPromise = getDropdownOptionsPolitica();
                const categoriasPromise = loadCategorias(politicaInicial);
                const centrosCostoPromise = loadCentrosCosto();
                const tiposMovilidadPromise = getDropdownOptionsTipoMovilidad();

                const politicasData = await politicasPromise;
                setPoliticas(politicasData);

                const tiposMovilidadData = await tiposMovilidadPromise;
                setTiposMovilidad(Array.isArray(tiposMovilidadData) ? tiposMovilidadData : []);

                await Promise.all([categoriasPromise, centrosCostoPromise]);
            } catch (error) {
                console.error("Error cargando dropdowns de movilidad:", error);
            }
        };

        cargarDatos();
    }, [loadCategorias, loadCentrosCosto, selectedPolitica]);

    return {
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
    };
}
