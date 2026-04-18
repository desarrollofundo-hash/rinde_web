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
import { IconEye } from "../../Icons/preview";
import PaginationControls from "../Gasto/PaginationControls";
import EvidenciaImagen from "../Gasto/EvidenciaImagen";

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
    const [detalleModal, setDetalleModal] = useState({ open: false, detalle: null });
    const [zoomSrc, setZoomSrc] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
    const zoomDragRef = { isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0 };

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
    const currentTo = (effectiveCurrentPage - 1) * pageSize + paginatedAuditorias.length;

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
        } catch (e) {
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
                /* console.log("🔁 Reintentando listado con user alterno:", altUserId); */
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

    const getEstadoLabel = (auditoria) => getWorkflowStatusLabel(resolveWorkflowStatus(auditoria, "PENDIENTE"));

    const getEstadoBadgeClass = (auditoria) =>
        getWorkflowStatusBadgeClass(resolveWorkflowStatus(auditoria, "PENDIENTE"));

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
                <section className="sticky top-4 z-30 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                                Gestión de Auditorías
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 sm:text-base">
                                Aquí puedes <span className="font-semibold text-slate-700"> revisar tu lista de auditorías, ver detalles y enviar a revisión para su aprobación.</span>
                            </p>
                        </div>
                    </div>
                </section>

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
                    <section className="space-y-4">
                        {/*  <div className="sticky top-20 z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-lg font-bold text-slate-800">Listado de Auditorías</h2>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-slate-500 sm:text-sm">
                                        Página {effectiveCurrentPage} de {totalPages}
                                    </p>
                                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                        {auditorias.length} registro(s)
                                    </span>
                                </div>
                            </div>
                        </div> */}

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="hidden max-h-[70vh] overflow-auto md:block">
                                <table className="w-full min-w-225 text-sm">
                                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">#</th>
                                            <th className="px-4 py-3 text-left font-semibold">ID</th>
                                            <th className="px-4 py-3 text-left font-semibold">DNI</th>
                                            <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                            <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                                            <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedAuditorias.map((auditoria, index) => (
                                            <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/70">
                                                <td className="px-4 py-3 text-slate-700">{currentFrom + index}</td>
                                                <td className="px-4 py-3 text-slate-700">{auditoria?.idAd ?? auditoria?.id ?? "-"}</td>
                                                <td className="px-4 py-3 text-slate-700">{auditoria?.dni ?? "-"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(auditoria)}`}>
                                                        {getEstadoLabel(auditoria)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">{formatDate(auditoria?.fecCre)}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVerDetalles(auditoria)}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 cursor-pointer"
                                                    >
                                                        <IconEye className="h-4 w-4 shrink-0" />
                                                        Ver Detalles
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3 md:hidden">
                                {paginatedAuditorias.map((auditoria, index) => (
                                    <article key={index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <h3 className="text-sm font-bold text-slate-800">{auditoria?.obs ?? "Sin observación"}</h3>
                                            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${getEstadoBadgeClass(auditoria)}`}>
                                                {getEstadoLabel(auditoria)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                                            <p><span className="font-semibold text-slate-700">#:</span> {currentFrom + index}</p>
                                            <p><span className="font-semibold text-slate-700">Fecha:</span> {formatDate(auditoria?.fecCre)}</p>
                                            <p><span className="font-semibold text-slate-700">ID:</span> {auditoria?.idAd ?? auditoria?.id ?? "-"}</p>
                                            <p><span className="font-semibold text-slate-700">DNI:</span> {auditoria?.dni ?? "-"}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleVerDetalles(auditoria)}
                                            className="mt-3 w-full rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700"
                                        >
                                            Ver Detalles
                                        </button>
                                    </article>
                                ))}
                            </div>

                            <div className="border-t border-slate-200 bg-slate-50/80 px-2 py-2 sm:px-3">
                                <PaginationControls
                                    currentPage={effectiveCurrentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    totalItems={auditorias.length}
                                    currentFrom={currentFrom}
                                    currentTo={currentTo}
                                    pageSize={pageSize}
                                    onPageSizeChange={(nextSize) => {
                                        setPageSize(nextSize);
                                        setCurrentPage(1);
                                    }}
                                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* MODAL DETALLE DE GASTO INDIVIDUAL */}
                {detalleModal.open && detalleModal.detalle && (
                    <div
                        className="fixed inset-0 z-60 flex items-end bg-black/50 sm:items-center sm:p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setDetalleModal({ open: false, detalle: null }); }}
                    >
                        <div className="relative z-10 flex w-full max-h-[85dvh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:mx-auto sm:max-w-md sm:rounded-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-linear-to-r from-cyan-50 to-slate-50 px-5 py-4 sm:rounded-t-2xl">
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">
                                        Detalle del Gasto  <span className="text-cyan-600">#{getDetalleRendId(detalleModal.detalle) || '-'}</span>
                                    </h3>
                                    <h3 className="text-base font-bold text-slate-800">
                                        Fecha:<span className="text-cyan-600">{getDetalleFecha(detalleModal.detalle) || "-"}</span>
                                    </h3>
                                    <div className="mt-1">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(detalleModal.detalle)}`}>
                                            {getEstadoLabel(detalleModal.detalle)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetalleModal({ open: false, detalle: null })}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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

                                {/* Campos */}
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h1 className="col-span-2 text-lg font-bold text-slate-800">Datos Generales del Gasto:</h1>
                                    {[
                                        ["Política", firstDefined(detalleModal.detalle?.politica, detalleModal.detalle?.pol, "-")],
                                        ["Centro de Costo", firstDefined(detalleModal.detalle?.consumidor, detalleModal.detalle?.centroCosto, detalleModal.detalle?.centrocosto, detalleModal.detalle?.centro_costo, detalleModal.detalle?.nomCentroCosto, detalleModal.detalle?.idCuenta, "-")],
                                        ["Tipo Gasto", firstDefined(detalleModal.detalle?.tipoGasto, detalleModal.detalle?.tipogasto, detalleModal.detalle?.tipo_gasto, detalleModal.detalle?.nomTipoGasto, "-")],
                                        ["Categoría", firstDefined(detalleModal.detalle?.categoria, detalleModal.detalle?.cat, detalleModal.detalle?.nomCategoria, "-")],
                                        ["RUC Emisor", firstDefined(detalleModal.detalle?.rucEmisor, detalleModal.detalle?.rucemisor, detalleModal.detalle?.ruc, "-")],
                                        ["RUC Cliente", firstDefined(detalleModal.detalle?.rucCliente, detalleModal.detalle?.ruccliente, detalleModal.detalle?.rucCli, "-")],
                                        ["Razón Social", firstDefined(detalleModal.detalle?.proveedor, detalleModal.detalle?.razonSocial, detalleModal.detalle?.razonsocial, detalleModal.detalle?.empresa, "-")],
                                        ["Placa", firstDefined(detalleModal.detalle?.placa, detalleModal.detalle?.placaVehiculo, "-")],
                                    ].map(([label, value]) => (
                                        <div key={label} className="col-span-1">
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                            <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h1 className="col-span-2 text-lg font-bold text-slate-800">Monto del Gasto:</h1>
                                    {[
                                        ["Total", `S/ ${getDetalleMonto(detalleModal.detalle).toFixed(2)}`],
                                        ["IGV", firstDefined(detalleModal.detalle?.igv, detalleModal.detalle?.tax, detalleModal.detalle?.impuesto, "-")],
                                    ].map(([label, value]) => (
                                        <div key={label} className="col-span-1">
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                            <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h1 className="col-span-2 text-lg font-bold text-slate-800">Datos de la Factura:</h1>
                                    {(isPlanillaMovilidadDetalle(detalleModal.detalle)
                                        ? [
                                            ["Tipo Comprobante", getDetalleComprobante(detalleModal.detalle)],
                                            ["Fecha Emisión", getDetalleFecha(detalleModal.detalle)],
                                            ["Serie", firstDefined(detalleModal.detalle?.serie, detalleModal.detalle?.serieComprobante, detalleModal.detalle?.nroserie, "-")],
                                            ["Número", firstDefined(detalleModal.detalle?.numero, detalleModal.detalle?.nroComprobante, detalleModal.detalle?.nro, detalleModal.detalle?.num, detalleModal.detalle?.nrodoc, "-")],
                                            ["LUGAR ORIGEN", firstDefined(detalleModal.detalle?.lugarOrigen, detalleModal.detalle?.lugarorigen, detalleModal.detalle?.origen, detalleModal.detalle?.puntoOrigen, detalleModal.detalle?.desde) || "-"],
                                            ["LUGAR DESTINO", firstDefined(detalleModal.detalle?.lugarDestino, detalleModal.detalle?.lugardestino, detalleModal.detalle?.destino, detalleModal.detalle?.puntoDestino, detalleModal.detalle?.hasta) || "-"],
                                            ["TIPO MOVILIDAD", firstDefined(detalleModal.detalle?.tipoMovilidad, detalleModal.detalle?.tipomovilidad, detalleModal.detalle?.tipo_movilidad, detalleModal.detalle?.movilidad, detalleModal.detalle?.transporte, detalleModal.detalle?.medioTransporte, detalleModal.detalle?.medio_transporte) || "-"],
                                            ["Motivo Viaje", firstDefined(detalleModal.detalle?.motivoViaje, detalleModal.detalle?.motivo_viaje, detalleModal.detalle?.motivo, detalleModal.detalle?.glosa, "-")],
                                        ]
                                        : [
                                            ["Tipo Comprobante", getDetalleComprobante(detalleModal.detalle)],
                                            ["Fecha Emisión", getDetalleFecha(detalleModal.detalle)],
                                            ["Serie", firstDefined(detalleModal.detalle?.serie, detalleModal.detalle?.serieComprobante, "-")],
                                            ["Número", firstDefined(detalleModal.detalle?.numero, detalleModal.detalle?.nroComprobante, detalleModal.detalle?.nro, "-")],
                                            ["Total", `S/ ${getDetalleMonto(detalleModal.detalle).toFixed(2)}`],
                                        ])
                                        .map(([label, value]) => (
                                            <div key={label} className="col-span-1">
                                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                                <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                            </div>
                                        ))}
                                </dl>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <h1 className="col-span-2 text-lg font-bold text-slate-800">Datos Observación:</h1>
                                    {[
                                        ["Comentario", firstDefined(detalleModal.detalle?.obs, detalleModal.detalle?.observacion, detalleModal.detalle?.observaciones, detalleModal.detalle?.glosa, getDetalleDescripcion(detalleModal.detalle))],
                                    ].map(([label, value]) => (
                                        <div key={label} className="col-span-1">
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                            <dd className="mt-0.5 font-medium text-slate-700">{value ?? "-"}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            {/* Footer */}
                            <div className="shrink-0 border-t bg-slate-50 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => setDetalleModal({ open: false, detalle: null })}
                                    className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LIGHTBOX ZOOM */}
                {zoomSrc && (
                    <div
                        className="fixed inset-0 z-70 flex items-center justify-center bg-black/90"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setZoomSrc(null);
                                setZoomScale(1);
                                setZoomPos({ x: 0, y: 0 });
                            }
                        }}
                        onWheel={(e) => {
                            e.preventDefault();
                            setZoomScale((prev) => Math.min(6, Math.max(0.5, prev - e.deltaY * 0.002)));
                        }}
                        style={{ touchAction: "none" }}
                    >
                        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                            <button type="button" onClick={() => setZoomScale((p) => Math.min(6, +(p + 0.5).toFixed(1)))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20" title="Acercar">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM11 8v6M8 11h6" /></svg>
                            </button>
                            <button type="button" onClick={() => setZoomScale((p) => Math.max(0.5, +(p - 0.5).toFixed(1)))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20" title="Alejar">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM8 11h6" /></svg>
                            </button>
                            <button type="button" onClick={() => { setZoomScale(1); setZoomPos({ x: 0, y: 0 }); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20" title="Restablecer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button type="button" onClick={() => { setZoomSrc(null); setZoomScale(1); setZoomPos({ x: 0, y: 0 }); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20" title="Cerrar">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
                            {Math.round(zoomScale * 100)}%
                        </span>
                        <img
                            src={zoomSrc}
                            alt="Zoom evidencia"
                            draggable={false}
                            style={{
                                transform: `scale(${zoomScale}) translate(${zoomPos.x}px, ${zoomPos.y}px)`,
                                transformOrigin: "center",
                                transition: "transform 0.15s ease",
                                maxWidth: "90vw",
                                maxHeight: "90vh",
                                cursor: zoomScale > 1 ? "grab" : "zoom-in",
                                userSelect: "none",
                            }}
                            onMouseDown={(e) => {
                                if (zoomScale <= 1) { setZoomScale(2); return; }
                                zoomDragRef.isDragging = true;
                                zoomDragRef.startX = e.clientX;
                                zoomDragRef.startY = e.clientY;
                                zoomDragRef.originX = zoomPos.x;
                                zoomDragRef.originY = zoomPos.y;
                                e.currentTarget.style.cursor = "grabbing";
                            }}
                            onMouseMove={(e) => {
                                if (!zoomDragRef.isDragging) return;
                                const dx = (e.clientX - zoomDragRef.startX) / zoomScale;
                                const dy = (e.clientY - zoomDragRef.startY) / zoomScale;
                                setZoomPos({ x: zoomDragRef.originX + dx, y: zoomDragRef.originY + dy });
                            }}
                            onMouseUp={(e) => {
                                zoomDragRef.isDragging = false;
                                e.currentTarget.style.cursor = zoomScale > 1 ? "grab" : "zoom-in";
                            }}
                            onMouseLeave={() => { zoomDragRef.isDragging = false; }}
                            onClick={() => { if (zoomScale === 1) setZoomScale(2); }}
                        />
                    </div>
                )}

                {/* MODAL DE DETALLES */}
                {selectedAuditoria && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-slate-200">
                            <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-6 py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">Detalles de Auditoría</h2>
                                        <p className="text-sm text-slate-600">Rendidor: {firstDefined(selectedAuditoria?.usuario, "-")}</p>
                                    </div>

                                    <button
                                        onClick={handleCerrarDetalles}
                                        className="text-2xl font-bold text-slate-500 transition hover:text-slate-700"
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
                                    <>
                                        {/* Tabla — solo en md+ */}
                                        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Gasto</th>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {detalles.map((detalle, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                            <td className="px-3 py-3 text-slate-400 text-xs">{idx + 1}</td>
                                                            <td className="px-3 py-3 text-slate-700 font-mono text-xs">{getDetalleRendId(detalle) || "-"}</td>
                                                            <td className="px-3 py-3 text-slate-700 max-w-40 truncate" title={getDetalleEmpresa(detalle)}>{getDetalleEmpresa(detalle)}</td>
                                                            <td className="px-3 py-3">
                                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${getEstadoBadgeClass(detalle)}`}>
                                                                    {getEstadoLabel(detalle)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">{getDetalleFecha(detalle)}</td>
                                                            <td className="px-3 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">S/ {getDetalleMonto(detalle).toFixed(2)}</td>
                                                            <td className="px-3 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-700 transition-colors"
                                                                    onClick={() => setDetalleModal({ open: true, detalle })}
                                                                >
                                                                    <IconEye className="h-3.5 w-3.5 shrink-0" />
                                                                    Ver
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Cards — solo en móvil */}
                                        <div className="space-y-3 md:hidden">
                                            {detalles.map((detalle, idx) => (
                                                <article key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Empresa</p>
                                                            <p className="text-sm font-semibold text-slate-800 truncate">{getDetalleEmpresa(detalle)}</p>
                                                        </div>
                                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getEstadoBadgeClass(detalle)}`}>
                                                            {getEstadoLabel(detalle)}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">#</p>
                                                            <p className="text-slate-600 font-medium">{idx + 1}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ID Gasto</p>
                                                            <p className="text-slate-600 font-mono">{getDetalleRendId(detalle) || "-"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha</p>
                                                            <p className="text-slate-600">{getDetalleFecha(detalle)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-base font-bold text-slate-800">S/ {getDetalleMonto(detalle).toFixed(2)}</p>
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-700 transition-colors"
                                                            onClick={() => setDetalleModal({ open: true, detalle })}
                                                        >
                                                            <IconEye className="h-3.5 w-3.5 shrink-0" />
                                                            Ver detalle
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    </>
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
                                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold py-2 px-6 transition "
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