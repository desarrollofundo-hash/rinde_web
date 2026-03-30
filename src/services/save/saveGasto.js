import API from "../api";

export async function saveRendicionGasto(facturaData) {
    console.log("🚀 Guardando gasto...");
    console.log("📦 Payload:", facturaData);

    try {
        // 🔥 AQUÍ ESTÁ LA SOLUCIÓN
        const bodyToSend = [facturaData];

        console.log("📡 BODY ENVIADO:", JSON.stringify(bodyToSend, null, 2));

        const response = await API.post(
            "/saveupdate/saverendiciongasto?returnId=true",
            bodyToSend, // 👈 YA NO facturaData
            {
                headers: {
                    "X-Return-Format": "json",
                    "X-Return-Id": "true",
                },
            }
        );
        const data = response.data;

        console.log("📊 Response:", data);

        // 🔴 Backend raro (defensa)
        if (typeof data === "string") {
            if (data.toLowerCase().includes("error")) {
                throw new Error(data);
            }

            if (data.trim() === "UPSERT realizado correctamente.") {
                throw new Error("No se devolvió el ID");
            }
        }

        let idRend = null;

        if (Array.isArray(data)) {
            idRend = data[0]?.idRend || data[0]?.id || data[0]?.idrend;
        } else if (typeof data === "object") {
            idRend = data?.idRend || data?.id || data?.idrend;
        } else if (typeof data === "number") {
            idRend = data;
        }

        if (!idRend) {
            throw new Error("No se pudo obtener idRend");
        }

        console.log("🆔 ID:", idRend);

        return idRend;

    } catch (error) {
        console.error("❌ Error guardando gasto:");

        if (error.response) {
            console.error("📄 Response:", error.response.data);
            throw new Error(
                `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`
            );
        }

        if (error.request) {
            console.error("📡 Sin respuesta del servidor");
            throw new Error("No hay respuesta del servidor");
        }

        console.error("⚠️ Error:", error.message);
        throw error;
    }
}