import API from "./api";

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function getAxiosErrorMessage(error) {
    if (error?.response?.data) {
        if (typeof error.response.data === "string") return error.response.data;
        try {
            return JSON.stringify(error.response.data);
        } catch {
            return String(error.response.data);
        }
    }

    return error?.message || "Error desconocido";
}

function getPeruIsoString(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false,
    });

    const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
        if (part.type !== "literal") {
            accumulator[part.type] = part.value;
        }
        return accumulator;
    }, {});

    const fractionalSeconds = String(parts.fractionalSecond || "000").padEnd(3, "0").slice(0, 3);
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${fractionalSeconds}-05:00`;
}

function sanitizeFileSegment(value, fallback = "") {
    const cleaned = String(value ?? "")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "");

    return cleaned || fallback;
}

function resolveFileExtension(file) {
    const rawName = String(file?.name || "").trim();
    if (rawName.includes(".")) {
        const fromName = rawName.split(".").pop();
        if (fromName) return `.${String(fromName).toLowerCase()}`;
    }

    const mimeType = String(file?.type || "").toLowerCase();
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/webp") return ".webp";
    if (mimeType === "application/pdf") return ".pdf";

    return ".jpg";
}

function buildEvidenceFileName({ idRend, ruc, serie, numero, file }) {
    const extension = resolveFileExtension(file);
    return `${sanitizeFileSegment(idRend, "0")}_${sanitizeFileSegment(ruc)}_${sanitizeFileSegment(serie)}_${sanitizeFileSegment(numero)}${extension}`;
}

export async function saveEvidenciaGasto({ idRend, file, gastoData = {} }) {
    if (!idRend) {
        throw new Error("idRend es requerido para guardar evidencia");
    }

    if (!file) {
        throw new Error("Archivo de evidencia requerido");
    }

    const base64 = await fileToBase64(file);
    const rawUser = localStorage.getItem("user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    const userId = String(user?.id ?? user?.usecod ?? user?.iduser ?? 0);

    let uploadLocalPath = "";
    let uploadLocalResolvedFileName = "";
    const uploadLocalFileName = buildEvidenceFileName({
        idRend,
        ruc: gastoData?.ruc,
        serie: gastoData?.serie,
        numero: gastoData?.numero,
        file,
    });

    try {
        const uploadLocalResponse = await API.post(
            "/recibir/uploadlocal",
            {
                fileName: uploadLocalFileName,
                base64,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 60000,
            }
        );

        const uploadData = uploadLocalResponse?.data || {};
        const resolvedPath = String(
            uploadData?.path ||
            uploadData?.fullPath ||
            uploadData?.ruta ||
            uploadData?.rutaArchivo ||
            uploadData?.archivo ||
            ""
        );
        const resolvedFileName = String(
            uploadData?.fileName ||
            uploadData?.filename ||
            uploadData?.nombreArchivo ||
            uploadData?.nomArchivo ||
            uploadData?.nombrearchivo ||
            uploadData?.nomarchivo ||
            uploadData?.archivo ||
            ""
        ).trim();

        if ((uploadLocalResponse.status === 200 || uploadLocalResponse.status === 201)
            && uploadData?.success === true
            && resolvedPath) {
            uploadLocalPath = resolvedPath;
            uploadLocalResolvedFileName = resolvedFileName;
            /* console.log("✅ Archivo guardado en uploadlocal:", uploadLocalPath); */
        } else {
           /*  console.warn("⚠️ uploadlocal respondió sin path exitoso:", uploadLocalResponse?.data); */
        }
    } catch (uploadLocalError) {
       /*  console.warn("⚠️ No se pudo subir a /recibir/uploadlocal, continuando con guardado de evidencia:", getAxiosErrorMessage(uploadLocalError)); */
    }

    if (!uploadLocalPath) {
        throw new Error("No se obtuvo ruta para la evidencia");
    }

    const pathFileName = String(uploadLocalPath).split(/[\\/]/).pop() || "";
    // Mantener el nombre solicitado como fuente de verdad (igual que en Flutter).
    const finalFileName = String(uploadLocalFileName || uploadLocalResolvedFileName || pathFileName || "evidencia").trim();

    const evidenceNowIso = getPeruIsoString();

    const payloadTry1 = [
        {
            rendicion: String(idRend),
            idRend: Number(idRend),
            idrend: Number(idRend),
            evidencia: "",
            obs: uploadLocalPath,
            estado: "S",
            fecCre: evidenceNowIso,
            useReg: Number.parseInt(String(userId), 10) || 0,
            hostname: "WEB",
            fecEdit: evidenceNowIso,
            useEdit: Number.parseInt(String(userId), 10) || 0,
            useElim: 0,
            archivo: finalFileName,
            fileName: finalFileName,
            filename: finalFileName,
            nombreArchivo: finalFileName,
            nombrearchivo: finalFileName,
            nomArchivo: finalFileName,
            nomarchivo: finalFileName,
            path: uploadLocalPath,
            ruta: uploadLocalPath,
            rutaArchivo: uploadLocalPath,
            pathArchivo: uploadLocalPath,
            evidenciaPath: uploadLocalPath,
        },
    ];

    const payloadTry2 = [
        {
            rendicion: {
                idRend: String(idRend),
                idrend: String(idRend),
            },
            idRend: Number(idRend),
            evidencia: "",
            obs: uploadLocalPath,
            estado: "S",
            fecCre: evidenceNowIso,
            useReg: Number.parseInt(String(userId), 10) || 0,
            hostname: "WEB",
            fecEdit: evidenceNowIso,
            useEdit: Number.parseInt(String(userId), 10) || 0,
            useElim: 0,
            archivo: finalFileName,
            fileName: finalFileName,
            filename: finalFileName,
            nombreArchivo: finalFileName,
            nombrearchivo: finalFileName,
            nomArchivo: finalFileName,
            nomarchivo: finalFileName,
            path: uploadLocalPath,
            ruta: uploadLocalPath,
            rutaArchivo: uploadLocalPath,
            pathArchivo: uploadLocalPath,
            evidenciaPath: uploadLocalPath,
        },
    ];

    try {
        /*  console.log("📎 Payload evidencia listo", {
             idRend: String(idRend),
             nombreArchivo: finalFileName,
             tipoArchivo: String(file.type || "application/octet-stream"),
             tamanioKb: Math.round((Number(file.size) || 0) / 1024),
         }); */

        let response;
        try {
            response = await API.post("/saveupdate/saverendiciongastoevidencia", payloadTry1, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 60000,
            });
        } catch {
            console.warn("⚠️ Primer formato de evidencia falló, probando formato alterno de rendicion");
            response = await API.post("/saveupdate/saverendiciongastoevidencia", payloadTry2, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 60000,
            });
        }

        if (response.status !== 200 && response.status !== 201) {
            throw new Error(`Error al guardar evidencia: ${response.status}`);
        }

        return {
            ok: true,
            path: uploadLocalPath || null,
            fileName: finalFileName,
        };
    } catch (error) {
        const backendMessage = getAxiosErrorMessage(error);
        const sizeKb = Math.round((Number(file.size) || 0) / 1024);
        throw new Error(`No se pudo actualizar la evidencia (${sizeKb} KB). Detalle: ${backendMessage}`);
    }
}
