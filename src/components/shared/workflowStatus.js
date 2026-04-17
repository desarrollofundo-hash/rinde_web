const RAW_STAGE_FIELDS = [
    "estadoActual",
    "estadoactual",
    "EstadoActual",
    "statusActual",
    "status",
];

const isNilOrEmpty = (value) =>
    value === undefined || value === null || String(value).trim() === "";

const normalizeText = (value) =>
    String(value ?? "")
        .trim()
        .toUpperCase()
        .replaceAll("_", " ");

const looksLikeActivityFlag = (value) => {
    const normalized = normalizeText(value);
    return normalized === "S" || normalized === "N";
};

export const normalizeWorkflowStatus = (rawStatus, fallback = "PENDIENTE") => {
    const value = normalizeText(rawStatus);

    if (!value) return normalizeText(fallback);
    if (value.includes("DESAPROB") || value.includes("RECHAZ")) return "RECHAZADO";
    if (value.includes("APROB")) return "APROBADO";
    if (value.includes("REVISION")) return "EN REVISION";
    if (value.includes("AUDITORIA")) return "EN AUDITORIA";
    if (value.includes("INFORME")) return "EN INFORME";
    if (value.includes("BORRADOR")) return "BORRADOR";
    if (value.includes("PENDIENT")) return "PENDIENTE";

    return value;
};

export const resolveWorkflowStatus = (item, fallback = "PENDIENTE") => {
    if (!item || typeof item !== "object") {
        return normalizeWorkflowStatus("", fallback);
    }

    for (const field of RAW_STAGE_FIELDS) {
        const value = item?.[field];
        if (!isNilOrEmpty(value)) {
            return normalizeWorkflowStatus(value, fallback);
        }
    }

    const estado = item?.estado;
    if (!isNilOrEmpty(estado) && !looksLikeActivityFlag(estado)) {
        return normalizeWorkflowStatus(estado, fallback);
    }

    return normalizeWorkflowStatus("", fallback);
};

export const resolveExpenseStatus = (item, fallback = "BORRADOR") =>
    resolveWorkflowStatus(item, fallback);

export const getWorkflowStatusBadgeClass = (status, includeBorder = false) => {
    const value = normalizeWorkflowStatus(status);

    let base = "bg-slate-100 text-slate-700";
    if (value === "BORRADOR") base = "bg-slate-200 text-slate-700";
    if (value === "EN INFORME") base = "bg-amber-100 text-amber-800";
    if (value === "EN AUDITORIA") base = "bg-blue-100 text-blue-700";
    if (value === "EN REVISION") base = "bg-orange-100 text-orange-700";
    if (value === "APROBADO") base = "bg-emerald-100 text-emerald-800";
    if (value === "RECHAZADO") base = "bg-red-100 text-red-700";

    if (!includeBorder) return base;

    const borderByStatus = {
        BORRADOR: "border border-slate-300",
        "EN INFORME": "border border-amber-200",
        "EN AUDITORIA": "border border-blue-200",
        "EN REVISION": "border border-orange-200",
        APROBADO: "border border-emerald-200",
        RECHAZADO: "border border-red-200",
    };

    return `${base} ${borderByStatus[value] ?? "border border-slate-200"}`;
};

export const getWorkflowStatusLabel = (status, fallback = "PENDIENTE") =>
    normalizeWorkflowStatus(status, fallback);
