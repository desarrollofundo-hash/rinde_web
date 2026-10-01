import { useEffect, useMemo, useRef, useState } from "react";
import { getEvidenceImageCandidates, obtenerImagenBytesDesdeServidor } from "../../services/getImage/getImage";

// Blob URLs resueltos por candidate URL — persisten entre remounts.
// El servicio ya cachea los bytes; esto evita llamar createObjectURL cada vez.
const blobUrlCache = new Map();

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
    const candidates = useMemo(
        () => getEvidenceImageCandidates(gasto, fallbackObs),
        [gasto, fallbackObs]
    );
    const [resolvedSrc, setResolvedSrc] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [imgVisible, setImgVisible] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        let isCancelled = false;
        setIsLoading(true);
        setImgVisible(false);

        const resolveEvidenceSrc = async () => {
            for (const candidate of candidates) {
                if (isCancelled) return;

                // Blob URL ya resuelto: usar directo sin red ni createObjectURL
                if (blobUrlCache.has(candidate)) {
                    if (!isCancelled) { setResolvedSrc(blobUrlCache.get(candidate)); setIsLoading(false); }
                    return;
                }

                if (/^data:image/i.test(candidate) || /^blob:/i.test(candidate)) {
                    if (!isCancelled) { setResolvedSrc(candidate); setIsLoading(false); }
                    return;
                }

                const imageData = await obtenerImagenBytesDesdeServidor(candidate, 8000);
                if (!imageData?.bytes?.length) continue;

                const mime = inferImageMimeType(candidate, imageData.contentType, imageData.bytes);
                if (!String(mime).toLowerCase().startsWith("image/")) continue;

                const blob = new Blob([imageData.bytes], { type: mime });
                const objectUrl = URL.createObjectURL(blob);
                blobUrlCache.set(candidate, objectUrl); // cachear para futuros remounts

                if (!isCancelled) { setResolvedSrc(objectUrl); setIsLoading(false); }
                return;
            }

            if (!isCancelled) { setResolvedSrc(""); setIsLoading(false); }
        };

        // IntersectionObserver: iniciar fetch solo cuando el elemento entra al viewport
        const container = containerRef.current;
        if (!container) {
            resolveEvidenceSrc();
            return () => { isCancelled = true; };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    observer.disconnect();
                    resolveEvidenceSrc();
                }
            },
            { rootMargin: "120px" } // prefetch 120px antes de ser visible
        );
        observer.observe(container);

        return () => {
            isCancelled = true;
            observer.disconnect();
            // No revocar: el blob URL queda en blobUrlCache para remounts
        };
    }, [candidates, gastoId]);

    // Fase 1: fetch pendiente → skeleton (estilos inline para garantizar tamaño en tabla)
    if (isLoading) {
        return (
            <div
                ref={containerRef}
                aria-hidden="true"
                style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "#e2e8f0",
                    margin: "0 auto",
                    flexShrink: 0,
                    animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                }}
            />
        );
    }

    // Fase 2: fetch falló o sin evidencia → fallback
    if (!resolvedSrc) return fallback;

    // Fase 3: img visible con fade-in
    return (
        <img
            ref={containerRef}
            src={resolvedSrc}
            alt={alt}
            className={className}
            loading={loading}
            onLoad={() => setImgVisible(true)}
            {...imgProps}
            style={{
                backgroundColor: "#ffffff",
                opacity: imgVisible ? 1 : 0,
                transition: "opacity 0.35s ease",
                ...imgProps.style,
            }}
        />
    );
}
