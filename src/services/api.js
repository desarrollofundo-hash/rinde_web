import axios from "axios";

const API = axios.create({
    /* baseURL: import.meta.env.VITE_PROD_BASE_URL, */
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

export default API;