import API from "../api";

export async function updateDetalleGasto(gastoData) {
    /* console.log("========================================");
    console.log("🚀 API SERVICE - updateDetalleGasto");
    console.log("📍 URL: /saveupdate/updaterendiciongasto");
    console.log("📦 idRend:", gastoData?.idRend);
    console.log("📦 consumidor en payload:", gastoData?.consumidor);
    console.log("========================================"); */

    try {
        const bodyToSend = [gastoData];

     /*    console.log("========================================");
        console.log("📡 BODY JSON ENVIADO AL SERVIDOR:");
        console.log(JSON.stringify(bodyToSend, null, 2));
        console.log("========================================"); */

        const response = await API.post(
            "/saveupdate/updaterendiciongasto",
            bodyToSend,
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 30000,
            }
        );

/*         console.log("========================================");
        console.log("📊 RESPUESTA - updaterendiciongasto");
        console.log("   Status:", response.status);
        console.log("   Body:", response.data);
        console.log("========================================"); */

        if (response.status === 200 || response.status === 201) {
            const body = JSON.stringify(response.data);

            if (body.includes("Error") || body.includes("error")) {
                console.error("❌ Error en respuesta del servidor:", body);
                throw new Error("Error del servidor: " + body);
            }

            /* console.log("✅ Gasto actualizado exitosamente"); */
            return true;
        }

        console.error("❌ Error del servidor:", response.status);
        throw new Error(`Error del servidor: ${response.status} - ${JSON.stringify(response.data)}`);
    } catch (error) {
        if (error.code === "ECONNABORTED") {
            throw new Error("⏱️ Timeout: el servidor tardó demasiado");
        }

        if (error.message.includes("Network Error")) {
            throw new Error("🔌 Sin conexión al servidor");
        }

        if (error.response) {
            console.error("❌ Error backend:", error.response.data);
            throw new Error(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }

        console.error("💥 Error no manejado:", error);
        throw new Error("Error inesperado al actualizar gasto: " + error.message);
    }
}
