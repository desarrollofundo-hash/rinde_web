import API from "./api";

export const getDropdownOptionsCategoria = async ({ politica = "todos" } = {}) => {
    try {
        const url = `maestros/rendicion_categoria?politica=${encodeURIComponent(politica)}`;
        const response = await API.get(url);

        if (!response.data || !Array.isArray(response.data)) {
            /* console.error("La respuesta de la API de categorías no es un array:", response.data); */
            return [];
        }

        // Transforma los datos para que coincidan con lo que espera el frontend
        const transformedData = response.data.map(item => ({
            id: item.id,
            name: item.categoria, // Mapea 'categoria' a 'name'
            politica: item.politica,
            estado: item.estado,
        }));

        return transformedData;

    } catch (error) {
        /* console.error("Error fetching categoria dropdown options:", error); */
        throw new Error("No se pudieron cargar las categorías");
    }
};