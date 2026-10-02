import API from "../api";

// Solo extensiones que un <img> puede renderizar: adivinar ".pdf" generaba una
// petición extra por gasto que el visor descarta igual por MIME.
const COMMON_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const IMAGE_EXTENSION_REGEX = /\.(png|jpg|jpeg|webp|pdf)$/i;
const SUCCESS_CACHE_TTL_MS = 5 * 60 * 1000;
// Los 404 de evidencias inexistentes se recuerdan durante toda la sesión del
// navegador: sin esto, cada paginado o reapertura del listado vuelve a probar
// todos los nombres candidatos y llena la consola de errores de red.
const MISS_CACHE_TTL_MS = 30 * 60 * 1000;
const MISS_CACHE_STORAGE_KEY = "evidencia.missCache";
const SAVE_OVERRIDES_STORAGE_KEY = "evidencia.saveOverrides";
const successCache = new Map();
const missCache = loadMissCache();
const inflightRequests = new Map();
let bypassBrowserCacheUntil = 0;
// Mapa idRend → { evidenciaPath, evidenciaFileName } para el archivo recién subido.
// Persiste en sessionStorage para sobrevivir recargas de página.
const recentSaveOverrides = loadSaveOverrides();

function loadMissCache() {
    try {
        const raw = sessionStorage.getItem(MISS_CACHE_STORAGE_KEY);
        if (!raw) return new Map();

        const now = Date.now();
        const entries = Object.entries(JSON.parse(raw)).filter(
            ([, value]) => now - Number(value?.cachedAt || 0) < MISS_CACHE_TTL_MS
        );

        return new Map(entries);
    } catch {
        // sessionStorage puede fallar en modo privado o estar corrupto.
        return new Map();
    }
}

function loadSaveOverrides() {
    try {
        const raw = sessionStorage.getItem(SAVE_OVERRIDES_STORAGE_KEY);
        if (!raw) return new Map();
        return new Map(Object.entries(JSON.parse(raw)));
    } catch {
        return new Map();
    }
}

function persistSaveOverrides() {
    try {
        sessionStorage.setItem(SAVE_OVERRIDES_STORAGE_KEY, JSON.stringify(Object.fromEntries(recentSaveOverrides)));
    } catch { /* noop */ }
}

function persistMissCache() {
    try {
        sessionStorage.setItem(
            MISS_CACHE_STORAGE_KEY,
            JSON.stringify(Object.fromEntries(missCache))
        );
    } catch {
        // Sin persistencia el cache sigue funcionando en memoria.
    }
}

function rememberMiss(target) {
    missCache.set(target, { cachedAt: Date.now() });
    persistMissCache();
}

function firstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }
    return "";
}

function sanitizeCandidate(value) {
    return String(value ?? "").trim();
}

function sanitizeFileSegment(value) {
    return String(value ?? "")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "");
}

function getApiBaseUrl() {
    return String(import.meta.env.VITE_QA_BASE_URL || import.meta.env.VITE_PROD_BASE_URL || "").replace(/\/+$/, "");
}

function hasSupportedRemotePrefix(value) {
    return /^data:image/i.test(value) || /^https?:\/\//i.test(value) || /^blob:/i.test(value);
}

function pushUnique(values, nextValue) {
    const candidate = sanitizeCandidate(nextValue);
    if (!candidate) return;
    if (!values.includes(candidate)) {
        values.push(candidate);
    }
}

function buildRemoteCandidates(rawValue, apiBase, querySuffix, { allowExtensionGuess = true } = {}) {
    const values = [];
    const raw = sanitizeCandidate(rawValue);

    if (!raw) {
        return values;
    }

    if (hasSupportedRemotePrefix(raw)) {
        pushUnique(values, raw);
        return values;
    }

    if (!apiBase) {
        pushUnique(values, raw);
        return values;
    }

    const normalized = raw.replace(/^\/+/, "");
    const fileName = normalized.split(/[\\/]/).pop() || normalized;
    const encodedRaw = encodeURIComponent(normalized);
    const encodedFileName = encodeURIComponent(fileName);

    pushUnique(values, `${apiBase}/recibir/getimage/${encodedRaw}${querySuffix}`);
    pushUnique(values, `${apiBase}/recibir/getimage/${encodedFileName}${querySuffix}`);

    const fileNameWithoutQuery = fileName.split("?")[0];
    const hasExtension = /\.[a-z0-9]{1,5}$/i.test(fileNameWithoutQuery);

    if (!hasExtension && allowExtensionGuess) {
        for (const extension of COMMON_IMAGE_EXTENSIONS) {
            pushUnique(values, `${apiBase}/recibir/getimage/${encodeURIComponent(`${fileNameWithoutQuery}${extension}`)}${querySuffix}`);
        }
    }

    return values;
}

