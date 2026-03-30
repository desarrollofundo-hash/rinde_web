import API from "./api"; // 👈 usa tu instancia

export const getDropdownOptionsTipoMovilidad = async () => {
    try {
        const response = await API.get("/maestros/rendicion_movilidad");

        const data = response.data
            .filter(item => item.estado?.toLowerCase() === "s")
            .map(item => ({
                id: String(item.id),
                name: item.movilidad,
            }));

        return data;

    } catch (error) {
        console.error("❌ Error tipos movilidad:", error);
        return [];
    }
};