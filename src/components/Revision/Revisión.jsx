import React, { useEffect, useState, useCallback } from "react";
import {
    getListaRevision,
    getListaRevisionDetalle,
    saveRendicionRevisionDetalle,
} from "../../services";
import { GetCompany } from "../../services/company";
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
import { IconDown } from "../../Icons/down";
import { IconUp } from "../../Icons/up";
import RevisionHeader from "./RevisionHeader";
import RevisionList from "./RevisionList";

export default function Revision() {
    const [revisiones, setRevisiones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRevision, setSelectedRevision] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [loadingDetalles, setLoadingDetalles] = useState(false);
    const [sendingDecision, setSendingDecision] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectObs, setRejectObs] = useState("");
    const [toastConfig, setToastConfig] = useState({ isVisible: false, message: "", type: "success" });
    const [isExportMode, setIsExportMode] = useState(false);
    const [selectedRevisionIds, setSelectedRevisionIds] = useState([]);
    const [detalleRevision, setDetalleRevision] = useState(null);
    const [zoomSrc, setZoomSrc] = useState(null);

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

    const isContabilidadGerencia = (value) => {
        const normalized = String(value ?? "").trim().toUpperCase();
        return normalized.includes("CONTABILIDAD");
    };

    const firstValidGerencia = (...values) => {
        for (const value of values) {
            const normalized = String(value ?? "").trim();
            if (!normalized) continue;
            if (normalized === "0") continue;
            if (isContabilidadGerencia(normalized)) continue;
            return normalized;
        }
        return "0";
    };

    const resolveGerencia = (userData, companyData) =>
        firstValidGerencia(
            companyData?.currentUserGerencia,
            userData?.currentUserGerencia,
            companyData?.currentUserArea,
            userData?.currentUserArea,
            companyData?.area,
            companyData?.gerencia,
            userData?.area,
            userData?.gerencia,
            userData?.departamento,
            userData?.useare,
        );

    const resolveGerenciaFromCompanyList = async (userCode, companyRuc) => {
        try {
            const companies = await GetCompany(Number(userCode));
            const match = (Array.isArray(companies) ? companies : []).find(
                (c) => String(c?.ruc ?? "") === String(companyRuc)
            );
            if (!match) return "0";

            return firstValidGerencia(
                match?.currentUserGerencia,
                match?.currentUserArea,
                match?.area,
                match?.gerencia,
                match?.useare,
                match?.idArea,
                match?.idarea,
            );
        } catch (e) {
            
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

    const getRendidorName = (detalle) =>
        String(
            firstDefined(
                detalle?.rendidor,
                detalle?.nomRendidor,
                detalle?.nomrendidor,
                detalle?.nombreRendidor,
                detalle?.nomRend,
                detalle?.nomrend,
                detalle?.nombreRend,
            ) || "-"
        );

    const getAuditorName = (revision) =>
        String(
            firstDefined(
                revision?.auditor,
                revision?.nomAuditor,
                revision?.nomauditor,
                revision?.nombreAuditor,
            ) || "-"
        );


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

    const getDetalleCategoria = (detalle) =>
        String(
            firstDefined(
                detalle?.categoria,
                detalle?.cat,
            ) || "-"
        );

    const getDetalleProveedor = (detalle) =>
        String(
            firstDefined(
                detalle?.empresa,
                detalle?.proveedor,
                detalle?.razonSocial,
                detalle?.razonsocial,
                detalle?.nomEmpresa,
                detalle?.nomempresa,
                detalle?.rucEmisor,
                detalle?.rucemisor,
                detalle?.ruc,
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
            detalle?.value,
        );
        const number = Number(raw);
        return Number.isFinite(number) ? number : 0;
    };

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

    const getRevisionId = (revision) =>
        Number(firstDefined(revision?.idRev, revision?.idrev, revision?.id, 0));

    const fetchRevisiones = useCallback(async () => {
        setLoading(true);

        try {
            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");

            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;



            if (!userData) {
                throw new Error("No hay usuario logueado");
            }

            if (!companyData) {
                throw new Error("No hay empresa seleccionada");
            }

            const userCode = resolveUserCode(userData);
            const companyRuc = resolveCompanyRuc(companyData);
            let gerencia = resolveGerencia(userData, companyData);

            if (!gerencia || gerencia === "0") {
                gerencia = await resolveGerenciaFromCompanyList(userCode, companyRuc);
            }

            const data = await getListaRevision({
                id: "1",
                idrev: "1",
                gerencia,
                ruc: companyRuc,
            });
            const rawDataApi = Array.isArray(data) ? data : [];

            const dataApi = rawDataApi;
            setRevisiones(dataApi);
        } catch (error) {
            /* console.error("❌ Error:", error.message); */
            setRevisiones([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVerDetalles = async (revision) => {
        setSelectedRevision(revision);
        setLoadingDetalles(true);

        try {
            const idRev = revision?.idRev ?? revision?.id;
            /* console.log("📍 Obteniendo detalles de revisión ID:", idRev); */

            const detallesData = await getListaRevisionDetalle({
                idrev: String(idRev),
            });

            const detallesApi = Array.isArray(detallesData) ? detallesData : [];
            const enrichedDetalles = detallesApi.map((detalle) => {
                const idRend = getDetalleRendId(detalle);

                return {
                    ...detalle,
                    // Fallbacks desde cabecera de revisión para campos que algunos endpoints no incluyen en detalle.
                    idInf: firstDefined(detalle?.idInf, detalle?.idinf, revision?.idInf, revision?.idinf),
                    idUser: firstDefined(detalle?.idUser, detalle?.iduser, revision?.idUser, revision?.iduser),
                    dni: firstDefined(detalle?.dni, revision?.dni),
                    ruc: firstDefined(detalle?.ruc, detalle?.RUC, revision?.ruc, revision?.RUC),
                    titulo: firstDefined(detalle?.titulo, detalle?.title, revision?.titulo, revision?.title),
                    nota: firstDefined(detalle?.nota, detalle?.Nota, revision?.nota, revision?.Nota),
                    politica: firstDefined(detalle?.politica, detalle?.pol, revision?.politica, revision?.pol),
                    obs: firstDefined(detalle?.obs, detalle?.observacion, detalle?.observaciones, revision?.obs),
                    estadoActual: firstDefined(detalle?.estadoActual, detalle?.estadoactual, revision?.estadoActual, revision?.estadoactual),
                    estado: firstDefined(detalle?.estado, revision?.estado),
                    fecCre: firstDefined(detalle?.fecCre, detalle?.feccre, revision?.fecCre, revision?.feccre),
                    useReg: firstDefined(detalle?.useReg, detalle?.usereg, revision?.useReg, revision?.usereg),
                    hostname: firstDefined(detalle?.hostname, revision?.hostname),
                    fecEdit: firstDefined(detalle?.fecEdit, detalle?.fecedit, revision?.fecEdit, revision?.fecedit),
                    useEdit: firstDefined(detalle?.useEdit, detalle?.useedit, revision?.useEdit, revision?.useedit),
                    useElim: firstDefined(detalle?.useElim, detalle?.useelim, revision?.useElim, revision?.useelim),
                    idRend: firstDefined(detalle?.idRend, detalle?.idrend, idRend),
                    empresa: firstDefined(
                        detalle?.empresa,
                        detalle?.proveedor,
                        detalle?.razonSocial,
                        detalle?.razonsocial,
                        detalle?.nomEmpresa,
                        detalle?.nomempresa,
                        detalle?.rucEmisor,
                        detalle?.rucemisor,
                        detalle?.ruc,
                    ),
                    proveedor: firstDefined(
                        detalle?.proveedor,
                        detalle?.empresa,
                        detalle?.razonSocial,
                        detalle?.razonsocial,
                        detalle?.nomEmpresa,
                        detalle?.nomempresa,
                        detalle?.rucEmisor,
                        detalle?.rucemisor,
                        detalle?.ruc,
                    ),
                    descripcion: firstDefined(detalle?.descripcion, detalle?.desc),
                    total: firstDefined(detalle?.total, detalle?.monto, detalle?.valor),
                    monto: firstDefined(detalle?.monto, detalle?.total, detalle?.valor),
                    tipoComprobante: firstDefined(detalle?.tipoComprobante, detalle?.tipocomprobante),
                    fecha: firstDefined(detalle?.fecha, detalle?.fecCre),
                };
            });

            setDetalles(enrichedDetalles);
        } catch (error) {
            /* console.error("❌ Error al obtener detalles:", error.message); */
            setDetalles([]);
        } finally {
            setLoadingDetalles(false);
        }
    };

    const handleCerrarDetalles = () => {
        setSelectedRevision(null);
        setDetalles([]);
        setShowRejectModal(false);
        setRejectObs("");
    };

    const normalizeEstadoActual = (revision) =>
        String(revision?.estadoActual ?? revision?.estadoactual ?? revision?.estado ?? "")
            .trim()
            .toUpperCase()
            .replaceAll("_", " ");

    const isRevisionDecisionBloqueada = (revision) => {
        const estado = normalizeEstadoActual(revision);
        return estado === "APROBADO" || estado === "RECHAZADO";
    };

    const applyDecision = async (decision, obsInput) => {
        if (!selectedRevision) return;
        if (isRevisionDecisionBloqueada(selectedRevision)) return;

        try {
            setSendingDecision(true);
            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");
            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;

            if (!userData || !companyData) {
                throw new Error("No hay sesión de usuario o empresa activa");
            }

            const userCode = resolveUserCode(userData);
            const ruc = resolveCompanyRuc(companyData);
            const nowIso = new Date().toISOString();
            const obsValue = String(obsInput || (decision === "APROBADO" ? "Aprobado en revisión" : "Rechazado en revisión"));

            for (const det of (Array.isArray(detalles) ? detalles : [])) {
                const detallePayload = {
                    idRev: Number(det?.idrev ?? det?.idRev ?? 0),
                    idAd: Number(selectedRevision?.idad ?? selectedRevision?.idAd ?? 0),
                    idAdDet: Number(det?.idaddet ?? det?.idAdDet ?? 0),
                    idInf: Number(det?.idinf ?? det?.idInf ?? 0),
                    idRend: Number(det?.idrend ?? det?.idRend ?? 0),
                    idUser: Number(det?.iduser ?? det?.idUser ?? resolveUserId(userData)),
                    dni: String(selectedRevision?.dni ?? userData?.dni ?? userData?.usedoc ?? ""),
                    ruc,
                    obs: obsValue,
                    estadoActual: decision,
                    estado: "S",
                    fecCre: nowIso,
                    useReg: userCode,
                    hostname: "WEB",
                    fecEdit: nowIso,
                    useEdit: userCode,
                    useElim: 0,
                };
                /* 
                                console.log(`📤 Enviando detalle (idRev: ${detallePayload.idRev}):`, detallePayload); */

                const guardado = await saveRendicionRevisionDetalle(detallePayload);
                if (!guardado) {
                    throw new Error(`Error al guardar el detalle revisión para idRev ${detallePayload.idRev}`);
                }
                /* 
                                console.log(`✅ Detalle idRev ${detallePayload.idRev} guardado correctamente`); */
            }

            const selectedRevisionId = getRevisionId(selectedRevision);

            // Refleja el cambio de estado inmediatamente en la UI sin esperar recarga manual.
            setRevisiones((prev) =>
                (Array.isArray(prev) ? prev : []).map((revision) => {
                    if (getRevisionId(revision) !== selectedRevisionId) return revision;
                    return {
                        ...revision,
                        estadoActual: decision,
                        estadoactual: decision,
                        estado: "S",
                        obs: obsValue,
                        fecEdit: nowIso,
                        useEdit: userCode,
                    };
                })
            );

            setSelectedRevision((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    estadoActual: decision,
                    estadoactual: decision,
                    estado: "S",
                    obs: obsValue,
                    fecEdit: nowIso,
                    useEdit: userCode,
                };
            });

            setDetalles((prev) =>
                (Array.isArray(prev) ? prev : []).map((detalle) => ({
                    ...detalle,
                    estadoActual: decision,
                    estadoactual: decision,
                    estado: "S",
                    obs: obsValue,
                    fecEdit: nowIso,
                    useEdit: userCode,
                }))
            );

            setDetalleRevision((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    estadoActual: decision,
                    estadoactual: decision,
                    estado: "S",
                    obs: obsValue,
                    fecEdit: nowIso,
                    useEdit: userCode,
                };
            });

            const message = decision === "APROBADO" ? "INFORME APROBADO" : "INFORME RECHAZADO";
            showToast(message, "success");
            handleCerrarDetalles();
            fetchRevisiones();
        } catch (error) {
            /* console.error("❌ Error actualizando revisión:", error); */
            showToast(`Error al actualizar revisión: ${error?.message || "Inténtalo nuevamente"}`, "error");
        } finally {
            setSendingDecision(false);
        }
    };

    const handleAprobar = async () => {
        if (isRevisionDecisionBloqueada(selectedRevision)) return;
        await applyDecision("APROBADO", "Aprobado en revisión");
    };

    const openDesaprobarModal = () => {
        if (isRevisionDecisionBloqueada(selectedRevision)) return;
        setRejectObs("");
        setShowRejectModal(true);
    };

    const handleEnviarDesaprobacion = async () => {
        const trimmed = rejectObs.trim();
        if (!trimmed) {
            showToast("Ingresa el motivo de rechazo", "warning");
            return;
        }
        await applyDecision("RECHAZADO", trimmed);
        setShowRejectModal(false);
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

    const getRevisionTotal = (revision) => parseAmount(firstDefined(
        revision?.totalRevision,
        revision?.totalrevision,
        revision?.total,
        revision?.monto,
        revision?.importe,
        revision?.montoTotal,
        revision?.montototal,
        0,
    ));

    const getRevisionCantidadGastos = (revision) => Number(firstDefined(
        revision?.cantidadGastos,
        revision?.cantGastos,
        revision?.cantidad,
        revision?.cant,
        revision?.nroGastos,
        0,
    )) || 0;

    const getEstadoLabel = (revision) => getWorkflowStatusLabel(resolveWorkflowStatus(revision, "PENDIENTE"));

    const getEstadoBadgeClass = (revision) =>
        getWorkflowStatusBadgeClass(resolveWorkflowStatus(revision, "PENDIENTE"));

    const toggleRevisionSelection = (revision) => {
        const id = String(getRevisionId(revision));
        if (!id || id === "0") return;

        setSelectedRevisionIds((prev) => (
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        ));
    };

    const toggleSelectAllRevisiones = () => {
        const allIds = (Array.isArray(revisiones) ? revisiones : [])
            .map((r) => String(getRevisionId(r)))
            .filter((id) => id && id !== "0");

        const areAllSelected = allIds.length > 0 && allIds.every((id) => selectedRevisionIds.includes(id));

        if (areAllSelected) {
            setSelectedRevisionIds([]);
            return;
        }

        setSelectedRevisionIds(allIds);
    };

    const cancelExportMode = () => {
        setIsExportMode(false);
        setSelectedRevisionIds([]);
    };

    const exportSelectedRevisionesExcel = async () => {
        const selectedRevisiones = (Array.isArray(revisiones) ? revisiones : []).filter((r) =>
            selectedRevisionIds.includes(String(getRevisionId(r)))
        );

        if (selectedRevisiones.length === 0) {
            showToast("Selecciona al menos una revisión para exportar", "warning");
            return;
        }

        try {
            const resumenRows = [];
            const detalleRows = [];

            for (const revision of selectedRevisiones) {
                const idRev = getRevisionId(revision);
                if (!idRev) continue;

                const detallesData = await getListaRevisionDetalle({ idrev: String(idRev) });
                const detallesRevision = Array.isArray(detallesData) ? detallesData : [];

                resumenRows.push({
                    "IdRev": Number(firstDefined(revision?.idRev, revision?.idrev, revision?.id, 0)),
                    "IdAd": Number(firstDefined(revision?.idAd, revision?.idad, revision?.idAuditoria, 0)),
                    "IdInf": Number(firstDefined(revision?.idInf, revision?.idinf, revision?.idInforme, 0)),
                    "IdUser": Number(firstDefined(revision?.idUser, revision?.iduser, 0)),
                    "Dni": String(firstDefined(revision?.dni, "")),
                    "Ruc": String(firstDefined(revision?.ruc, revision?.RUC, "")),
                    "Gerencia": String(firstDefined(revision?.gerencia, "")),
                    "EstadoActual": String(firstDefined(revision?.estadoActual, revision?.estadoactual, revision?.estado, "")),
                    "Fecha": String(formatDate(firstDefined(revision?.fecCre, revision?.feccre, revision?.fecha, ""))),
                    "Total": getRevisionTotal(revision),
                    "CantGastos": getRevisionCantidadGastos(revision),
                    "Obs": String(firstDefined(revision?.obs, revision?.nota, revision?.descripcion, "")),
                });

                detallesRevision.forEach((det) => {
                    detalleRows.push({
                        "IdRev": Number(firstDefined(det?.idRev, det?.idrev, revision?.idRev, revision?.idrev, revision?.id, 0)),
                        "IdAd": Number(firstDefined(det?.idAd, det?.idad, det?.idAuditoria, revision?.idAd, revision?.idad, revision?.idAuditoria, 0)),
                        "IdInf": Number(firstDefined(det?.idInf, det?.idinf, revision?.idInf, revision?.idinf, 0)),
                        "IdRend": Number(firstDefined(det?.idRend, det?.idrend, det?.idRendicion, det?.idrendicion, det?.id, 0)),
                        "IdUser": Number(firstDefined(det?.idUser, det?.iduser, revision?.idUser, revision?.iduser, 0)),
                        "Dni": String(firstDefined(det?.dni, revision?.dni, "")),
                        "Politica": String(firstDefined(det?.politica, det?.pol, revision?.politica, revision?.pol, "")),
                        "Categoria": String(firstDefined(det?.categoria, det?.cat, "")),
                        "TipoGasto": String(firstDefined(det?.tipogasto, det?.tipoGasto, det?.tipo_gasto, "")),
                        "Ruc": String(firstDefined(det?.ruc, det?.RUC, revision?.ruc, revision?.RUC, "")),
                        "Proveedor": String(firstDefined(det?.proveedor, det?.empresa, det?.razonSocial, det?.razonsocial, det?.rucEmisor, "")),
                        "TipoCombrobante": String(firstDefined(det?.tipoCombrobante, det?.tipocombrobante, det?.tipoComprobante, det?.tipocomprobante, "")),
                        "Serie": String(firstDefined(det?.serie, det?.serieComprobante, det?.nroserie, "")),
                        "Numero": String(firstDefined(det?.numero, det?.nroComprobante, det?.nro, det?.num, det?.nrodoc, "")),
                        "IGV": parseAmount(firstDefined(det?.igv, det?.tax, det?.impuesto, 0)),
                        "Fecha": String(formatDate(firstDefined(det?.fecha, det?.fecCre, det?.feccre, ""))),
                        "Total": parseAmount(firstDefined(det?.total, det?.monto, det?.importe, det?.valor, 0)),
                        "Moneda": String(firstDefined(det?.moneda, "PEN")),
                        "RucCliente": String(firstDefined(det?.rucCliente, det?.ruccliente, det?.rucCli, "")),
                        "DesEmp": String(firstDefined(det?.desEmp, det?.desemp, det?.empresa, det?.proveedor, "")),
                        "Gerencia": String(firstDefined(det?.gerencia, revision?.gerencia, "")),
                        "Area": String(firstDefined(det?.area, revision?.area, "")),
                        "Consumidor": String(firstDefined(det?.consumidor, det?.centroCosto, det?.centrocosto, det?.nomCentroCosto, "")),
                        "Placa": String(firstDefined(det?.placa, det?.placaVehiculo, det?.placavehiculo, "")),
                        "EstadoActual": String(firstDefined(det?.estadoActual, det?.estadoactual, det?.estado, revision?.estadoActual, revision?.estadoactual, "")),
                        "Glosa": String(firstDefined(det?.glosa, det?.nota, det?.obs, det?.observacion, det?.observaciones, revision?.obs, "")),
                        "MotivoViaje": String(firstDefined(det?.motivoViaje, det?.motivoviaje, det?.motivo_viaje, det?.motivo, "")),
                        "LugarOrigen": String(firstDefined(det?.lugarOrigen, det?.lugarorigen, det?.origen, det?.puntoOrigen, det?.desde, "")),
                        "LugarDestino": String(firstDefined(det?.lugarDestino, det?.lugardestino, det?.destino, det?.puntoDestino, det?.hasta, "")),
                        "TipoMovilidad": String(firstDefined(det?.tipoMovilidad, det?.tipomovilidad, det?.tipo_movilidad, det?.movilidad, det?.transporte, det?.medioTransporte, det?.medio_transporte, "")),
                        "Obs": String(firstDefined(det?.obs, det?.observacion, det?.observaciones, "")),
                        "FecCre": String(formatDate(firstDefined(det?.fecCre, det?.feccre, det?.fecha, ""))),
                    });
                });
            }

            const now = new Date();
            const pad = (n) => String(n).padStart(2, "0");
            const fileName = `revisiones_seleccionadas_${selectedRevisiones.length}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xls`;

            downloadExcelXml({
                fileName,
                sheets: [
                    {
                        name: "Resumen",
                        rows: resumenRows.length > 0 ? resumenRows : [{ Mensaje: "No hay revisiones válidas para exportar" }],
                    },
                    {
                        name: "Detalles",
                        rows: detalleRows.length > 0 ? detalleRows : [{ Mensaje: "Estas revisiones no tienen gastos en detalle" }],
                    },
                ],
            });

            showToast("Excel de revisiones generado correctamente", "success");
            cancelExportMode();
        } catch (error) {
            showToast(`Error al exportar revisiones: ${error?.message || "Inténtalo nuevamente"}`, "error");
        }
    };

    const handleExportClick = async () => {
        if (!isExportMode) {
            setIsExportMode(true);
            setSelectedRevisionIds([]);
            return;
        }

        await exportSelectedRevisionesExcel();
    };

    useEffect(() => {
        fetchRevisiones();
    }, [fetchRevisiones]);

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-50 via-cyan-50/30 to-white p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-5">
                <RevisionHeader
                    isExportMode={isExportMode}
                    selectedCount={selectedRevisionIds.length}
                    onExportClick={handleExportClick}
                    onCancelExport={cancelExportMode}
                />

                {loading && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <p className="text-slate-600">Cargando revisiones...</p>
                    </div>
                )}

                {!loading && revisiones.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <p className="text-base font-semibold text-slate-700">No hay revisiones disponibles</p>
                        <p className="mt-1 text-sm text-slate-500">Crea tu primera revisión para empezar.</p>
                    </div>
                )}

                {!loading && revisiones.length > 0 && (
                    <RevisionList
                        revisiones={revisiones}
                        onVerDetalles={handleVerDetalles}
                        isExportMode={isExportMode}
                        selectedRevisionIds={selectedRevisionIds}
                        onToggleRevisionSelection={toggleRevisionSelection}
                        onToggleSelectAll={toggleSelectAllRevisiones}
                    />
                )}

                {/* MODAL DETALLE DE GASTO INDIVIDUAL */}
                {detalleRevision && (
                    <div
                        className="fixed inset-0 z-60 flex items-end bg-black/50 sm:items-center sm:p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setDetalleRevision(null); }}
                    >
                        <div className="relative z-10 flex w-full max-h-[85dvh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:mx-auto sm:max-w-md sm:rounded-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-linear-to-r from-cyan-50 to-slate-50 px-4 py-2.5 sm:rounded-t-2xl">
                                <div className="min-w-0">
                                    <h3 className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-slate-800 sm:text-base">
                                        <span>Detalle del Gasto</span>
                                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 sm:text-[11px]">
                                            #{getDetalleRendId(detalleRevision) || "-"}
                                        </span>
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px] ${getEstadoBadgeClass(detalleRevision)}`}>
                                            {getEstadoLabel(detalleRevision)}
                                        </span>
                                    </h3>
                                    {/*    <p className="text-xs text-slate-500 mt-0.5">
                                        <span className="font-semibold text-slate-600">Fecha:</span> {getDetalleFecha(detalleRevision)}
                                    </p> */}

                                    {/*       <div className="mt-1.5">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(detalleRevision)}`}>
                                            {getEstadoLabel(detalleRevision)}
                                        </span>
                                    </div> */}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetalleRevision(null)}
                                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Body */}
                            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-5">
                                {/* Evidencia */}
                                <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Evidencia</p>
                                    <EvidenciaImagen
                                        gasto={detalleRevision}
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

                                {/* Datos Generales */}
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h2 className="col-span-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-1">Datos Generales del Gasto</h2>
                                    {[
                                        ["Política", firstDefined(detalleRevision?.politica, detalleRevision?.pol, detalleRevision?.nomPolitica, "-")],
                                        ["Centro de Costo", firstDefined(detalleRevision?.consumidor, detalleRevision?.centroCosto, detalleRevision?.centrocosto, detalleRevision?.nomCentroCosto, "-")],
                                        ["Tipo de Gasto", firstDefined(detalleRevision?.tipoGasto, detalleRevision?.tipogasto, detalleRevision?.nomTipoGasto, "-")],
                                        ["Categoría", getDetalleCategoria(detalleRevision)],
                                        ["RUC Emisor", firstDefined(detalleRevision?.rucEmisor, detalleRevision?.rucemisor, detalleRevision?.ruc, "-")],
                                        ["Razón Social", getDetalleProveedor(detalleRevision)],
                                        ["RUC Cliente", firstDefined(detalleRevision?.rucCliente, detalleRevision?.ruccliente, detalleRevision?.rucCli, "-")],
                                        ["Placa", firstDefined(detalleRevision?.placa, detalleRevision?.placaVehiculo, "-")],
                                    ].map(([label, value]) => (
                                        <div key={label} className="col-span-1">
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                            <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                        </div>
                                    ))}
                                </dl>

                                {/* Monto */}
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h2 className="col-span-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-1">Monto del Gasto</h2>
                                    {[
                                        ["Total", `S/ ${getDetalleMonto(detalleRevision).toFixed(2)}`],
                                        ["IGV", firstDefined(detalleRevision?.igv, detalleRevision?.tax, detalleRevision?.impuesto, "-")],
                                    ].map(([label, value]) => (
                                        <div key={label} className="col-span-1">
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                            <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                        </div>
                                    ))}
                                </dl>

                                {/* Factura */}
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h2 className="col-span-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-1">Datos de la Factura</h2>
                                    {(isPlanillaMovilidadDetalle(detalleRevision)
                                        ? [
                                            ["Tipo Comprobante", firstDefined(detalleRevision?.tipoCombrobante, detalleRevision?.tipoComprobante, detalleRevision?.tipocomprobante, detalleRevision?.nomTipoComprobante, detalleRevision?.comprobante, "-")],
                                            ["Fecha Emisión", getDetalleFecha(detalleRevision)],
                                            ["Serie", firstDefined(detalleRevision?.serie, detalleRevision?.serieComprobante, detalleRevision?.nroserie, "-")],
                                            ["Número", firstDefined(detalleRevision?.numero, detalleRevision?.nroComprobante, detalleRevision?.nro, detalleRevision?.num, detalleRevision?.nrodoc, "-")],
                                            ["Total", `S/ ${getDetalleMonto(detalleRevision).toFixed(2)}`],
                                            ["LUGAR ORIGEN", firstDefined(detalleRevision?.lugarOrigen, detalleRevision?.lugarorigen, detalleRevision?.origen, detalleRevision?.puntoOrigen, detalleRevision?.desde) || "-"],
                                            ["LUGAR DESTINO", firstDefined(detalleRevision?.lugarDestino, detalleRevision?.lugardestino, detalleRevision?.destino, detalleRevision?.puntoDestino, detalleRevision?.hasta) || "-"],
                                            ["TIPO MOVILIDAD", firstDefined(detalleRevision?.tipoMovilidad, detalleRevision?.tipomovilidad, detalleRevision?.tipo_movilidad, detalleRevision?.movilidad, detalleRevision?.transporte, detalleRevision?.medioTransporte, detalleRevision?.medio_transporte) || "-"],
                                            ["Motivo Viaje", firstDefined(detalleRevision?.motivoViaje, detalleRevision?.motivo_viaje, detalleRevision?.motivo, detalleRevision?.glosa, "-")],
                                        ]
                                        : [
                                            ["Tipo Comprobante", firstDefined(detalleRevision?.tipoCombrobante, detalleRevision?.tipoComprobante, detalleRevision?.tipocomprobante, detalleRevision?.nomTipoComprobante, detalleRevision?.comprobante, "-")],
                                            ["Fecha Emisión", getDetalleFecha(detalleRevision)],
                                            ["Serie", firstDefined(detalleRevision?.serie, detalleRevision?.serieComprobante, "-")],
                                            ["Número", firstDefined(detalleRevision?.numero, detalleRevision?.nroComprobante, detalleRevision?.nro, "-")],
                                            ["Total", `S/ ${getDetalleMonto(detalleRevision).toFixed(2)}`],
                                        ])
                                        .map(([label, value]) => (
                                            <div key={label} className="col-span-1">
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                                <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                            </div>
                                        ))}
                                </dl>

                                {/* Observación */}
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h2 className="col-span-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-1">Observación</h2>
                                    {[
                                        ["Nota:", firstDefined(
                                            detalleRevision?.nota,
                                            detalleRevision?.Nota,
                                            detalleRevision?.obs,
                                            detalleRevision?.observacion,
                                            detalleRevision?.observaciones,
                                            detalleRevision?.glosa,
                                            detalleRevision?.descripcion,
                                            detalleRevision?.desc,
                                            detalleRevision?.motivo,
                                            selectedRevision?.nota,
                                            selectedRevision?.Nota,
                                            selectedRevision?.obs,
                                            selectedRevision?.observacion,
                                            selectedRevision?.descripcion,
                                            selectedRevision?.glosa,
                                        )],
                                    ].map(([label, value]) => (
                                        <div key={label} className="col-span-2">
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                            <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            {/* Footer */}
                            {/*  <div className="shrink-0 border-t bg-slate-50 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => setDetalleRevision(null)}
                                    className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 cursor-pointer  "
                                >
                                    Cerrar
                                </button>
                            </div> */}
                        </div>
                    </div>
                )}

                <ImageZoomLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />

                {/* MODAL DE DETALLES */}
                {selectedRevision && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
                        {/* Backdrop */}
                        <button
                            type="button"
                            aria-label="Cerrar modal"
                            className="absolute inset-0"
                            onClick={handleCerrarDetalles}
                        />

                        <div className="relative z-10 flex w-full flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl" style={{ maxHeight: "90dvh" }}>
                            {/* Header */}
                            <div className="sticky top-0 rounded-t-3xl border-b border-blue-100 bg-linear-to-r from-blue-50 via-white to-indigo-50 sm:rounded-t-2xl">
                                {/* Título + botón cerrar */}
                                <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="h-7 w-1 rounded-full bg-linear-to-b from-blue-600 via-blue-700 to-indigo-500 sm:h-9" />
                                        <h2 className="min-w-0 text-sm font-extrabold text-slate-800 sm:text-base">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span>Detalle de Revisión</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 sm:text-xs"># ID Rev: {getRevisionId(selectedRevision) || "-"}</span>
                                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:text-xs ${getEstadoBadgeClass(selectedRevision)}`}>
                                                    {getEstadoLabel(selectedRevision)}
                                                </span>
                                            </span>
                                        </h2>
                                    </div>
                                    <button
                                        onClick={handleCerrarDetalles}
                                        className="cursor-pointer rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 sm:px-3.5 sm:py-1.5 sm:text-sm"
                                    >
                                        Cerrar
                                    </button>
                                </div>

                                {/* Resumen compacto */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pb-4 sm:grid-cols-4 sm:px-6">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rendidor</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-700 truncate">{selectedRevision?.usuario}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Auditor</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-700 truncate">{selectedRevision?.usuarioAuditor}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Gerencia</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-700 truncate">{selectedRevision?.gerencia}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-700">{formatDate(firstDefined(selectedRevision?.fecCre, selectedRevision?.feccre, ""))}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-800">S/ {detalles.reduce((acc, d) => acc + getDetalleMonto(d), 0).toFixed(2)}</p>
                                    </div>
                                    {/*    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ID Revisión</p>
                                        <p className="mt-0.5 text-xs font-mono text-slate-700">{getRevisionId(selectedRevision) || "-"}</p>
                                    </div> */}
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Política</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-700 truncate">{firstDefined(selectedRevision?.politica, selectedRevision?.pol, selectedRevision?.nomPolitica, "-")}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cant. Gastos</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-700">{detalles.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Observación</p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-700 truncate">{firstDefined(selectedRevision?.obs, selectedRevision?.descripcion, selectedRevision?.glosa, "-")}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto">
                                {loadingDetalles ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
                                        <p className="text-sm text-slate-500">Cargando detalles...</p>
                                    </div>
                                ) : detalles.length > 0 ? (
                                    <div className="p-4 sm:p-5">
                                        <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                            Gastos de la revisión ({detalles.length})
                                        </h3>
                                        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 [scrollbar-width:thin]">
                                            {detalles.map((detalle, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setDetalleRevision(detalle)}
                                                    className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50 cursor-pointer"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-semibold text-slate-400">#{getDetalleRendId(detalle) || "-"}</span>
                                                            <span className="truncate text-xs font-semibold text-slate-700">{getDetalleProveedor(detalle)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                            <span>{getDetalleCategoria(detalle)}</span>
                                                            <span className="text-slate-300">·</span>
                                                            <span>{getDetalleFecha(detalle)}</span>
                                                        </div>
                                                    </div>
                                                    <span className="shrink-0 text-xs font-bold text-cyan-700">
                                                        S/ {getDetalleMonto(detalle).toFixed(2)}
                                                    </span>
                                                    <IconEye className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                        <p className="text-sm font-semibold text-slate-600">Sin detalles</p>
                                        <p className="text-xs text-slate-400">No hay gastos registrados en esta revisión.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer — botones */}
                            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
                                <div className="flex flex-row gap-2 sm:justify-end">
                                    {/*BOTON APROBAR REVISION */}
                                    <button
                                        onClick={handleAprobar}
                                        disabled={sendingDecision || isRevisionDecisionBloqueada(selectedRevision)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:w-auto sm:px-5 cursor-pointer"
                                    >
                                        <IconUp className="h-4 w-4 shrink-0" />
                                        <span className="hidden sm:inline">{sendingDecision ? "Procesando..." : "Aprobar"}</span>
                                    </button>

                                    {/*RECHAZAR */}
                                    <button
                                        onClick={openDesaprobarModal}
                                        disabled={sendingDecision || isRevisionDecisionBloqueada(selectedRevision)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:w-auto sm:px-5 cursor-pointer"
                                    >
                                        <IconDown className="h-4 w-4 shrink-0" />
                                        <span className="hidden sm:inline">Rechazar</span>
                                    </button>
                                    {/*RECHAZAR */}
                                    <button
                                        onClick={handleCerrarDetalles}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex-none sm:w-auto sm:px-5 cursor-pointer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        <span className="hidden sm:inline">Cerrar</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal de desaprobación */}
                        {showRejectModal && (
                            <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:p-4">
                                <button
                                    type="button"
                                    aria-label="Cerrar modal de desaprobación"
                                    className="absolute inset-0 bg-black/40"
                                    onClick={() => setShowRejectModal(false)}
                                />
                                <div className="relative z-10 w-full rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
                                    <h3 className="text-base font-bold text-slate-800 sm:text-lg">Motivo de rechazo</h3>
                                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">Este motivo se enviará en el campo obs.</p>

                                    <textarea
                                        value={rejectObs}
                                        onChange={(e) => setRejectObs(e.target.value)}
                                        rows={4}
                                        placeholder="Escribe el motivo de rechazo..."
                                        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                                    />

                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowRejectModal(false)}
                                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto sm:px-4 sm:py-2 cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleEnviarDesaprobacion}
                                            disabled={sendingDecision}
                                            className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto sm:px-4 sm:py-2 cursor-pointer"
                                        >
                                            {sendingDecision ? "Enviando..." : "Enviar rechazo"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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