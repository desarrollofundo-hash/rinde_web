import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

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

        console.log("========================================");
        console.log("🔍 GET LISTA GASTOS");
        console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
        console.log("📦 Params JSON:", JSON.stringify(params));
        console.log("========================================");

        const response = await API.get(endpoint, {
            params,
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json; charset=UTF-8",
                "Cache-Control": "no-cache",
            },
        });

        console.log("📊 Status:", response.status);

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
        const preview = JSON.stringify(data).slice(0, 500);
        console.log("📄 Preview:", preview);

        // ⚠️ VALIDAR ARRAY
        if (!Array.isArray(data)) {
            throw new Error("La API no devolvió una lista");
        }

        if (data.length === 0) {
            console.warn("⚠️ Lista vacía");
            return [];
        }

        // ✅ NORMALIZAR DATOS (opcional pero recomendado)
        const gastos = data.map((item, index) => {
            if (index === 0) {
                console.log("========================================");
                console.log("=======================================");
                console.log("🔍 PRIMER GASTO");

                console.log("ID:", data[0].idrend);
                console.log("Usuario:", data[0].iduser);
                console.log("Política:", data[0].politica);
                console.log("Categoría:", data[0].categoria);
                console.log("Proveedor:", data[0].proveedor);
                console.log("Total:", data[0].total);
                console.log("IGV:", data[0].igv);
                console.log("Fecha:", data[0].fecha);
                console.log("Estado:", data[0].estadoActual);
                console.log("Glosa:", data[0].glosa);
                console.log("Moneda:", data[0].moneda);
                console.log("=======================================");
            }

            return {
                id: item.id,
                idrend: item.idrend,
                descripcion: item.descripcion,
                total: item.total,
                fecha: item.fecha,
                estado: item.estadoActual,
                igv: item.igv,
                serie: item.serie || item.nroserie || item.serieComprobante,
                numero: item.numero || item.nro || item.num || item.nrodoc,
                politica: item.politica,
                categoria: item.categoria,
                proveedor: item.proveedor,
                /* glosa: item.glosa,*/
                moneda: item.moneda,

                // ...item // si quieres mantener todos los campos originales
                // agrega más campos si necesitas
            };
        });

        console.log(`✅ ${gastos.length} gastos cargados`);

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
