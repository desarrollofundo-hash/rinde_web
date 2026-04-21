// Estado para modal de detalle de gasto

import { useEffect, useState, useCallback, useMemo } from "react";
import { getListaAuditoria, getListaAuditoriaDetalle } from "../../services";
import { GetCompany } from "../../services/company";
import { saveRendicionRevision, saveRendicionRevisionDetalle } from "../../services";
import {
    getWorkflowStatusBadgeClass,
    getWorkflowStatusLabel,
    resolveWorkflowStatus,
} from "../shared/workflowStatus";
import Toast from "../shared/Toast";
import { downloadExcelXml } from "../../lib/exportExcel";
import { IconEye } from "../../Icons/preview";
import EvidenciaImagen from "../Gasto/EvidenciaImagen";
import ImageZoomLightbox from "../Gasto/ImageZoomLightbox";
import AuditoriaHeader from "./AuditoriaHeader";
import AuditoriaList from "./AuditoriaList";

export default function Auditoria() {
    const DEFAULT_ITEMS_PER_PAGE = 8;
    const PAGE_SIZE_STORAGE_KEY = "auditoria.pageSize";
    const PAGE_SIZE_OPTIONS = [5, 8, 10, 20, 50];

    const [auditorias, setAuditorias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAuditoria, setSelectedAuditoria] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [loadingDetalles, setLoadingDetalles] = useState(false);
    const [sendingRevision, setSendingRevision] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(() => {
        const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_ITEMS_PER_PAGE;
    });
    const [toastConfig, setToastConfig] = useState({ isVisible: false, message: "", type: "success" });
    const [isExportMode, setIsExportMode] = useState(false);
    const [selectedAuditoriaIds, setSelectedAuditoriaIds] = useState([]);
    const [detalleModal, setDetalleModal] = useState({ open: false, detalle: null });
    const [zoomSrc, setZoomSrc] = useState(null);

    useEffect(() => {
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    }, [pageSize]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil((auditorias?.length || 0) / pageSize)),
        [auditorias, pageSize]
    );

    const effectiveCurrentPage = Math.min(currentPage, totalPages);

    const paginatedAuditorias = useMemo(() => {
        const start = (effectiveCurrentPage - 1) * pageSize;
        return (auditorias || []).slice(start, start + pageSize);
    }, [auditorias, effectiveCurrentPage, pageSize]);

    const currentFrom = auditorias.length === 0 ? 0 : (effectiveCurrentPage - 1) * pageSize + 1;
    const showToast = (message, type = "success") => {
        setToastConfig({ isVisible: true, message, type });
    };

    const closeToast = () => {
        setToastConfig((prev) => ({ ...prev, isVisible: false }));
    };

    const resolveUserId = (userData) =>
        Number(userData?.id ?? userData?.usecod ?? userData?.idUser ?? 0);

    const resolveUserCode = (userData) =>
        String(userData?.usecod ?? userData?.id ?? userData?.idUser ?? "");

    const resolveCompanyRuc = (companyData) =>
        String(companyData?.ruc ?? companyData?.RUC ?? companyData?.numRuc ?? "");

    const resolveArea = (userData, companyData) =>
        String(
            companyData?.currentUserArea ??
            userData?.currentUserArea ??
            userData?.area ??
            userData?.gerencia ??
            userData?.departamento ??
            userData?.useare ??
            companyData?.area ??
            companyData?.gerencia ??
            companyData?.useare ??
            companyData?.idArea ??
            companyData?.idarea ??
            "0"
        );

    const resolveAreaFromCompanyList = async (userCode, companyRuc) => {
        try {
            const companies = await GetCompany(Number(userCode));
            const match = (Array.isArray(companies) ? companies : []).find(
                (c) => String(c?.ruc ?? "") === String(companyRuc)
            );

            if (!match) return "0";

            const resolved = String(
                match?.currentUserArea ??
                match?.area ??
                match?.gerencia ??
                match?.useare ??
                match?.idArea ??
                match?.idarea ??
                "0"
            );

            return resolved;
        } catch {
            /*   console.warn("⚠️ No se pudo resolver area desde lista de empresas:", e?.message); */
            return "0";
        }
    };

    const firstDefined = (...values) => {
        for (const value of values) {
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
        return "";
    };

    const getDetalleRendId = (detalle) =>
        String(
            firstDefined(
                detalle?.idRend,
                detalle?.idrend,
                detalle?.idRendicion,
                detalle?.idrendicion,
                detalle?.id,
            )
        );

    const getDetalleDescripcion = (detalle) =>
        String(
            firstDefined(
                detalle?.descripcion,
                detalle?.desc,
                detalle?.glosa,
                detalle?.obs,
            ) || "-"
        );

    const getDetalleEmpresa = (detalle) =>
        String(
            firstDefined(
                detalle?.empresa,
                detalle?.proveedor,
                detalle?.razonSocial,
                detalle?.razonsocial,
                detalle?.nomEmpresa,
                detalle?.nomempresa,
            ) || "-"
        );

    const getDetalleComprobante = (detalle) =>
        String(
            firstDefined(
                detalle?.tipoCombrobante,
                detalle?.tipocombrobante,
                detalle?.tipoComprobante,
                detalle?.tipocomprobante,
                detalle?.nomTipoComprobante,
                detalle?.nomtipocomprobante,
                detalle?.nomComprobante,
                detalle?.nomcomprobante,
                detalle?.comprobante,
                detalle?.tipComp,
                detalle?.tipcomp,
                detalle?.tipo,
            ) || "-"
        );

    const getDetalleFecha = (detalle) => {
        const value = firstDefined(detalle?.fecha, detalle?.fecCre, detalle?.feccre);
        if (!value) return "-";
        return String(value).split("T")[0];
    };

    const getDetalleMonto = (detalle) => {
        const raw = firstDefined(
            detalle?.total,
            detalle?.monto,
            detalle?.importe,
            detalle?.amount,
            detalle?.valor,
        );
        const number = Number(raw);
        return Number.isFinite(number) ? number : 0;
    };

    const getAuditoriaId = (auditoria) =>
        String(
            firstDefined(
                auditoria?.idAd,
                auditoria?.idad,
                auditoria?.id,
                auditoria?.idAuditoria,
                auditoria?.idauditoria,
            )
        );

    const normalizeText = (value) =>
        String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();

    const isPlanillaMovilidadDetalle = (detalle) => {
        const categoriaRaw = normalizeText(firstDefined(detalle?.categoria, detalle?.cat));
        const tipoRaw = normalizeText(firstDefined(
            detalle?.tipogasto,
            detalle?.tipoGasto,
            detalle?.tipo_gasto,
            detalle?.tipoMovilidad,
            detalle?.tipomovilidad,
            detalle?.tipo_movilidad,
            detalle?.movilidad,
            detalle?.transporte,
        ));
        const politicaRaw = normalizeText(firstDefined(detalle?.politica, detalle?.pol));

        const hasMovilidadFields = [
            detalle?.lugarOrigen,
            detalle?.lugarorigen,
            detalle?.origen,
            detalle?.lugarDestino,
            detalle?.lugardestino,
            detalle?.destino,
            detalle?.tipoMovilidad,
            detalle?.tipomovilidad,
            detalle?.tipo_movilidad,
            detalle?.movilidad,
            detalle?.transporte,
        ].some((value) => String(value ?? "").trim() !== "");

        const keywords = ["MOVILIDAD", "PLANILLA DE MOVILIDAD", "GASTOS DE MOVILIDAD"];
        return hasMovilidadFields || [categoriaRaw, tipoRaw, politicaRaw].some((value) =>
            keywords.some((keyword) => value.includes(keyword))
        );
    };

    const fetchAuditorias = useCallback(async () => {
        setLoading(true);

        try {
            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");

            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;

            /*          console.log("👤 USER:", userData);
                     console.log("🏢 COMPANY:", companyData); */

            if (!userData) {
                throw new Error("No hay usuario logueado");
            }

            if (!companyData) {
                throw new Error("No hay empresa seleccionada");
            }

            const userId = resolveUserId(userData);
            const userCode = resolveUserCode(userData);
            const altUserId = Number(userData?.usecod ?? userData?.id ?? 0);
            const companyRuc = resolveCompanyRuc(companyData);
            let area = resolveArea(userData, companyData);

            if (!area || area === "0") {
                area = await resolveAreaFromCompanyList(userCode, companyRuc);

                if (area && area !== "0") {
                    const companyToPersist = {
                        ...(companyData || {}),
                        currentUserArea: area,
                        area,
                    };
                    localStorage.setItem("company", JSON.stringify(companyToPersist));
                }
            }

            /*    console.log("🧪 Params Auditoría =>", {
                   id: "1",
                   idad: userCode,
                   area,
                   ruc: companyRuc,
               }); */

            if (!userId) {
                throw new Error("No se pudo resolver el id del usuario logueado");
            }

            let data = await getListaAuditoria({
                id: "1",
                idad: userCode,
                area: area,
                ruc: companyRuc,
            });

            if (Array.isArray(data) && data.length === 0 && altUserId && altUserId !== userId) {
                data = await getListaAuditoria({
                    id: "1",
                    idad: String(altUserId),
                    area,
                    ruc: companyRuc,
                });
            }

            /* console.log("📥 AUDITORÍAS:", data); */
            const dataApi = Array.isArray(data) ? data : [];

            setAuditorias(dataApi);
        } catch (error) {
            console.error("❌ Error:", error.message);
            setAuditorias([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleVerDetalles = async (auditoria) => {
        setSelectedAuditoria(auditoria);
        setLoadingDetalles(true);

        try {
            const idAd = auditoria?.idAd ?? auditoria?.id;
            /* console.log("📍 Obteniendo detalles de auditoría ID:", idAd); */

            const detallesData = await getListaAuditoriaDetalle({
                idAd: String(idAd),
            });

            const detallesApi = Array.isArray(detallesData) ? detallesData : [];

            if (detallesApi.length > 0) {
                /*  console.log("🔍 CAMPOS DEL DETALLE AUDITORIA:", Object.keys(detallesApi[0]));
                 console.log("🔍 PRIMER DETALLE:", detallesApi[0]); */
            }

            const enrichedDetalles = detallesApi.map((detalle) => {
                const idRend = getDetalleRendId(detalle);
                return {
                    ...detalle,
                    idRend: firstDefined(detalle?.idRend, detalle?.idrend, idRend),
                    empresa: firstDefined(detalle?.empresa, detalle?.proveedor, detalle?.razonSocial, detalle?.razonsocial),
                    proveedor: firstDefined(detalle?.proveedor, detalle?.empresa),
                    descripcion: firstDefined(detalle?.descripcion, detalle?.desc, detalle?.glosa, detalle?.obs),
                    total: firstDefined(detalle?.total, detalle?.monto, detalle?.importe),
                    monto: firstDefined(detalle?.monto, detalle?.total, detalle?.importe),
                    tipoComprobante: firstDefined(
                        detalle?.tipoCombrobante,
                        detalle?.tipocombrobante,
                        detalle?.tipoComprobante,
                        detalle?.tipocomprobante,
                        detalle?.nomTipoComprobante,
                        detalle?.nomComprobante,
                        detalle?.comprobante,
                        detalle?.tipComp,
                    ),
                    centroCosto: firstDefined(
                        detalle?.consumidor,
                        detalle?.centroCosto,
                        detalle?.centrocosto,
                        detalle?.centro_costo,
                        detalle?.nomCentroCosto,
                        detalle?.idCuenta,
                        detalle?.idcuenta,
                    ),
                    politica: firstDefined(detalle?.politica, detalle?.pol, detalle?.nomPolitica),
                    categoria: firstDefined(detalle?.categoria, detalle?.cat, detalle?.nomCategoria, detalle?.nomcategoria),
                    tipoGasto: firstDefined(
                        detalle?.tipoGasto,
                        detalle?.tipogasto,
                        detalle?.tipo_gasto,
                        detalle?.nomTipoGasto,
                        detalle?.nomtipogasto,
                    ),
                    fecha: firstDefined(detalle?.fecha, detalle?.fecCre, detalle?.feccre),
                };
            });

            /* console.log("✅ Detalles obtenidos:", enrichedDetalles); */
            setDetalles(enrichedDetalles);
        } catch (error) {
            console.error("❌ Error al obtener detalles:", error.message);
            setDetalles([]);
        } finally {
            setLoadingDetalles(false);
        }
    };

    const handleCerrarDetalles = () => {
        setSelectedAuditoria(null);
        setDetalles([]);
    };

    const normalizeEstadoActual = (auditoria) =>
        String(auditoria?.estadoActual ?? auditoria?.estadoactual ?? auditoria?.estado ?? "")
            .trim()
            .toUpperCase()
            .replaceAll("_", " ");

    const isAuditoriaEnRevision = (auditoria) => {
        const estado = normalizeEstadoActual(auditoria);
        return estado === "EN REVISION";
    };

    const isAuditoriaEstadoFinal = (auditoria) => {
        const estado = normalizeEstadoActual(auditoria);
        return estado === "APROBADO" || estado === "RECHAZADO";
    };

    const isEnvioRevisionBloqueado = (auditoria) =>
        isAuditoriaEnRevision(auditoria) || isAuditoriaEstadoFinal(auditoria);

    const getEnviarRevisionLabel = (auditoria) => {
        if (isAuditoriaEnRevision(auditoria)) return "Ya enviado";
        if (isAuditoriaEstadoFinal(auditoria)) return "No disponible";
        return "Enviar a revisión";
    };

    const handleEnviarRevision = async () => {
        if (!selectedAuditoria) return;
        if (isEnvioRevisionBloqueado(selectedAuditoria)) return;

        try {
            setSendingRevision(true);

            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");
            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;

            if (!userData || !companyData) {
                throw new Error("No hay sesión de usuario o empresa activa");
            }

            const idUser = Number(resolveUserCode(userData) || resolveUserId(userData) || 0);
            const ruc = resolveCompanyRuc(companyData);
            const nowIso = new Date().toISOString();
            const idAd = Number(
                firstDefined(
                    selectedAuditoria?.idAd,
                    selectedAuditoria?.idad,
                    selectedAuditoria?.id,
                    0,
                )
            );

            if (!idAd) {
                throw new Error("No se pudo resolver idAd de la auditoría seleccionada");
            }

            const idInf = Number(
                firstDefined(
                    selectedAuditoria?.idInf,
                    selectedAuditoria?.idinf,
                    selectedAuditoria?.idInforme,
                    0,
                )
            );

            const payloadRevision = {
                idRev: 0,
                idAd,
                idInf,
                idUser: (selectedAuditoria?.idUser),
                dni: String(selectedAuditoria?.dni ?? userData?.dni ?? userData?.usedoc ?? ""),
                ruc,
                obs: String(selectedAuditoria?.obs ?? "Enviado desde auditoría"),
                estadoActual: "EN REVISION",
                estado: "S",
                fecCre: nowIso,
                useReg: idUser,
                hostname: "WEB",
                fecEdit: nowIso,
                useEdit: 0,
                useElim: 0,
            };

            const idRev = await saveRendicionRevision(payloadRevision);

            if (!idRev) {
                throw new Error("No se recibió idRev al crear revisión");
            }

            const detallesParaEnviar = (Array.isArray(detalles) ? detalles : []).filter((d) => {
                const estado = String(d?.estadoActual ?? d?.estadoactual ?? "").trim().toUpperCase();
                if (estado === "RECHAZADO") return false;
                return Number(d?.idrend ?? d?.idRend ?? 0) > 0;
            });

            for (const det of detallesParaEnviar) {
                const payloadDetalleRevision = {
                    idRev: Number(idRev),
                    idAd: Number(det?.idad ?? det?.idAd ?? idAd),
                    idAdDet: Number(det?.id ?? 0),
                    idInf: Number(det?.idinf ?? det?.idInf ?? idInf),
                    idRend: Number(det?.idrend ?? det?.idRend ?? 0),
                    idUser: Number(det?.iduser ?? det?.idUser ?? idUser),
                    dni: String(selectedAuditoria?.dni ?? userData?.dni ?? userData?.usedoc ?? ""),
                    ruc: String(ruc),
                    obs: "",
                    estadoActual: "EN REVISION",
                    estado: "S",
                    fecCre: nowIso,
                    useReg: idUser,
                    hostname: "WEB",
                    fecEdit: nowIso,
                    useEdit: idUser,
                    useElim: 0,
                };

                console.log(`📤 Enviando detalle (idAdDet: ${payloadDetalleRevision.idAdDet}):`, payloadDetalleRevision);
                await saveRendicionRevisionDetalle(payloadDetalleRevision);
            }

            setAuditorias((prev) => prev.map((a) => {
                const currentId = getAuditoriaId(a);
                const selectedId = String(idAd);
                return currentId === selectedId
                    ? { ...a, estadoActual: "EN REVISION", estado: "S" }
                    : a;
            }));

            showToast(`Enviado a revisión correctamente. ID: ${idRev}`, "success");
            handleCerrarDetalles();
            window.dispatchEvent(new CustomEvent("revision:updated"));
        } catch (error) {
            console.error("❌ Error enviando a revisión:", error);
            showToast(`Error al enviar a revisión: ${error?.message || "Inténtalo nuevamente"}`, "error");
        } finally {
            setSendingRevision(false);
        }
    };

    const formatDate = (value) => {
        if (!value) return "-";
        const iso = String(value).split("T")[0];
        return iso;
    };

    const parseAmount = (value) => {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value !== "string") {
            return 0;
        }

        const raw = value.trim().replace(/[^\d,.-]/g, "");
        if (!raw) return 0;

        let normalized = raw;
        const hasComma = raw.includes(",");
        const hasDot = raw.includes(".");

        if (hasComma && hasDot) {
            if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
                normalized = raw.replace(/\./g, "").replace(",", ".");
            } else {
                normalized = raw.replace(/,/g, "");
            }
        } else if (hasComma) {
            normalized = /,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replace(/,/g, "");
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getAuditoriaTotal = (auditoria) => parseAmount(firstDefined(
        auditoria?.totalAuditoria,
        auditoria?.totalauditoria,
        auditoria?.total,
        auditoria?.monto,
        auditoria?.importe,
        auditoria?.montoTotal,
        auditoria?.montototal,
        0,
    ));

    const getAuditoriaCantidadGastos = (auditoria) => Number(firstDefined(
        auditoria?.cantidadGastos,
        auditoria?.cantGastos,
        auditoria?.cantidad,
        auditoria?.cant,
        auditoria?.nroGastos,
        0,
    )) || 0;

    const formatCurrency = (value) => new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(parseAmount(value));

    const getEstadoLabel = (auditoria) => getWorkflowStatusLabel(resolveWorkflowStatus(auditoria, "PENDIENTE"));

    const getEstadoBadgeClass = (auditoria) =>
        getWorkflowStatusBadgeClass(resolveWorkflowStatus(auditoria, "PENDIENTE"));

    const toggleAuditoriaSelection = (auditoria) => {
        const id = getAuditoriaId(auditoria);
        if (!id) return;

        setSelectedAuditoriaIds((prev) => (
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        ));
    };

    const toggleSelectAllAuditorias = () => {
        const allIds = (Array.isArray(auditorias) ? auditorias : [])
            .map((a) => getAuditoriaId(a))
            .filter(Boolean);

        const areAllSelected = allIds.length > 0 && allIds.every((id) => selectedAuditoriaIds.includes(id));

        if (areAllSelected) {
            setSelectedAuditoriaIds([]);
            return;
        }

        setSelectedAuditoriaIds(allIds);
    };

    const cancelExportMode = () => {
        setIsExportMode(false);
        setSelectedAuditoriaIds([]);
    };

    const exportSelectedAuditoriasExcel = async () => {
        const selectedAuditorias = (Array.isArray(auditorias) ? auditorias : []).filter((a) =>
            selectedAuditoriaIds.includes(getAuditoriaId(a))
        );

        if (selectedAuditorias.length === 0) {
            showToast("Selecciona al menos una auditoría para exportar", "warning");
            return;
        }

        try {
            const resumenRows = [];
            const detalleRows = [];

            for (const auditoria of selectedAuditorias) {
                const idAd = getAuditoriaId(auditoria);
                if (!idAd) continue;

                const detallesData = await getListaAuditoriaDetalle({ idAd: String(idAd) });
                const detallesAudit = Array.isArray(detallesData) ? detallesData : [];

                resumenRows.push({
                    "IdAd": Number(firstDefined(auditoria?.idAd, auditoria?.idad, auditoria?.id, 0)),
                    "IdInf": Number(firstDefined(auditoria?.idInf, auditoria?.idinf, auditoria?.idInforme, 0)),
                    "IdUser": Number(firstDefined(auditoria?.idUser, auditoria?.iduser, 0)),
                    "Dni": String(firstDefined(auditoria?.dni, "")),
                    "Ruc": String(firstDefined(auditoria?.ruc, auditoria?.RUC, "")),
                    "Area": String(firstDefined(auditoria?.area, "")),
                    "EstadoActual": String(firstDefined(auditoria?.estadoActual, auditoria?.estadoactual, auditoria?.estado, "")),
                    "Fecha": String(formatDate(firstDefined(auditoria?.fecCre, auditoria?.fecha, ""))),
                    "Total": getAuditoriaTotal(auditoria),
                    "CantGastos": getAuditoriaCantidadGastos(auditoria),
                    "Obs": String(firstDefined(auditoria?.obs, "")),
                });

                detallesAudit.forEach((det) => {
                    detalleRows.push({
                        "IdAd": Number(firstDefined(det?.idAd, det?.idad, auditoria?.idAd, auditoria?.idad, 0)),
                        "IdInf": Number(firstDefined(det?.idInf, det?.idinf, auditoria?.idInf, auditoria?.idinf, 0)),
                        "IdRend": Number(firstDefined(det?.idRend, det?.idrend, det?.id, 0)),
                        "IdUser": Number(firstDefined(det?.idUser, det?.iduser, auditoria?.idUser, auditoria?.iduser, 0)),
                        "Dni": String(firstDefined(det?.dni, auditoria?.dni, "")),
                        "Politica": String(firstDefined(det?.politica, det?.pol, auditoria?.politica, "")),
                        "Categoria": String(firstDefined(det?.categoria, det?.cat, "")),
                        "TipoGasto": String(firstDefined(det?.tipogasto, det?.tipoGasto, det?.tipo_movilidad, "")),
                        "Ruc": String(firstDefined(det?.ruc, det?.RUC, auditoria?.ruc, "")),
                        "Proveedor": String(firstDefined(det?.proveedor, det?.empresa, det?.razonSocial, det?.rucEmisor, "")),
                        "TipoCombrobante": String(firstDefined(det?.tipoCombrobante, det?.tipocombrobante, det?.tipoComprobante, det?.tipocomprobante, "")),
                        "Serie": String(firstDefined(det?.serie, "")),
                        "Numero": String(firstDefined(det?.numero, "")),
                        "IGV": parseAmount(firstDefined(det?.igv, 0)),
                        "Fecha": String(formatDate(firstDefined(det?.fecha, det?.fecCre, det?.feccre, ""))),
                        "Total": parseAmount(firstDefined(det?.total, det?.monto, det?.importe, 0)),
                        "Moneda": String(firstDefined(det?.moneda, "PEN")),
                        "RucCliente": String(firstDefined(det?.rucCliente, det?.ruccliente, "")),
                        "DesEmp": String(firstDefined(det?.desEmp, det?.desemp, det?.empresa, det?.proveedor, "")),
                        "Gerencia": String(firstDefined(det?.gerencia, "")),
                        "Area": String(firstDefined(det?.area, auditoria?.area, "")),
                        "Consumidor": String(firstDefined(det?.consumidor, det?.centroCosto, det?.centrocosto, "")),
                        "Placa": String(firstDefined(det?.placa, det?.placaVehiculo, det?.placavehiculo, "")),
                        "EstadoActual": String(firstDefined(det?.estadoActual, det?.estadoactual, det?.estado, auditoria?.estadoActual, auditoria?.estadoactual, "")),
                        "Glosa": String(firstDefined(det?.glosa, det?.nota, det?.obs, auditoria?.obs, "")),
                        "MotivoViaje": String(firstDefined(det?.motivoViaje, det?.motivoviaje, "")),
                        "LugarOrigen": String(firstDefined(det?.lugarOrigen, det?.lugarorigen, det?.origen, "")),
                        "LugarDestino": String(firstDefined(det?.lugarDestino, det?.lugardestino, det?.destino, "")),
                        "TipoMovilidad": String(firstDefined(det?.tipoMovilidad, det?.tipomovilidad, det?.tipo_movilidad, det?.movilidad, "")),
                        "Obs": String(firstDefined(det?.obs, det?.observacion, det?.observaciones, "")),
                        "FecCre": String(formatDate(firstDefined(det?.fecCre, det?.feccre, det?.fecha, ""))),
                    });
                });
            }

            const now = new Date();
            const pad = (n) => String(n).padStart(2, "0");
            const fileName = `auditorias_seleccionadas_${selectedAuditorias.length}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xls`;

            downloadExcelXml({
                fileName,
                sheets: [
                    {
                        name: "Resumen",
                        rows: resumenRows.length > 0 ? resumenRows : [{ Mensaje: "No hay auditorías válidas para exportar" }],
                    },
                    {
                        name: "Detalles",
                        rows: detalleRows.length > 0 ? detalleRows : [{ Mensaje: "Estas auditorías no tienen gastos en detalle" }],
                    },
                ],
            });

            showToast("Excel de auditorías generado correctamente", "success");
            cancelExportMode();
        } catch (error) {
            showToast(`Error al exportar auditorías: ${error?.message || "Inténtalo nuevamente"}`, "error");
        }
    };

    const handleExportClick = async () => {
        if (!isExportMode) {
            setIsExportMode(true);
            setSelectedAuditoriaIds([]);
            return;
        }

        await exportSelectedAuditoriasExcel();
    };

    useEffect(() => {
        fetchAuditorias();
    }, [fetchAuditorias]);

    useEffect(() => {
        const onFocus = () => {
            fetchAuditorias();
        };

        const onAuditoriaUpdated = () => {
            fetchAuditorias();
        };

        const onRevisionUpdated = () => {
            fetchAuditorias();
        };

        window.addEventListener("focus", onFocus);
        window.addEventListener("auditoria:updated", onAuditoriaUpdated);
        window.addEventListener("revision:updated", onRevisionUpdated);
        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("auditoria:updated", onAuditoriaUpdated);
            window.removeEventListener("revision:updated", onRevisionUpdated);
        };
    }, [fetchAuditorias]);

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-50 via-cyan-50/30 to-white p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-5">
                <AuditoriaHeader
                    isExportMode={isExportMode}
                    selectedCount={selectedAuditoriaIds.length}
                    onExportClick={handleExportClick}
                    onCancelExport={cancelExportMode}
                />

                {loading && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <p className="text-slate-600">Cargando auditorías...</p>
                    </div>
                )}

                {!loading && auditorias.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <p className="text-base font-semibold text-slate-700">No hay auditorías disponibles</p>
                        <p className="mt-1 text-sm text-slate-500">Crea tu primera auditoría para empezar.</p>
                    </div>
                )}

                {!loading && auditorias.length > 0 && (
                    <AuditoriaList
                        auditorias={auditorias}
                        paginatedAuditorias={paginatedAuditorias}
                        isExportMode={isExportMode}
                        selectedAuditoriaIds={selectedAuditoriaIds}
                        getAuditoriaId={getAuditoriaId}
                        getEstadoBadgeClass={getEstadoBadgeClass}
                        getEstadoLabel={getEstadoLabel}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        getAuditoriaTotal={getAuditoriaTotal}
                        getAuditoriaCantidadGastos={getAuditoriaCantidadGastos}
                        currentFrom={currentFrom}
                        currentPage={effectiveCurrentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={(nextSize) => {
                            setPageSize(nextSize);
                            setCurrentPage(1);
                        }}
                        pageSizeOptions={PAGE_SIZE_OPTIONS}
                        onToggleSelectAllAuditorias={toggleSelectAllAuditorias}
                        onToggleAuditoriaSelection={toggleAuditoriaSelection}
                        onVerDetalles={handleVerDetalles}
                    />
                )}

                {/* MODAL DETALLE DE GASTO INDIVIDUAL */}
                {detalleModal.open && detalleModal.detalle && (
                    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
                        <button
                            type="button"
                            aria-label="Cerrar detalle"
                            className="absolute inset-0"
                            onClick={() => setDetalleModal({ open: false, detalle: null })}
                        />
                        <div className="relative z-10 flex w-full max-h-[85dvh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-linear-to-r from-cyan-50 to-slate-50 px-3 py-2 sm:rounded-t-2xl">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">Detalle : # {getDetalleRendId(detalleModal.detalle) || "-"}</h3>
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getWorkflowStatusBadgeClass(resolveWorkflowStatus(detalleModal.detalle, "PENDIENTE"), true)}`}>
                                        {getWorkflowStatusLabel(resolveWorkflowStatus(detalleModal.detalle, "PENDIENTE")) || "-"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetalleModal({ open: false, detalle: null })}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <div className="max-h-[60vh] overflow-y-auto p-5">
                                {/* Evidencia */}
                                <div className="mb-5">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Evidencia</p>
                                    <EvidenciaImagen
                                        gasto={detalleModal.detalle}
                                        alt="Evidencia del gasto"
                                        className="w-full cursor-zoom-in rounded-xl border border-slate-200 object-contain shadow-sm transition hover:opacity-90"
                                        style={{ maxHeight: "220px" }}
                                        onClick={(e) => setZoomSrc(e.currentTarget.src)}
                                        fallback={
                                            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                                                <p className="text-xs text-slate-400">Sin evidencia adjunta</p>
                                            </div>
                                        }
                                    />
                                </div>

                                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                                    <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">Datos Generales del Gasto</h2>
                                    {[
                                        { label: "Política", value: firstDefined(detalleModal.detalle?.politica, detalleModal.detalle?.pol) },
                                        {
                                            label: "Centro Costo:",
                                            value: firstDefined(
                                                detalleModal.detalle?.centroCosto,
                                                detalleModal.detalle?.centrocosto,
                                                detalleModal.detalle?.centro_costo,
                                                detalleModal.detalle?.consumidor,
                                                detalleModal.detalle?.idCuenta,
                                                detalleModal.detalle?.idcuenta,
                                            )
                                        },
                                        { label: "Categoría:", value: firstDefined(detalleModal.detalle?.categoria, detalleModal.detalle?.cat) },
                                        {
                                            label: "Tipo gasto",
                                            value: firstDefined(
                                                detalleModal.detalle?.tipogasto,
                                                detalleModal.detalle?.tipoGasto,
                                                detalleModal.detalle?.tipo_gasto,
                                                detalleModal.detalle?.tipoMovilidad,
                                                detalleModal.detalle?.movilidad,
                                            )
                                        },
                                        { label: "RUC Emisor:", value: firstDefined(detalleModal.detalle?.ruc, detalleModal.detalle?.rucEmisor, detalleModal.detalle?.rucemisor) },
                                        { label: "Razón Social:", value: firstDefined(detalleModal.detalle?.proveedor, detalleModal.detalle?.empresa, detalleModal.detalle?.razonSocial, detalleModal.detalle?.razonsocial) },
                                        { label: "RUC Cliente:", value: firstDefined(detalleModal.detalle?.rucCliente, detalleModal.detalle?.ruccliente, detalleModal.detalle?.rucCli) },
                                        { label: "Placa", value: firstDefined(detalleModal.detalle?.placa, detalleModal.detalle?.vehiculoPlaca, detalleModal.detalle?.placaVehiculo, detalleModal.detalle?.nroPlaca) },
                                        { label: "Comprobante", value: getDetalleComprobante(detalleModal.detalle) },
                                        /* { label: "Estado", value: getEstadoLabel(detalleModal.detalle) }, */
                                    ]
                                        .filter((f) => f.value)
                                        .map((f) => (
                                            <div key={f.label} className={f.colSpan ? "col-span-2" : ""}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                            </div>
                                        ))}
                                    <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">Monto del Gasto</h2>
                                    {[
                                        {
                                            label: "IGV",
                                            value: firstDefined(detalleModal.detalle?.igv, detalleModal.detalle?.tax, detalleModal.detalle?.impuesto)
                                                ? `S/ ${Number(firstDefined(detalleModal.detalle?.igv, detalleModal.detalle?.tax, detalleModal.detalle?.impuesto)).toFixed(2)}`
                                                : null,
                                        },
                                        { label: "Total", value: `S/ ${getDetalleMonto(detalleModal.detalle).toFixed(2)}`, highlight: true },
                                    ]
                                        .filter((f) => f.value)
                                        .map((f) => (
                                            <div key={`monto-${f.label}`} className={f.colSpan ? "col-span-2" : ""}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                            </div>
                                        ))}

                                    <h2 className="col-span-2 border-b border-slate-100 pb-1 text-sm font-bold text-slate-800">Datos de la Factura</h2>
                                    {(isPlanillaMovilidadDetalle(detalleModal.detalle)
                                        ? [
                                            { label: "Tipo Comprobante", value: getDetalleComprobante(detalleModal.detalle) },
                                            { label: "Fecha emisión", value: getDetalleFecha(detalleModal.detalle) },
                                            { label: "Serie", value: firstDefined(detalleModal.detalle?.serie, detalleModal.detalle?.nroserie, detalleModal.detalle?.serieComprobante) },
                                            { label: "Número", value: firstDefined(detalleModal.detalle?.numero, detalleModal.detalle?.nro, detalleModal.detalle?.num, detalleModal.detalle?.nrodoc) },
                                            { label: "Total", value: `S/ ${getDetalleMonto(detalleModal.detalle).toFixed(2)}` },
                                            { label: "LUGAR ORIGEN", value: firstDefined(detalleModal.detalle?.lugarOrigen, detalleModal.detalle?.lugarorigen, detalleModal.detalle?.origen, detalleModal.detalle?.puntoOrigen, detalleModal.detalle?.desde) || "-" },
                                            { label: "LUGAR DESTINO", value: firstDefined(detalleModal.detalle?.lugarDestino, detalleModal.detalle?.lugardestino, detalleModal.detalle?.destino, detalleModal.detalle?.puntoDestino, detalleModal.detalle?.hasta) || "-" },
                                            { label: "Motivo viaje", value: firstDefined(detalleModal.detalle?.motivoViaje, detalleModal.detalle?.motivo_viaje, detalleModal.detalle?.motivo, detalleModal.detalle?.glosa) },
                                            {
                                                label: "TIPO MOVILIDAD",
                                                value: firstDefined(
                                                    detalleModal.detalle?.tipoMovilidad,
                                                    detalleModal.detalle?.tipomovilidad,
                                                    detalleModal.detalle?.tipo_movilidad,
                                                    detalleModal.detalle?.movilidad,
                                                    detalleModal.detalle?.transporte,
                                                    detalleModal.detalle?.medioTransporte,
                                                    detalleModal.detalle?.medio_transporte,
                                                ) || "-"
                                            },
                                            { label: "Placa", value: firstDefined(detalleModal.detalle?.placa, detalleModal.detalle?.vehiculoPlaca, detalleModal.detalle?.placaVehiculo, detalleModal.detalle?.nroPlaca) },
                                            { label: "Observación", value: firstDefined(detalleModal.detalle?.obs, detalleModal.detalle?.observacion, detalleModal.detalle?.observaciones, detalleModal.detalle?.glosa, getDetalleDescripcion(detalleModal.detalle)), colSpan: true },
                                        ]
                                        : [
                                            { label: "Tipo Comprobante", value: getDetalleComprobante(detalleModal.detalle) },
                                            { label: "Fecha", value: getDetalleFecha(detalleModal.detalle) },
                                            {
                                                label: "Serie / N°",
                                                value: [
                                                    firstDefined(detalleModal.detalle?.serie, detalleModal.detalle?.nroserie, detalleModal.detalle?.serieComprobante),
                                                    firstDefined(detalleModal.detalle?.numero, detalleModal.detalle?.nro, detalleModal.detalle?.num, detalleModal.detalle?.nrodoc),
                                                ].filter(Boolean).join(" - "),
                                            },
                                        ])
                                        .filter((f) => f.value)
                                        .map((f) => (
                                            <div key={`factura-${f.label}`} className={f.colSpan ? "col-span-2" : ""}>
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                            </div>
                                        ))}

                                    {!isPlanillaMovilidadDetalle(detalleModal.detalle) && (
                                        <>
                                            <h1 className="col-span-2 text-lg font-semibold text-slate-800">Observación:</h1>
                                            {[
                                                { label: "Observación", value: firstDefined(detalleModal.detalle?.obs, detalleModal.detalle?.observacion, detalleModal.detalle?.observaciones, detalleModal.detalle?.glosa, getDetalleDescripcion(detalleModal.detalle)), colSpan: true },
                                            ]
                                                .filter((f) => f.value)
                                                .map((f) => (
                                                    <div key={`obs-${f.label}`} className={f.colSpan ? "col-span-2" : ""}>
                                                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</dt>
                                                        <dd className={`mt-0.5 text-sm font-semibold ${f.highlight ? "text-cyan-700" : "text-slate-800"}`}>{f.value}</dd>
                                                    </div>
                                                ))}
                                        </>
                                    )}
                                </dl>
                            </div>
                        </div>
                    </div>
                )}

                <ImageZoomLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />

                {/* MODAL DE DETALLES */}
                {selectedAuditoria && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-slate-200">
                            <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-6 py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">Detalles de Auditoría</h2>
                                        <p className="text-sm text-slate-600 ">Rendidor: {firstDefined(selectedAuditoria?.usuario, "-")}</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCerrarDetalles}
                                        aria-label="Cerrar detalles de auditoria"
                                        title="Cerrar"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold leading-none text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Resumen de auditoría */}
                            <div className="px-6 pt-4">
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h1 className="col-span-2 text-base font-bold text-slate-800">Resumen:</h1>
                                    {[
                                        { label: "Título", value: firstDefined(selectedAuditoria?.obs, selectedAuditoria?.titulo, selectedAuditoria?.title, "-") },
                                        { label: "Total", value: `S/ ${detalles.reduce((acc, d) => acc + getDetalleMonto(d), 0).toFixed(2)}` },
                                        { label: "Fecha", value: formatDate(selectedAuditoria?.fecCre ?? selectedAuditoria?.fecha ?? "") },
                                        { label: "ID Auditoría", value: getAuditoriaId(selectedAuditoria) || "-" },
                                        {
                                            label: "Estado",
                                            value: getEstadoLabel(selectedAuditoria),
                                            badgeClass: getEstadoBadgeClass(selectedAuditoria),
                                        },
                                        { label: "Política", value: firstDefined(selectedAuditoria?.politica, selectedAuditoria?.pol, "-") },
                                        { label: "Cant. Gastos", value: String(detalles?.length ?? 0) },
                                        { label: "Descripción", value: firstDefined(selectedAuditoria?.descripcion, selectedAuditoria?.desc, selectedAuditoria?.obs, "-") },
                                    ].map(({ label, value, badgeClass }) => (
                                        <div key={label} className="col-span-1">
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                            <dd className="mt-0.5 font-medium text-slate-700">
                                                {badgeClass ? (
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                                                        {value ?? "-"}
                                                    </span>
                                                ) : (
                                                    value ?? "-"
                                                )}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            <div className="p-4 sm:p-6">
                                {loadingDetalles ? (
                                    <div className="text-center py-8">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                                        <p className="mt-3 text-slate-600 text-sm">Cargando detalles...</p>
                                    </div>
                                ) : detalles.length > 0 ? (
                                    <section className="border-t border-slate-100">
                                        <div className="flex items-center justify-between px-0 pb-2 pt-1 sm:px-1">
                                            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                                Gastos del informe ({detalles.length})
                                            </h3>
                                        </div>

                                        <div className="px-0 pb-1 pt-1 sm:px-1">
                                            <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80 [scrollbar-width:thin]">
                                                {detalles.map((detalle, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setDetalleModal({ open: true, detalle })}
                                                        className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50 cursor-pointer"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-semibold text-slate-400">#{getDetalleRendId(detalle) || idx + 1}</span>
                                                                <span className="truncate text-xs font-semibold text-slate-700">{getDetalleEmpresa(detalle)}</span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400">{getDetalleFecha(detalle)}</p>
                                                        </div>
                                                        <span className="shrink-0 text-xs font-bold text-cyan-700">
                                                            S/ {getDetalleMonto(detalle).toFixed(2)}
                                                        </span>
                                                        <IconEye className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-slate-500 text-sm">No hay detalles disponibles</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 text-right space-x-2">
                                <button
                                    onClick={handleEnviarRevision}
                                    disabled={sendingRevision || isEnvioRevisionBloqueado(selectedAuditoria)}
                                    className="rounded-lg bg-indigo-600 hover:bg-indigo-800 disabled:bg-slate-400 text-white font-semibold py-2 px-6 transition cursor-pointer"
                                >
                                    {sendingRevision
                                        ? "Enviando..."
                                        : getEnviarRevisionLabel(selectedAuditoria)}
                                </button>
                                <button
                                    onClick={handleCerrarDetalles}
                                    className="rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 transition cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <Toast
                    message={toastConfig.message}
                    type={toastConfig.type}
                    isVisible={toastConfig.isVisible}
                    onClose={closeToast}
                    duration={3000}
                />
            </div>
        </div>
    );
}