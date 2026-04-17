import API from "./api";
// 🔐 GET ROL USUARIOS
//obtener el rol de un usuario específico.

export const GetRolUsuario = async ({
    iduser,
    idapp
}) => {
    /* console.log("🚀 Iniciando autenticación...");
    console.log("👤 IdUser:", iduser);
    console.log("📱 IdApp:", idapp); */

    try {
        const response = await API.get("login/rol_usuario_app", {
            params: {
                iduser,
                idapp
            },
        });
/* 
        console.log("📡 Respuesta recibida");
        console.log("📊 Status:", response.status); */

        if (response.status === 200) {
            const data = response.data;

            if (!data || (Array.isArray(data) && data.length === 0)) {
                throw new Error("usuario o rol no encontrada");
            }

            /* console.log("✅ Rol de usuario obtenido"); */
            return Array.isArray(data) ? data : [data];
        } else {
            throw new Error(`Error del servidor: ${response.status}`);
        }
    } catch (error) {
        console.error("❌ Error en cargar compañias:", error);

        // Manejo parecido a Flutter
        if (error.code === "ECONNABORTED") {
            throw new Error("Tiempo de espera agotado");
        }

        if (!error.response) {
            throw new Error("Sin conexión al servidor");
        }

        throw new Error(
            error.response?.data?.message || "Error en cargar compañias"
        );
    }
};
