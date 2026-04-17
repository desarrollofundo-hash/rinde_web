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

function extractIdRendFromData(data) {
    if (data === null || data === undefined) return null;

    if (Array.isArray(data)) {
        for (const item of data) {
            const fromItem = extractIdRendFromData(item);
            if (fromItem) return fromItem;
        }
        return null;
    }

    const directNumber = parsePositiveNumber(data);
    if (directNumber) return directNumber;

    if (typeof data !== "object") return null;

    const directKeys = [
        "idRend",
        "idrend",
        "id_rend",
        "idRendicion",
        "idrendicion",
        "idrend_gasto",
        "id",
    ];

    for (const key of directKeys) {
        const parsed = parsePositiveNumber(data?.[key]);
        if (parsed) return parsed;
    }

    const nestedKeys = ["data", "result", "response", "payload", "value", "record", "item"];
    for (const key of nestedKeys) {
        const fromNested = extractIdRendFromData(data?.[key]);
        if (fromNested) return fromNested;
    }

    return null;
}

function extractIdRendFromHeaders(headers = {}) {
    const headerCandidates = [
        headers?.["x-return-id"],
        headers?.["x-id"],
        headers?.["x-idrend"],
        headers?.["x-generated-id"],
        headers?.["x-inserted-id"],
    ];

    for (const candidate of headerCandidates) {
        const parsed = parsePositiveNumber(candidate);
        if (parsed) return parsed;
    }

    return null;
}

export async function saveRendicionGasto(facturaData) {
/*     console.log("🚀 Guardando gasto...");
    console.log("📦 Payload:", facturaData);
 */
    try {
        // 🔥 AQUÍ ESTÁ LA SOLUCIÓN
        const bodyToSend = [facturaData];

        /* console.log("📡 BODY ENVIADO:", JSON.stringify(bodyToSend, null, 2)); */

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
/* 
        console.log("📊 Response:", data);
        console.log("📊 Response JSON:", JSON.stringify(data, null, 2)); */

        // 🔴 Backend raro (defensa)
        if (typeof data === "string") {
            if (data.toLowerCase().includes("error")) {
                throw new Error(data);
            }

            if (data.trim() === "UPSERT realizado correctamente.") {
                throw new Error("No se devolvió el ID");
            }
        }

        let idRend = extractIdRendFromData(data);
        if (!idRend) {
            idRend = extractIdRendFromHeaders(response.headers);
        }

        if (!idRend) {
            throw new Error(`No se pudo obtener idRend. Response: ${JSON.stringify(data)}`);
        }

        /* console.log("🆔 ID:", idRend); */

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