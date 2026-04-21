import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

const firstDefined = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }
    return "";
};

const resolveGlosa = (item) => {
    const glosaRaw = String(item?.glosa || "").trim();
    const glosaNormalized = glosaRaw.toUpperCase();
    const isPlaceholder = glosaNormalized === "CREAR GASTO" || glosaNormalized === "CREAR GASTO MOVILIDAD";

    if (glosaRaw && !isPlaceholder) {
        return glosaRaw;
    }

    return String(firstDefined(
        item?.obs,
        item?.nota,
        item?.observacion,
        item?.observaciones,
        ""
    )).trim();
};



/**
 * Obtener lista de gastos (rendición)
 */
export async function getListaGastos({
    id,
    idrend,
    user,
    ruc,
}) {
    const endpoint = "/reporte/rendiciongasto";

    try {
        const params = { id, idrend, user, ruc };

        /*        console.log("========================================");
               console.log("🔍 GET LISTA GASTOS");
               console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
               console.log("📦 Params JSON:", JSON.stringify(params));
               console.log("========================================"); */


        const response = await API.get(endpoint, {
            params,
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json; charset=UTF-8",
                "Cache-Control": "no-cache",
            },
        });

        /* console.log("📊 Status:", response.status); */

        // ✅ VALIDACIÓN
        if (response.status !== 200) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        let data = response.data;

        // 🔁 Si viene como string → parsear
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error("❌ Error parseando JSON:", e);
                throw new Error("Respuesta inválida del servidor");
            }
        }

        // 🧪 DEBUG preview
        /* console.log("📄 Preview:", JSON.stringify(data).slice(0, 500)); */

        // ⚠️ VALIDAR ARRAY
        if (!Array.isArray(data)) {
            throw new Error("La API no devolvió una lista");
        }

        if (data.length === 0) {
            /* console.warn("⚠️ Lista vacía"); */
            return [];
        }

        // ✅ NORMALIZAR DATOS (opcional pero recomendado)
        const gastos = data.map((item, index) => {
            if (index === 0) {
             /*    console.log("========================================");
                console.log("=======================================");
                console.log("🔍 PRIMER GASTO");
                console.log("Campos disponibles:", Object.keys(data[0] || {}));

                console.log("ID:", data[0].idrend);
                console.log("Usuario:", data[0].iduser);
                console.log("Política:", data[0].politica);
                console.log("Ruc Emisor:", data[0].rucEmisor);
                console.log("Ruc Cliente:", data[0].rucCliente);
                console.log("ruc:", data[0].ruc);
                console.log("Categoría:", data[0].categoria);
                console.log("Proveedor:", data[0].proveedor);
                console.log("Total:", data[0].total);
                console.log("IGV:", data[0].igv);
                console.log("Fecha:", data[0].fecha);
                console.log("Estado:", data[0].estadoActual);
                console.log("Obs:", data[0].obs);
                console.log("Glosa:", data[0].glosa);
                console.log("Moneda:", data[0].moneda);
                console.log("Tipo Gasto:", data[0].tipogasto);
                console.log("Placa:", data[0].placa);
                console.log("Motivo Viaje:", firstDefined(
                    data[0].motivoViaje,
                    data[0].MotivoViaje,
                    data[0].motivo_viaje,
                    data[0].viajeMotivo,
                    data[0].motivoviaje,
                ));
                console.log("Tipo Movilidad:", data[0].tipoMovilidad);
                console.log("======================================="); */
            }

            const tipoGastoValue = firstDefined(
                item.tipogasto,
                item.tipoGasto,
                item.tipo_gasto,
                item.nomTipoGasto,
                item.nomtipogasto,
                item.tipoGastoDesc,
                item.descripcionTipoGasto,
                item.tipgas,
                item.tipgast,
            );

            const evidenciaPath = firstDefined(
                item.evidenciaPath,
                item.path,
                item.ruta,
                item.rutaArchivo,
                item.pathArchivo,
                item.evidencia,
                item.urlEvidencia,
                item.urlArchivo,
                item.archivoUrl,
                item.archivo_path,
                item.nomArchivo,
                item.nombreArchivo,
                item.obs,
            );

            const evidenciaFileName = firstDefined(
                item.nombreArchivo,
                item.nomArchivo,
                item.nomarchivo,
                item.nombrearchivo,
                item.fileName,
                item.filename,
            );

            return {
                ...item,
                id: item.id,
                idrend: item.idrend,
                descripcion: item.descripcion,
                total: item.total,
                fecha: item.fecha,
                fechaRegistro: firstDefined(
                    item.fechaRegistro,
                    item.fecRegistro,
                    item.fecregistro,
                    item.fecCre,
                    item.feccre,
                    item.fechaCreacion,
                    item.createdAt,
                ),
                estado: firstDefined(
                    item.estadoActual,
                    item.estadoactual,
                    item.EstadoActual,
                    item.estado,
                    item.nomEstado,
                    item.estadoRend,
                    item.estadorend,
                ),
                igv: item.igv,
                serie: item.serie || item.nroserie || item.serieComprobante || item.serieComprobanteElectronico,
                numero: item.numero || item.nro || item.num || item.nrodoc || item.correlativo,
                politica: firstDefined(item.politica),
                categoria: firstDefined(item.categoria),
                proveedor: firstDefined(item.proveedor),
                centroCosto: firstDefined(
                    item.centroCosto,
                    item.centro_costo,
                    item.consumidor,
                    item.idCuenta,
                    item.idcuenta,
                    item.nomCentroCosto,
                ),
                rucEmisor: firstDefined(
                    item.rucEmisor,
                    item.ruc,
                    item.rucProveedor,
                    item.ruc_emisor,
                ),
                rucCliente: firstDefined(
                    item.rucCliente,
                    item.ruccliente,
                    item.ruc_cliente,
                ),
                tipoComprobante: firstDefined(
                    item.tipoComprobante,
                    item.tipocomprobante,
                    item.tipoCombrobante,
                    item.tipocombrobante,
                    item.tipo_comprobante,
                    item.comprobante,
                    item.tipo,
                    item.nomTipoComprobante,
                    item.nomtipocomprobante,
                    item.nomComprobante,
                    item.nomcomprobante,
                    item.idTipoComprobante,
                    item.idtipocomprobante,
                    item.id_tipo_comprobante,
                    item.tipcom,
                ),
                glosa: resolveGlosa(item),
                moneda: item.moneda,
                tipogasto: String(tipoGastoValue || ""),
                motivoViaje: firstDefined(
                    item.motivoViaje,
                    item.motivo_viaje,
                    item.viajeMotivo,
                    item.motivo,
                    item.MotivoViaje,
                    item.motivoviaje,
                    item.MOTIVOVIAJE,
                ),
                evidenciaPath: String(evidenciaPath || ""),
                evidenciaFileName: String(evidenciaFileName || ""),

            };
        });

        /* console.log(`✅ ${gastos.length} gastos cargados`); */

        return gastos;

    } catch (error) {
        // 🌐 ERROR DEL SERVIDOR
        if (error.response) {
            console.error("🌐 Error HTTP:", error.response.status);

            let message = error.response.statusText;

            const data = error.response.data;

            if (data?.message) message = data.message;
            if (data?.error) message = data.error;

            throw new Error(`Error servidor: ${message}`);
        }

        // ⏱️ TIMEOUT
        if (error.code === "ECONNABORTED") {
            throw new Error("Tiempo de espera agotado");
        }

        // 🔌 SIN RESPUESTA
        if (error.request) {
            throw new Error("No hay conexión con el servidor");
        }

        // 💥 OTROS
        console.error("💥 Error:", error.message);
        throw new Error(error.message);
    }
}
