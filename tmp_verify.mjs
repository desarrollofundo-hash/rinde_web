const IMAGE_EXTENSION_REGEX = /\.(png|jpg|jpeg|webp|pdf)$/i;
function hasSupportedRemotePrefix(value) { return /^data:image/i.test(value) || /^https?:\/\//i.test(value) || /^blob:/i.test(value); }
function isLikelyFilePath(value) {
    if (!value) return false;
    const str = String(value).trim();
    const normalized = str.toLowerCase();
    if (hasSupportedRemotePrefix(normalized)) return true;
    if (/^(aprobado|rechazado|pendiente|en\s+revision|observado|nova)$/i.test(normalized)) return false;
    if (/[\/\\]/.test(str)) {
        const lastSegment = (str.split(/[\/\\]/).pop() || "").trim();
        return IMAGE_EXTENSION_REGEX.test(lastSegment) || /^\d+_[a-z0-9]+(?:_[a-z0-9]+)*$/i.test(lastSegment);
    }
    if (/\s/.test(str)) return false;
    if (IMAGE_EXTENSION_REGEX.test(str)) return true;
    if (/^\d+_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+(?:\.[a-z0-9]{1,5})?$/i.test(str)) return true;
    return false;
}
/* console.log("obs con fecha:", isLikelyFilePath("PEAJE 04- 07/08/2026")); // esperado false
console.log("ruta real con ext:", isLikelyFilePath("uploads/10_20505377142_F131_3651038.jpg")); // true
console.log("ruta real sin ext:", isLikelyFilePath("uploads/10_20505377142_F131_3651038")); // true
console.log("glosa simple:", isLikelyFilePath("Embarque")); // false
console.log("glosa con espacios:", isLikelyFilePath("Traslado de personal")); // false */
