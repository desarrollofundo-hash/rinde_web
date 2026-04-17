import API from "../api";

function parsePositiveNumber(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    if (typeof value === "string") {
        const normalized = value.trim();
        if (!normalized) return null;
        const numberValue = Number(normalized);
        return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
    }

    return null;
}

function extractIdInfFromData(data) {
    if (data === null || data === undefined) return null;

    if (Array.isArray(data)) {
        for (const item of data) {
            const fromItem = extractIdInfFromData(item);
            if (fromItem) return fromItem;
        }
        return null;
    }

    const directNumber = parsePositiveNumber(data);
    if (directNumber) return directNumber;

    if (typeof data !== "object") return null;

    const directKeys = [
        "idInf",
        "idinf",
        "id_informe",
        "idInforme",
        "id",
    ];

    for (const key of directKeys) {
        const parsed = parsePositiveNumber(data?.[key]);
        if (parsed) return parsed;
    }

    const nestedKeys = ["data", "result", "response", "payload", "value", "record", "item"];
    for (const key of nestedKeys) {
        const fromNested = extractIdInfFromData(data?.[key]);
        if (fromNested) return fromNested;
    }

    return null;
}

function extractIdInfFromHeaders(headers = {}) {
    const headerCandidates = [
        headers?.["x-return-id"],
        headers?.["x-id"],
        headers?.["x-idinf"],
        headers?.["x-generated-id"],
        headers?.["x-inserted-id"],
    ];

    for (const candidate of headerCandidates) {
        const parsed = parsePositiveNumber(candidate);
        if (parsed) return parsed;
    }

    return null;
}

export async function saveRendicionInforme(informeData) {
    /* console.log("🚀 Guardando informe de rendición...");
    console.log("📍 URL: /saveupdate/saverendicioninforme?returnId=true");
    console.log("📦 Payload cabecera informe:", informeData);
    console.log("📦 Payload como array:", JSON.stringify([informeData], null, 2)); */

    try {
        const bodyToSend = [informeData];

        const response = await API.post(
            "/saveupdate/saverendicioninforme?returnId=true",
            bodyToSend,
            {
                headers: {
                    "X-Return-Format": "json",
                    "X-Return-Id": "true",
                },
                timeout: 30000,
            }
        );

        const data = response.data;

    /*     console.log("📊 Respuesta guardar informe - Status:", response.status);
        console.log("📄 Response body:", data);
        console.log("📄 Response body (JSON):", JSON.stringify(data, null, 2));
        console.log("📄 Response headers:", JSON.stringify(response.headers, null, 2)); */

        if (response.status !== 200 && response.status !== 201) {
            throw new Error(`Error del servidor: ${response.status} - ${JSON.stringify(data)}`);
        }

        const dataAsText = typeof data === "string" ? data : JSON.stringify(data);
        if (dataAsText.includes("Error") || dataAsText.includes("error")) {
            throw new Error(`Error del servidor: ${dataAsText}`);
        }

        if (typeof data === "string" && data.trim() === "UPSERT realizado correctamente.") {
            throw new Error(
                "El servidor guardó el informe pero no devolvió el idInf generado. " +
                "El backend debe devolver JSON con el campo idInf o id."
            );
        }

        let idInf = extractIdInfFromData(data);
        /* console.log("🔍 idInf extraído de data:", idInf); */

        if (!idInf) {
            idInf = extractIdInfFromHeaders(response.headers);
            /* console.log("🔍 idInf extraído de headers:", idInf); */
        }

        if (!idInf) {
            console.error("❌ CRÍTICO: No se pudo extraer idInf de ningún lugar");
            console.error("   - Data:", data);
            console.error("   - Headers:", response.headers);
            throw new Error(`No se pudo obtener idInf. Response: ${JSON.stringify(data)}`);
        }

        /* console.log("🆔 idInf obtenido:", idInf); */
        return idInf;
    } catch (error) {
        if (error.code === "ECONNABORTED") {
            throw new Error("⏱️ Timeout: el servidor tardó demasiado");
        }

        if (error.message?.includes("Network Error")) {
            throw new Error("🔌 Sin conexión al servidor. Verifica tu conexión a internet.");
        }

        if (error.response) {
            console.error("❌ Error backend informe:", error.response.data);
            throw new Error(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }

        console.error("💥 Error no manejado al guardar informe:", error);
        throw error;
    }
}