function getIdRendBasedNames(gasto) {
    const idRend = sanitizeFileSegment(firstDefined(gasto?.idrend, gasto?.idRend, gasto?.idrendicion, gasto?.id));
    const ruc = sanitizeFileSegment(firstDefined(gasto?.rucEmisor, gasto?.ruc, gasto?.rucCliente, gasto?.ruccliente));
    const serie = sanitizeFileSegment(firstDefined(gasto?.serie, gasto?.nroserie, gasto?.serieComprobante));
    const numero = sanitizeFileSegment(firstDefined(gasto?.numero, gasto?.nro, gasto?.num, gasto?.correlativo));

    const names = [];
    if (!idRend) return names;

    // Fallbacks para movilidad/planilla: a veces se guarda sin serie/numero.
    pushUnique(names, idRend);
    pushUnique(names, `${idRend}___`);

    if (ruc) {
        pushUnique(names, `${idRend}_${ruc}`);
        pushUnique(names, `${idRend}_${ruc}__`);
    }

    if (serie && numero) {
        pushUnique(names, `${idRend}_${serie}_${numero}`);
    }

    if (ruc && serie && numero) {
        pushUnique(names, `${idRend}_${ruc}_${serie}_${numero}`);
    }

    return names;
}

function isLikelyFilePath(value) {
    if (!value) return false;
    const str = String(value).trim();
    const normalized = str.toLowerCase();

    // URLs/data/blob son válidos.
    if (hasSupportedRemotePrefix(normalized)) return true;

    // Bloquear etiquetas/observaciones de estado comunes.
    if (/^(aprobado|rechazado|pendiente|en\s+revision|observado|nova)$/i.test(normalized)) return false;

    // Glosas con fecha (ej: "PEAJE 04- 07/08/2026") traen "/" pero no son rutas:
    // solo se acepta si el último segmento parece un nombre de archivo real.
    if (/[/\\]/.test(str)) {
        const lastSegment = (str.split(/[/\\]/).pop() || "").trim();
        return (
            IMAGE_EXTENSION_REGEX.test(lastSegment) ||
            /^\d+_[a-z0-9]+(?:_[a-z0-9]+)*$/i.test(lastSegment)
        );
    }

    // Texto con espacios sin rutas normalmente es glosa, no archivo.
    if (/\s/.test(str)) return false;

    if (IMAGE_EXTENSION_REGEX.test(str)) return true;

    // Nombres compuestos típicos: id_ruc_serie_numero (con o sin extensión).
    if (/^\d+_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+(?:\.[a-z0-9]{1,5})?$/i.test(str)) return true;

    return false;
}

