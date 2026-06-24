import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_QA_BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// interceptor
API.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }

    return config;
});

// Interceptor para capturar errores
API.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("Error en la solicitud HTTPS:", error);
        return Promise.reject(error);
    }
);

// Interceptor para registrar detalles adicionales de errores
API.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("Detalles del error:", error.toJSON());
        return Promise.reject(error);
    }
);

export default API;