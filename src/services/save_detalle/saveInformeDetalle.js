import API from "../api";

export async function saveRendicionInformeDetalle(informeDetalleData) {
    /* console.log("🚀 Guardando detalle de informe de rendición...");
    console.log("📍 URL: /saveupdate/saverendicioninforme_detalle");
    console.log("📦 Payload detalle informe:", informeDetalleData); */

    try {
        const bodyToSend = Array.isArray(informeDetalleData)
            ? informeDetalleData
            : [informeDetalleData];

        const response = await API.post(
            "/saveupdate/saverendicioninforme_detalle",
            bodyToSend,
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 30000,
            }
        );

        const data = response.data;

        /* console.log("📊 Respuesta guardar detalle informe - Status:", response.status);
        console.log("📄 Response body:", data); */

        if (response.status !== 200 && response.status !== 201) {
            throw new Error(`Error del servidor: ${response.status} - ${JSON.stringify(data)}`);
        }

        const dataAsText = typeof data === "string" ? data : JSON.stringify(data);
        if (dataAsText.includes("Error") || dataAsText.includes("error")) {
            throw new Error(`Error del servidor: ${dataAsText}`);
        }

        /* console.log("✅ Detalle de informe de rendición guardado exitosamente"); */
        return true;
    } catch (error) {
        if (error.code === "ECONNABORTED") {
            throw new Error("⏱️ Timeout: el servidor tardó demasiado");
        }

        if (error.message?.includes("Network Error")) {
            throw new Error("🔌 Sin conexión al servidor. Verifica tu conexión a internet.");
        }

        if (error.response) {
            console.error("❌ Error backend detalle informe:", error.response.data);
            throw new Error(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }

        console.error("💥 Error no manejado al guardar detalle informe:", error);
        throw new Error(`Error inesperado al guardar detalle informe: ${error.message}`);
    }
}
