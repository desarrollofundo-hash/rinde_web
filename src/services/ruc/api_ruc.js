import axios from "axios";
const baseUrlApi = "https://apiperu.dev";

// 🔧 instancia axios (como tu client en Flutter)
const API = axios.create({
    baseURL: baseUrlApi,
    timeout: 15000, // equivalente a timeout
});

export async function getApiRuc({ ruc }) {
    try {
        // 🔍 Diagnóstico (equivalente básico en web)
        if (!navigator.onLine) {
            throw new Error("❌ Sin conexión a internet");
        }

        const url = `/api/ruc/${ruc}`;

       /*  console.log("📡 Realizando petición HTTP GET...");
        console.log("🌍 URL final:", `${baseUrlApi}${url}`);
 */
        // 🚀 Petición GET
        const response = await API.get(url, {
            headers: {
                Authorization:
                    "Bearer a22c04e4b06e3244195120f8f0d20b7be66de8688ced6124f89d9f63dae98ddc",
                Accept: "application/json",
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
            },
        });
/* 
        console.log("📊 Status:", response.status);
        console.log("📦 Headers:", response.headers); */

        if (response.status === 200) {
            /* console.log("✅ Status 200 - Procesando JSON..."); */

            const jsonData = response.data;

            if (!jsonData) {
                throw new Error("⚠️ Respuesta vacía del servidor");
            }

            // preview (como en Flutter)
            try {
                const raw = JSON.stringify(jsonData);
                const preview =
                    raw.length > 2000 ? raw.substring(0, 2000) + "... [truncated]" : raw;
                /* console.log("📄 Preview:", preview); */
            } catch (e) {
                /* console.log("⚠️ No se pudo imprimir preview:", e); */
            }

            // validar estructura
            if (jsonData.success === true && jsonData.data) {
                return jsonData.data; // 👈 equivalente a ApiRuc.fromJson
            } else {
                throw new Error("⚠️ La respuesta no contiene datos válidos");
            }
        } else {
            throw new Error(`Error del servidor: ${response.status}`);
        }
    } catch (error) {
        console.error("❌ Error consultando RUC:", error);

        // 🔥 manejo de errores tipo Flutter
        if (error.response) {
            const status = error.response.status;
            let serverMessage = "";

            try {
                const data = error.response.data;

                if (data?.message) serverMessage = data.message;
                else if (data?.error) serverMessage = data.error;
                else if (typeof data === "string") serverMessage = data;
            } catch (e) {
                console.error("❌ Error procesando respuesta del servidor:", e);
            }

            const rawBody = JSON.stringify(error.response.data || "");
            const preview =
                rawBody.length > 800
                    ? rawBody.substring(0, 800) + "... [truncated]"
                    : rawBody;

            throw new Error(
                `Error del servidor (${status}): ${serverMessage || error.message
                }. BodyPreview: ${preview}`
            );
        }

        // error de red
        if (error.message === "Network Error") {
            throw new Error(
                "Sin conexión al servidor. Verifica tu internet o el servidor."
            );
        }

        throw error;
    }
}