import API from "./api";

export const GetCompany = async (userIdentifier) => {
   /*  console.log("🚀 Obteniendo empresas...");
    console.log("👤 User Identifier:", userIdentifier); */

    try {
        const response = await API.get("/reporte/usuarioconsumidor", {
            params: {
                id: userIdentifier,
                iduser: userIdentifier,
                usuario: userIdentifier,
            },
        });

      /*   console.log("📊 Status:", response.status);
        console.log("📄 Data:", response.data); */

        const data = response.data;

        // ✅ Validación segura
        if (!Array.isArray(data)) {
            return [];
        }

        return data;

    } catch (error) {
        /* console.error("❌ Error al obtener empresas:", error); */

        if (!error.response) {
            throw new Error("Sin conexión al servidor");
        }

        throw new Error("Error al obtener empresas");
    }
};