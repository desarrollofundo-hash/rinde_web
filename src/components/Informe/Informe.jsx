import React, { useCallback, useEffect, useState } from "react";
import { getListaInformes } from "../../services/listar/listar_informes";
import { getListaGastos } from "../../services/listar/listar_gasto";
import { getInformeDetalle } from "../../services/listar/listar_informe_detalle";
import { saveRendicionInforme } from "../../services/save/saveInforme";
import { saveRendicionInformeDetalle } from "../../services/save_detalle/saveInformeDetalle";
import { saveRendicionAuditoria } from "../../services/save/saveRendicionAuditoria";
import { saveRendicionAuditoriaDetalle } from "../../services/save_detalle/saveRendicionAuditoriaDetalle";
import NewInforme from "./NewInforme";
import InformeHeader from "./InformeHeader";
import InformeList from "./InformeList";
import InformeStateMessage from "./InformeStateMessage";
import ModalInforme from "./ModalInforme";
import InformeVistaPrevia from "./InformeVistaPrevia";
import { resolveWorkflowStatus } from "../shared/workflowStatus";
import Toast from "../shared/Toast";

export default function Informe() {
    const [informes, setInformes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalNewInformeOpen, setIsModalNewInformeOpen] = useState(false);
    const [isModalInformeOpen, setIsModalInformeOpen] = useState(false);
    const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
    const [informeEnEdicion, setInformeEnEdicion] = useState({});
    const [previewData, setPreviewData] = useState({ gastosSeleccionados: [], gastosPolitica: [], gastosPersistidos: [] });
    const [toastConfig, setToastConfig] = useState({ isVisible: false, message: "", type: "success" });

    const showToast = (message, type = "success") => {
        setToastConfig({ isVisible: true, message, type });
    };

    const closeToast = () => {
        setToastConfig((prev) => ({ ...prev, isVisible: false }));
    };

    const resolveUserId = (userData) =>
        Number(userData?.id ?? userData?.usecod ?? userData?.idUser ?? 0);

    const resolveUserDoc = (userData) =>
        String(userData?.usedoc ?? userData?.dni ?? userData?.documento ?? "");

    const resolveCompanyRuc = (companyData) =>
        String(companyData?.ruc ?? companyData?.RUC ?? companyData?.numRuc ?? "");

    const normalizeEstadoInforme = (item) => resolveWorkflowStatus(item, "PENDIENTE");

    const fetchInformes = useCallback(async () => {
        setLoading(true);

        try {
            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");

            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;
            /* 
                        console.log("👤 USER:", userData);
                        console.log("🏢 COMPANY:", companyData); */

            if (!userData) {
                throw new Error("No hay usuario logueado");
            }

            if (!companyData) {
                throw new Error("No hay empresa seleccionada");
            }

            const userId = resolveUserId(userData);
            const altUserId = Number(userData?.usecod ?? userData?.id ?? 0);
            const companyRuc = resolveCompanyRuc(companyData);

            if (!userId) {
                throw new Error("No se pudo resolver el id del usuario logueado");
            }

            let data = await getListaInformes({
                id: "1",
                idrend: "1",
                user: String(userId),
                ruc: companyRuc,
            });

            if (Array.isArray(data) && data.length === 0 && altUserId && altUserId !== userId) {
                /* console.log("🔁 Reintentando listado con user alterno:", altUserId); */
                data = await getListaInformes({
                    id: "1",
                    idrend: "1",
                    user: String(altUserId),
                    ruc: companyRuc,
                });
            }

            const normalizedData = (Array.isArray(data) ? data : []).map((item) => {
                const estado = normalizeEstadoInforme(item);
                return {
                    ...item,
                    estadoActual: estado || item?.estadoActual || item?.estadoactual || "",
                    estadoactual: estado || item?.estadoactual || item?.estadoActual || "",
                };
            });

            /* console.log("📥 INFORMES:", normalizedData); */
            setInformes(normalizedData);
        } catch (error) {
            /* console.error("❌ Error:", error.message); */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInformes();
    }, [fetchInformes]);

    useEffect(() => {
        const onFocus = () => fetchInformes();
        const onCompanyChanged = () => fetchInformes();
        const onInformeUpdated = () => fetchInformes();
        const onAuditoriaUpdated = () => fetchInformes();
        const onRevisionUpdated = () => fetchInformes();

        window.addEventListener("focus", onFocus);
        window.addEventListener("company:changed", onCompanyChanged);
        window.addEventListener("informe:updated", onInformeUpdated);
        window.addEventListener("auditoria:updated", onAuditoriaUpdated);
        window.addEventListener("revision:updated", onRevisionUpdated);

        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("company:changed", onCompanyChanged);
            window.removeEventListener("informe:updated", onInformeUpdated);
            window.removeEventListener("auditoria:updated", onAuditoriaUpdated);
            window.removeEventListener("revision:updated", onRevisionUpdated);
        };
    }, [fetchInformes]);

    const handleSaveNewInforme = async (data) => {
        try {
            /* console.log("\n" + "=".repeat(50));
            console.log("🔵 INICIO: handleSaveNewInforme");
            console.log("📝 Datos del formulario:", data);
            console.log("=".repeat(50)); */

            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");

            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;

            if (!userData || !companyData) {
                throw new Error("No hay sesión de usuario o empresa activa");
            }

            const nowIso = new Date().toISOString();
            const idUser = resolveUserId(userData);
            const companyRuc = resolveCompanyRuc(companyData);

            const payloadInforme = {
                idUser,
                dni: resolveUserDoc(userData),
                ruc: companyRuc,
                titulo: String(data.titulo || ""),
                nota: String(data.glosa || ""),
                politica: String(data.politica || ""),
                obs: "",
                estadoactual: "EN INFORME",
                estado: "S",
                fecCre: nowIso,
                useReg: idUser,
                hostname: "WEB",
                fecEdit: nowIso,
                useEdit: 0,
                useElim: 0,
            };

            /* console.log("💾 Guardando cabecera de informe...");
            console.log("📦 Payload completo:", JSON.stringify(payloadInforme, null, 2)); */

            const idInf = await saveRendicionInforme(payloadInforme);

            /*             console.log("✅ idInf obtenido en Informe.jsx:", idInf);
             */
            setInformeEnEdicion({
                idInf,
                titulo: data.titulo,
                politica: data.politica,
                glosa: data.glosa,
                idUser,
                nowIso,
            });

            // Cerrar primer modal y abrir el segundo
            /* console.log("🔄 Cerrando primer modal, abriendo segundo..."); */
            setIsModalNewInformeOpen(false);
            setIsModalInformeOpen(true);
            /* console.log("🟢 FIN: handleSaveNewInforme (exitoso)\n"); */
        } catch (error) {
            /*     console.log("\n" + "=".repeat(50));
                console.error("❌ ERROR en handleSaveNewInforme:", error);
                console.error("   Mensaje:", error?.message);
                console.error("   Stack:", error?.stack);
                console.log("=".repeat(50) + "\n"); */
            showToast(`Error al guardar informe: ${error?.message || "Inténtalo nuevamente"}`, "error");
        }
    };

    const handleSaveInformeConGastos = async (dataConGastos) => {
        setIsSaving(true);
        try {
            /*             console.log("\n" + "=".repeat(50));
                        console.log("🔵 INICIO: handleSaveInformeConGastos");
                        console.log("📦 Datos recibidos:", JSON.stringify(dataConGastos, null, 2)); */

            const { idInf, gastosSeleccionados, gastosYaGuardados = [] } = dataConGastos;
            const { glosa, idUser, nowIso } = informeEnEdicion;

            const userRaw = localStorage.getItem("user");
            const companyRaw = localStorage.getItem("company");
            const userData = userRaw ? JSON.parse(userRaw) : null;
            const companyData = companyRaw ? JSON.parse(companyRaw) : null;

            const effectiveIdUser = Number(idUser ?? resolveUserId(userData));
            const effectiveNowIso = nowIso || new Date().toISOString();
            const effectiveRuc = resolveCompanyRuc(companyData);

            if (!effectiveIdUser) {
                throw new Error("No se pudo resolver idUser para guardar detalle de informe");
            }
            /* 
                        console.log("📝 idInf:", idInf);
                        console.log("📋 Gastos seleccionados:", gastosSeleccionados);
                        console.log("📋 Gastos persistidos previos:", gastosYaGuardados?.length);
                        console.log("📋 Cantidad de gastos:", gastosSeleccionados?.length);
                        console.log("🏷️ Título:", titulo);
                        console.log("📌 Política:", politica); */

            // ========== DELTA DE CAMBIOS ==========
            const gastosSeleccionadosIds = Array.from(
                new Set(
                    (gastosSeleccionados || [])
                        .map((id) => Number(id))
                        .filter((id) => Number.isFinite(id) && id > 0)
                )
            );

            const gastosPersistidosIds = Array.from(
                new Set(
                    (gastosYaGuardados || [])
                        .map((id) => Number(id))
                        .filter((id) => Number.isFinite(id) && id > 0)
                )
            );

            const selectedSet = new Set(gastosSeleccionadosIds.map((id) => String(id)));
            const persistedSet = new Set(gastosPersistidosIds.map((id) => String(id)));

            // Nuevos seleccionados: estaban fuera y ahora entran => S
            const gastosNuevosSeleccionados = gastosSeleccionadosIds.filter((id) => !persistedSet.has(String(id)));
            // Quitados: estaban guardados y ahora salen => N
            const gastosQuitados = gastosPersistidosIds.filter((id) => !selectedSet.has(String(id)));

            const detallesSeleccionados = gastosNuevosSeleccionados.map((idRend) => ({
                idInf: Number(idInf),
                idRend: Number(idRend),
                idUser: effectiveIdUser,
                ruc: effectiveRuc,
                obs: String(glosa || ""),
                estadoactual: "EN INFORME",
                estado: "S",
                fecCre: effectiveNowIso,
                useReg: effectiveIdUser,
                hostname: "WEB",
                fecEdit: effectiveNowIso,
                useEdit: 0,
                useElim: 0,
            }));

            const detallesNoSeleccionados = gastosQuitados.map((idRend) => ({
                idInf: Number(idInf),
                idRend: Number(idRend),
                idUser: effectiveIdUser,
                ruc: effectiveRuc,
                obs: String(glosa || ""),
                estadoactual: "BORRADOR",
                estado: "N",
                fecCre: effectiveNowIso,
                useReg: effectiveIdUser,
                hostname: "WEB",
                fecEdit: effectiveNowIso,
                useEdit: 0,
                useElim: 0,
            }));

            const detalles = [...detallesSeleccionados, ...detallesNoSeleccionados];
            /* 
                        console.log("💾 Guardando detalle de informe...");
                        console.log("📌 idUser efectivo:", effectiveIdUser);
                        console.log("📌 ruc efectivo:", effectiveRuc);
                        console.log("📌 fecha efectiva:", effectiveNowIso);
                        console.log("📌 Gastos seleccionados actuales:", gastosSeleccionadosIds);
                        console.log("📌 Gastos persistidos previos:", gastosPersistidosIds);
                        console.log("📌 Altas (S):", gastosNuevosSeleccionados);
                        console.log("📌 Bajas (N):", gastosQuitados);
                        console.log("📦 Payload detalle (combinado):", JSON.stringify(detalles, null, 2)); */

            if (detalles.length > 0) {
                await saveRendicionInformeDetalle(detalles);
                /*           console.log(`✅ Guardados ${detallesSeleccionados.length} gastos con estado S`);
                          console.log(`✅ Guardados ${detallesNoSeleccionados.length} gastos con estado N`); */
            } else {
                /* console.log("ℹ️ No hay cambios para guardar (ni altas ni bajas)."); */
            }
            /* 
                        console.log("✅ Informe guardado correctamente con", gastosSeleccionados?.length, "gasto(s) seleccionados. Totales en BD:", detalles.length);
             */
            setIsModalInformeOpen(false);
            setIsVistaPreviaOpen(false);
            setIsSaving(false);

            const mensaje = `Informe guardado correctamente`;
            showToast(mensaje, "success");

            // 🧹 LIMPIAR TODOS LOS DATOS
            setInformeEnEdicion({});
            setPreviewData({ gastosSeleccionados: [], gastosPolitica: [], gastosPersistidos: [] });

            /* console.log("🟢 FIN: handleSaveInformeConGastos (exitoso)\n"); */


            // Refresca solo la lista de informes sin salir de la pantalla
            await fetchInformes();

            // Notificar para refrescar la lista de gastos.
            window.dispatchEvent(new CustomEvent("informe:updated"));
        } catch (error) {
            setIsSaving(false);
            /*  console.log("\n" + "=".repeat(50));
             console.error("❌ ERROR en handleSaveInformeConGastos:", error);
             console.error("   Mensaje:", error?.message);
             console.error("   Stack:", error?.stack);
             console.log("=".repeat(50) + "\n"); */
            showToast(`Error al guardar informe: ${error?.message || "Inténtalo nuevamente"}`, "error");
        }
    };

    const handleEnviarAuditoriaDesdeVistaPrevia = async (selectedFinal) => {
        const finalSelection = Array.isArray(selectedFinal)
            ? selectedFinal
            : previewData.gastosSeleccionados;

        const infoActual = {
            idInf: informeEnEdicion?.idInf ?? previewData?.idInf,
            id: informeEnEdicion?.id ?? previewData?.id,
            titulo: informeEnEdicion?.titulo ?? previewData?.titulo,
            politica: informeEnEdicion?.politica ?? previewData?.politica,
            glosa: informeEnEdicion?.glosa ?? previewData?.glosa,
            idUser: informeEnEdicion?.idUser,
            nowIso: informeEnEdicion?.nowIso,
        };

        if (!infoActual.idInf) {
            showToast("No se encontró id del informe para enviar a auditoría", "warning");
            return;
        }

        const userRaw = localStorage.getItem("user");
        const companyRaw = localStorage.getItem("company");
        const userData = userRaw ? JSON.parse(userRaw) : null;
        const companyData = companyRaw ? JSON.parse(companyRaw) : null;

        if (!userData || !companyData) {
            showToast("No hay sesión de usuario o empresa activa para enviar a auditoría", "warning");
            return;
        }

        try {
            const effectiveIdUser = Number(infoActual.idUser ?? resolveUserId(userData));
            const effectiveNowIso = infoActual.nowIso || new Date().toISOString();
            const effectiveRuc = resolveCompanyRuc(companyData);
            const gastosSource = Array.isArray(previewData?.gastosPolitica) ? previewData.gastosPolitica : [];

            const auditoriaPayload = {
                idAd: 0,
                idInf: Number(infoActual.idInf),
                idUser: effectiveIdUser,
                dni: resolveUserDoc(userData),
                ruc: effectiveRuc,
                obs: "",
                estadoActual: "EN AUDITORIA",
                estado: "S",
                fecCre: effectiveNowIso,
                useReg: effectiveIdUser,
                hostname: "WEB",
                fecEdit: effectiveNowIso,
                useEdit: 0,
                useElim: 0,
            };

            const idAd = await saveRendicionAuditoria(auditoriaPayload);

            if (!idAd) {
                throw new Error("No se recibió idAd al crear auditoría");
            }

            const finalSelectionSet = new Set(finalSelection.map((id) => String(id)));
            const detallesParaEnviar = (Array.isArray(previewData?.detalles) ? previewData.detalles : []).filter(
                (d) => finalSelectionSet.has(String(d?.idrend ?? d?.idRend ?? ""))
            );

            for (const det of detallesParaEnviar) {
                const detallePayload = {
                    idAd: Number(idAd),
                    idInf: Number(det?.idinf ?? det?.idInf),
                    idInfDet: Number(det?.id),
                    idRend: Number(det?.idrend ?? det?.idRend ?? 0),
                    idUser: Number(det?.iduser ?? det?.idUser ?? effectiveIdUser),
                    dni: resolveUserDoc(userData),
                    ruc: String(effectiveRuc),
                    obs: String(det?.obs ?? infoActual.glosa ?? ""),
                    estadoActual: "EN AUDITORIA",
                    estado: "S",
                    fecCre: effectiveNowIso,
                    useReg: effectiveIdUser,
                    hostname: "WEB",
                    fecEdit: effectiveNowIso,
                    useEdit: effectiveIdUser,
                    useElim: 0,
                };

                console.log(`📤 Enviando detalle (idInfDet: ${detallePayload.idInfDet}):`, detallePayload);
                await saveRendicionAuditoriaDetalle(detallePayload);
            }

            const detalleResumen = finalSelection.map((idRend) => {
                const selectedId = String(idRend);
                const gasto = gastosSource.find((g) => String(g?.idrend ?? g?.idRend ?? g?.id ?? "") === selectedId);

                return {
                    idRend: Number(idRend),
                    id: Number(idRend),
                    proveedor: String(gasto?.proveedor ?? ""),
                    empresa: String(gasto?.proveedor ?? gasto?.empresa ?? ""),
                    tipoComprobante: String(gasto?.tipoComprobante ?? ""),
                    descripcion: String(gasto?.descripcion ?? gasto?.glosa ?? infoActual.glosa ?? ""),
                    fecha: gasto?.fecha ?? null,
                    total: Number(gasto?.total ?? gasto?.monto ?? gasto?.importe ?? 0),
                    monto: Number(gasto?.total ?? gasto?.monto ?? gasto?.importe ?? 0),
                    obs: String(infoActual.glosa || ""),
                };
            });
            // Actualizar estado del informe a EN_AUDITORIA después de enviar
            const payloadEstadoInforme = {
                idInf: Number(infoActual.idInf),
                idUser: effectiveIdUser,
                dni: resolveUserDoc(userData),
                ruc: effectiveRuc,
                titulo: String(infoActual.titulo || ""),
                nota: String(infoActual.glosa || ""),
                politica: String(infoActual.politica || ""),
                obs: "",
                estadoactual: "EN AUDITORIA",
                estado: "S",
                fecCre: effectiveNowIso,
                useReg: effectiveIdUser,
                hostname: "WEB",
                fecEdit: new Date().toISOString(),
                useEdit: effectiveIdUser,
                useElim: 0,
            };

            try {
                await saveRendicionInforme(payloadEstadoInforme);
            } catch (estadoError) {
                /* console.warn("⚠️ No se pudo persistir estado EN AUDITORIA:", estadoError?.message); */
            }

            const infKey = String(infoActual.idInf ?? infoActual.idinf ?? infoActual.id ?? "");

            setInformes((prev) => prev.map((it) => {
                const itId = String(it?.idInf ?? it?.idinf ?? it?.id ?? "");
                return itId === infKey
                    ? { ...it, estadoActual: "EN AUDITORIA", estadoactual: "EN AUDITORIA" }
                    : it;
            }));

            window.dispatchEvent(new CustomEvent("auditoria:updated"));
            window.dispatchEvent(new CustomEvent("informe:updated"));

            showToast(`Enviado a auditoría correctamente. ID: ${idAd}`, "success");
            setIsVistaPreviaOpen(false);
        } catch (error) {
            console.error("❌ Error enviando a auditoría:", error);
            showToast(`Error al enviar a auditoría: ${error?.message || "Inténtalo nuevamente"}`, "error");
        }
    };

    const handleOpenVistaPrevia = (dataPreview) => {
        setPreviewData({
            idInf: dataPreview?.idInf,
            titulo: dataPreview?.titulo,
            politica: dataPreview?.politica,
            glosa: dataPreview?.glosa,
            fecha: dataPreview?.fecha ?? dataPreview?.fecCre ?? dataPreview?.feccre ?? "",
            categoria: dataPreview?.categoria ?? "",
            cantidadGastos:
                dataPreview?.cantidadGastos ??
                (Array.isArray(dataPreview?.gastosSeleccionados)
                    ? dataPreview.gastosSeleccionados.length
                    : undefined),
            gastosSeleccionados: Array.isArray(dataPreview?.gastosSeleccionados) ? dataPreview.gastosSeleccionados : [],
            gastosPolitica: Array.isArray(dataPreview?.gastosPolitica) ? dataPreview.gastosPolitica : [],
            gastosPersistidos: Array.isArray(dataPreview?.gastosPersistidos) ? dataPreview.gastosPersistidos : [],
            ruc: dataPreview?.ruc,
        });
        setIsModalInformeOpen(false);
        setIsVistaPreviaOpen(true);
    };

    const handleEditarDesdeVistaPrevia = (updatedSelection) => {
        setPreviewData((prev) => ({
            ...prev,
            gastosSeleccionados: Array.isArray(updatedSelection) ? updatedSelection : prev.gastosSeleccionados,
        }));
        setIsVistaPreviaOpen(false);
        setIsModalInformeOpen(true);
    };

    const handleGuardarDesdeVistaPrevia = async (selectedFinal) => {
        const finalSelection = Array.isArray(selectedFinal)
            ? selectedFinal
            : previewData.gastosSeleccionados;

        await handleSaveInformeConGastos({
            idInf: informeEnEdicion.idInf,
            titulo: informeEnEdicion.titulo,
            politica: informeEnEdicion.politica,
            glosa: informeEnEdicion.glosa,
            gastosSeleccionados: finalSelection,
            gastosPolitica: previewData.gastosPolitica || [],
            gastosYaGuardados: previewData.gastosPersistidos || [],
        });

        setIsVistaPreviaOpen(false);
    };

    const handleOpenModal = () => {
        // 🧹 LIMPIAR TODOS LOS DATOS ANTERIORES
        setInformeEnEdicion({});
        setPreviewData({ gastosSeleccionados: [], gastosPolitica: [], gastosPersistidos: [] });
        setIsModalNewInformeOpen(true);
    };

    const handleVistaPreviaDesdeListado = async (inf) => {
        const idInf = inf?.idInf ?? inf?.idinf ?? inf?.id;
        const titulo = inf?.titulo ?? "";
        const politica = inf?.politica ?? "";
        const glosa = inf?.nota ?? inf?.obs ?? "";
        const estadoActual = inf?.estadoActual ?? "";
        const fecha = inf?.fecCre ?? inf?.feccre ?? inf?.fecha ?? "";
        const categoria = inf?.categoria ?? inf?.Categoria ?? "";
        const cantidadGastos = inf?.cantidadGastos ?? inf?.cantGastos ?? inf?.cantidad ?? undefined;

        const userRaw = localStorage.getItem("user");
        const companyRaw = localStorage.getItem("company");
        const userData = userRaw ? JSON.parse(userRaw) : null;
        const companyData = companyRaw ? JSON.parse(companyRaw) : null;

        let gastosPolitica = [];
        let gastosSeleccionados = [];
        let detallesInforme = [];
        let companyRuc = "";

        try {
            if (userData && companyData) {
                companyRuc = resolveCompanyRuc(companyData);
                const userPrincipal = String(resolveUserId(userData));
                const userAlterno = String(Number(userData?.usecod ?? userData?.id ?? 0));

                // 1️⃣ CARGAR TODOS LOS GASTOS DEL ENDPOINT
                let gastosData = await getListaGastos({
                    id: "1",
                    idrend: "1",
                    user: userPrincipal,
                    ruc: companyRuc,
                });

                if (Array.isArray(gastosData) && gastosData.length === 0 && userAlterno && userAlterno !== userPrincipal) {
                    gastosData = await getListaGastos({
                        id: "1",
                        idrend: "1",
                        user: userAlterno,
                        ruc: companyRuc,
                    });
                }

                /*                 console.log("📥 Gastos cargados del endpoint:", gastosData.length, "gastos");
                 */
                // 2️⃣ CARGAR DETALLES DEL INFORME DESDE LA BD (fuente de verdad)
                let detalleData = [];
                try {
                    detalleData = await getInformeDetalle({
                        idinf: String(idInf),
                        user: userPrincipal,
                        ruc: companyRuc,
                    });

                    if (Array.isArray(detalleData) && detalleData.length === 0 && userAlterno && userAlterno !== userPrincipal) {
                        detalleData = await getInformeDetalle({
                            idinf: String(idInf),
                            user: userAlterno,
                            ruc: companyRuc,
                        });
                    }

                    /*                     console.log("📋 Detalles del informe desde BD:", detalleData.length, "registros");
                     */
                    const idsGastosDisponibles = new Set(
                        (Array.isArray(gastosData) ? gastosData : [])
                            .map((g) => String(g?.idrend ?? g?.idRend ?? g?.id ?? ""))
                            .filter((id) => id !== "")
                    );

                    // Extraer IDs tolerando múltiples nombres de campo del backend
                    // Solo considerar estado S para no mezclar gastos no seleccionados (estado N).
                    const detalleSeleccionado = (Array.isArray(detalleData) ? detalleData : []).filter((d) => {
                        const estado = String(d?.estado ?? d?.Estado ?? "S").trim().toUpperCase();
                        return estado === "S";
                    });

                    gastosSeleccionados = detalleSeleccionado
                        .map((d) => {
                            const candidates = [
                                d?.idrend,
                                d?.idRend,
                                d?.id_rend,
                                d?.idRendicion,
                                d?.idrendicion,
                                d?.id,
                            ]
                                .map((v) => String(v ?? "").trim())
                                .filter((v) => v !== "");

                            if (candidates.length === 0) return "";

                            const inGastos = candidates.find((id) => idsGastosDisponibles.has(id));
                            return inGastos || candidates[0];
                        })
                        .filter((id) => id !== "");

                    gastosSeleccionados = Array.from(new Set(gastosSeleccionados));
                    detallesInforme = detalleSeleccionado;

/*                     console.log("✅ IDs de gastos del informe de BD:", gastosSeleccionados);
 */                } catch (bdError) {
/*                     console.error("❌ No se pudieron cargar detalles de BD:", bdError.message);
 */                    gastosSeleccionados = [];
                }

                // 4️⃣ FILTRAR POR POLÍTICA Y EXCLUIR GASTOS YA USADOS EN OTROS INFORMES
                const usedSet = new Set();
                const gastosSeleccionadosSet = new Set(gastosSeleccionados);

                gastosPolitica = Array.isArray(gastosData)
                    ? gastosData.filter((g) => {
                        const gId = String(g.idrend ?? g.idRend ?? g.id ?? "");
                        const isPoliticaMatch = String(g.politica).toLowerCase() === String(politica).toLowerCase();
                        // Mostrar si: coincide política Y (NO está usado O está en este informe)
                        const isAvailable = isPoliticaMatch && (!usedSet.has(gId) || gastosSeleccionadosSet.has(gId));
                        return isAvailable;
                    })
                    : [];

/*                 console.log(`  Filtrados: política '${politica}' + no usados en otros informes:`, gastosPolitica.length, "gastos");
 */            }
        } catch (error) {
            /* console.error("❌ Error cargando datos para vista previa:", error); */
        }

        setInformeEnEdicion((prev) => ({
            ...prev,
            idInf,
            titulo,
            politica,
            glosa,
            estadoActual,
            fecCre: fecha,
            categoria,
            cantidadGastos,
        }));

        setPreviewData({
            idInf,
            titulo,
            politica,
            glosa,
            fecha,
            categoria,
            cantidadGastos,
            gastosSeleccionados,
            gastosPolitica,
            gastosPersistidos: gastosSeleccionados,
            detalles: detallesInforme,
            ruc: companyRuc,
        });

        setIsVistaPreviaOpen(true);
    };

    const formatDate = (value) => {
        if (!value) return "-";
        const iso = String(value).split("T")[0];
        return iso;
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-50 via-cyan-50/30 to-white p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-5">
                {/* Loading overlay mientras se guarda */}
                {isSaving && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="rounded-lg bg-white p-6 shadow-xl">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"></div>
                                <span className="text-lg font-medium text-gray-700">Guardando informe...</span>
                            </div>
                        </div>
                    </div>
                )}

                <InformeHeader onNewInforme={handleOpenModal} />

                <NewInforme
                    isOpen={isModalNewInformeOpen}
                    onClose={() => {
                        setIsModalNewInformeOpen(false);
                        // 🧹 Limpiar también al cerrar
                        setInformeEnEdicion({});
                        setPreviewData({ gastosSeleccionados: [], gastosPolitica: [], gastosPersistidos: [] });
                    }}
                    onSave={handleSaveNewInforme}
                />

                <ModalInforme
                    isOpen={isModalInformeOpen}
                    onClose={() => {
                        setIsModalInformeOpen(false);
                        setInformeEnEdicion({});
                        setPreviewData({ gastosSeleccionados: [], gastosPolitica: [], gastosPersistidos: [] });
                    }}
                    onSave={handleSaveInformeConGastos}
                    onPreview={handleOpenVistaPrevia}
                    selectedIniciales={previewData.gastosSeleccionados}
                    titulo={informeEnEdicion.titulo}
                    politica={informeEnEdicion.politica}
                    glosa={informeEnEdicion.glosa}
                    idInf={informeEnEdicion.idInf}
                />

                <InformeVistaPrevia
                    isOpen={isVistaPreviaOpen}
                    onClose={() => setIsVistaPreviaOpen(false)}
                    onEditar={handleEditarDesdeVistaPrevia}
                    onGuardar={handleGuardarDesdeVistaPrevia}
                    onEnviarAuditoria={handleEnviarAuditoriaDesdeVistaPrevia}
                    titulo={informeEnEdicion.titulo}
                    fecha={informeEnEdicion.fecCre ?? previewData.fecha ?? informeEnEdicion.nowIso}
                    cantidadGastos={previewData.cantidadGastos}
                    politica={informeEnEdicion.politica}
                    categoria={informeEnEdicion.categoria ?? previewData.categoria}
                    glosa={informeEnEdicion.glosa}
                    gastosPolitica={previewData.gastosPolitica}
                    selectedIniciales={previewData.gastosSeleccionados}
                    idInf={informeEnEdicion.idInf ?? previewData.idInf}
                    estadoActual={informeEnEdicion.estadoActual}
                />

                <InformeStateMessage loading={loading} totalInformes={informes.length} />

                {!loading && informes.length > 0 && (
                    <InformeList
                        informes={informes}
                        onVistaPrevia={handleVistaPreviaDesdeListado}
                        formatDate={formatDate}
                    />
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