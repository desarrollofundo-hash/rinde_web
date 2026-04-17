import { useEffect, useMemo, useRef, useState } from "react";
import { getEvidenceImageCandidates, obtenerImagenBytesDesdeServidor } from "../../services/getImage/getImage";

function inferImageMimeType(candidate, contentType) {
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
    const candidates = useMemo(() => getEvidenceImageCandidates(gasto, fallbackObs), [gasto, fallbackObs]);
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

                const mime = inferImageMimeType(candidate, imageData.contentType);

                revokeObjectUrl();
                const blob = new Blob([imageData.bytes], { type: mime });
                const objectUrl = URL.createObjectURL(blob);
                objectUrlRef.current = objectUrl;
                setResolvedSrc(objectUrl);
                return;
            }

            setResolvedSrc("");
        };

        resolveEvidenceSrc();

        return () => {
            isCancelled = true;
            revokeObjectUrl();
        };
    }, [candidates]);

    if (!resolvedSrc) {
        return fallback;
    }

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
            loading={loading}
            {...imgProps}
        />
    );
}