export function getEvidenceImageCandidates(gasto, fallbackObs = "") {
    const apiBase = getApiBaseUrl();
    const cacheBuster = String(
        firstDefined(
            gasto?.evidenciaUpdatedAt,
            gasto?.updatedAt,
            gasto?.fecEdit,
            gasto?.FecEdit,
            gasto?.DecEdit,
        )
    ).trim();
    const querySuffix = cacheBuster ? `?v=${encodeURIComponent(cacheBuster)}` : "";

    // Si hay un archivo recién subido para este gasto, usarlo como primer candidato
    // explícito. Esto evita que la adivinanza de extensión retorne un archivo viejo
    // con diferente extensión que aún existe en el servidor.
    const gastoIdKey = String(firstDefined(gasto?.idrend, gasto?.idRend, gasto?.id) || "").trim();
    const saveOverride = gastoIdKey ? recentSaveOverrides.get(gastoIdKey) : null;
    const overrideValues = saveOverride
        ? [saveOverride.evidenciaPath, saveOverride.evidenciaFileName].filter(Boolean)
        : [];

    // Priorizar campos explícitos devueltos por backend.
    const explicitRawValues = [
        ...overrideValues,
        gasto?.evidenciaPath,
        gasto?.evidenciaFileName,
        gasto?.fileName,
        gasto?.filename,
        gasto?.nombreArchivo,
        gasto?.nombrearchivo,
        gasto?.nomArchivo,
        gasto?.nomarchivo,
        gasto?.archivo,
        gasto?.path,
        gasto?.ruta,
        gasto?.rutaArchivo,
        gasto?.pathArchivo,
        gasto?.obs,
        gasto?.evidencia,
        gasto?.urlEvidencia,
        gasto?.urlArchivo,
    ].filter(isLikelyFilePath);

    // Solo usar fallbackObs cuando realmente parece archivo/ruta.
    const safeFallbackObs = isLikelyFilePath(fallbackObs) ? fallbackObs : "";
    if (safeFallbackObs) {
        pushUnique(explicitRawValues, safeFallbackObs);
    }

    // Los nombres heurísticos se usan solo si backend no trajo nombres explícitos.
    const shouldUseHeuristics = explicitRawValues.length === 0;
    const rawValues = shouldUseHeuristics
        ? [...explicitRawValues, ...getIdRendBasedNames(gasto)]
        : explicitRawValues;

    const candidates = [];

    rawValues.forEach((rawValue) => {
        const allowExtensionGuess = shouldUseHeuristics || !IMAGE_EXTENSION_REGEX.test(String(rawValue || ""));
        buildRemoteCandidates(rawValue, apiBase, querySuffix, { allowExtensionGuess }).forEach((candidate) => {
            pushUnique(candidates, candidate);
        });
    });

    return candidates;
}

export async function obtenerImagenBytesDesdeServidor(url, timeoutMs = 15000) {
    const target = String(url || "").trim();
    if (!target) return null;

    const now = Date.now();
    const cachedSuccess = successCache.get(target);
    if (cachedSuccess && now - cachedSuccess.cachedAt < SUCCESS_CACHE_TTL_MS) {
        return cachedSuccess.data;
    }

    const cachedMiss = missCache.get(target);
    if (cachedMiss && now - cachedMiss.cachedAt < MISS_CACHE_TTL_MS) {
        return null;
    }

    if (inflightRequests.has(target)) {
        return inflightRequests.get(target);
    }

    const requestPromise = (async () => {
        try {
            const bustCache = Date.now() < bypassBrowserCacheUntil;
            const fetchUrl = bustCache ? `${target}${target.includes("?") ? "&" : "?"}_t=${Date.now()}` : target;
            /* console.debug("🖼️ Intentando descargar evidencia:", fetchUrl); */
            const response = await API.get(fetchUrl, {
                responseType: "arraybuffer",
                timeout: timeoutMs,
                validateStatus: (status) => status === 200 || status === 201,
            });

            const bytes = new Uint8Array(response?.data || []);
            if (!bytes.length) {
                rememberMiss(target);
                return null;
            }

            const contentType = String(response?.headers?.["content-type"] || "").trim();
            const payload = {
                bytes,
                contentType: contentType || "application/octet-stream",
            };

            successCache.set(target, {
                data: payload,
                cachedAt: Date.now(),
            });
            if (missCache.delete(target)) {
                persistMissCache();
            }

            return payload;
        } catch (_error) {
            const status = _error?.response?.status;
            if (status) {
              /*   console.debug(`❌ Evidencia no disponible (${status}):`, target); */
            }
            rememberMiss(target);
            return null;
        } finally {
            inflightRequests.delete(target);
        }
    })();

    inflightRequests.set(target, requestPromise);
    return requestPromise;
}

export function notifyEvidenciaSaved(idRend, evidenciaPath, evidenciaFileName) {
    const key = String(idRend || "").trim();
    if (!key) return;
    recentSaveOverrides.set(key, { evidenciaPath: String(evidenciaPath || ""), evidenciaFileName: String(evidenciaFileName || "") });
    persistSaveOverrides();
}

export function clearImageBytesCache(candidate) {
    bypassBrowserCacheUntil = Date.now() + 10_000;
    if (candidate) {
        successCache.delete(candidate);
        missCache.delete(candidate);
    } else {
        successCache.clear();
        missCache.clear();
        try { sessionStorage.removeItem(MISS_CACHE_STORAGE_KEY); } catch { /* noop */ }
    }
}
