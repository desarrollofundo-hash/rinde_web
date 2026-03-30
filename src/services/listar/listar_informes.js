import API from "../api";

export async function getListaInformes({
    id,
    idrend,
    user,
    ruc,
}) {
    const endpoint = "/reporte/rendicioninforme";

    try {
        const params = { id, idrend, user, ruc };

        console.log("========================================");
        console.log("📄 GET LISTA INFORMES");
        console.log(`📍 URL: ${API.defaults.baseURL}${endpoint}`);
        console.log("📦 Params:", params);
        console.log("========================================");

        const response = await API.get(endpoint, {
            params,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });

        const data = response.data;

        if (!Array.isArray(data)) {
            throw new Error("La API no devolvió una lista");
        }

        if (data.length === 0) {
            console.warn("⚠️ Lista vacía");
            return [];
        }

        console.log("🧾 CAMPOS:", Object.keys(data[0]));

        return data;

    } catch (error) {
        console.error("❌ Error informes:", error);
        throw error;
    }
}