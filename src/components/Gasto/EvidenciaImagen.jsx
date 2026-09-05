import { useEffect, useMemo, useRef, useState } from "react";
import { getEvidenceImageCandidates, obtenerImagenBytesDesdeServidor } from "../../services/getImage/getImage";

function detectMimeFromBytes(bytes) {
    if (!bytes || !bytes.length) return "";

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
    ) {
        return "image/png";
    }

    // JPEG: FF D8 FF
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return "image/jpeg";
    }

    // WEBP: RIFF....WEBP
    if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    ) {
        return "image/webp";
    }

    // GIF: GIF87a / GIF89a
    if (
        bytes.length >= 6 &&
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38 &&
        (bytes[4] === 0x37 || bytes[4] === 0x39) &&
        bytes[5] === 0x61
    ) {
        return "image/gif";
    }

    // BMP: BM
    if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
        return "image/bmp";
    }

    // PDF: %PDF
    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return "application/pdf";
    }

    return "";
}

function inferImageMimeType(candidate, contentType, bytes) {
    const bySignature = detectMimeFromBytes(bytes);
    if (bySignature) {
        return bySignature;
    }

    const normalizedHeader = String(contentType || "").toLowerCase();
    if (normalizedHeader.startsWith("image/")) {
        return normalizedHeader;
    }

    const urlWithoutQuery = String(candidate || "").split("?")[0].toLowerCase();
    if (urlWithoutQuery.endsWith(".png")) return "image/png";
    if (urlWithoutQuery.endsWith(".jpg") || urlWithoutQuery.endsWith(".jpeg")) return "image/jpeg";
    if (urlWithoutQuery.endsWith(".webp")) return "image/webp";
    if (urlWithoutQuery.endsWith(".gif")) return "image/gif";
    if (urlWithoutQuery.endsWith(".bmp")) return "image/bmp";

    // Algunos backends devuelven octet-stream para imágenes.
    return "image/jpeg";
}

export default function EvidenciaImagen({ gasto, fallbackObs = "", alt = "Evidencia del gasto", className = "", loading = "lazy", fallback = null, ...imgProps }) {
    const gastoId = gasto?.idrend ?? gasto?.idRend ?? gasto?.id;
    const candidates = useMemo(() => {
        const c = getEvidenceImageCandidates(gasto, fallbackObs);
        if (import.meta.env.DEV) {
            console.debug("[EvidenciaImagen] candidatos para", gastoId, ":", c);
        }
        return c;
    }, [gasto, fallbackObs, gastoId]);
    const [resolvedSrc, setResolvedSrc] = useState("");
    const objectUrlRef = useRef("");

    useEffect(() => {
        let isCancelled = false;

        const revokeObjectUrl = () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = "";
            }
        };

        const resolveEvidenceSrc = async () => {
            for (const candidate of candidates) {
                if (isCancelled) return;

                if (/^data:image/i.test(candidate) || /^blob:/i.test(candidate)) {
                    setResolvedSrc(candidate);
                    return;
                }

                const imageData = await obtenerImagenBytesDesdeServidor(candidate, 8000);
                if (!imageData?.bytes?.length) {
                    continue;
                }

                const mime = inferImageMimeType(candidate, imageData.contentType, imageData.bytes);
                if (!String(mime).toLowerCase().startsWith("image/")) {
                    // Evita crear blobs no renderizables en <img> (ej: PDF/HTML).
                    continue;
                }

                revokeObjectUrl();
                const blob = new Blob([imageData.bytes], { type: mime });
                const objectUrl = URL.createObjectURL(blob);
                objectUrlRef.current = objectUrl;
                setResolvedSrc(objectUrl);
                return;
            }

            if (import.meta.env.DEV) {
                console.warn("[EvidenciaImagen] ningún candidato resolvió imagen para", gastoId, candidates);
            }
            setResolvedSrc("");
        };

        resolveEvidenceSrc();

        return () => {
            isCancelled = true;
            revokeObjectUrl();
        };
    }, [candidates, gastoId]);

    if (!resolvedSrc) {
        return fallback;
    }

    const evidenceContrastStyle = {
        backgroundColor: "#ffffff",
        ...imgProps.style,
    };

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
            loading={loading}
            {...imgProps}
            style={evidenceContrastStyle}
        />
    );
}
