import { useState, useRef } from "react";

/**
 * Lightbox con zoom para imágenes.
 * Props:
 *   src      {string|null}  – URL de la imagen. Si es null/falsy, el componente no se muestra.
 *   onClose  {function}     – Callback para cerrar el lightbox.
 */
export default function ImageZoomLightbox({ src, onClose }) {
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });

    if (!src) return null;

    const handleClose = () => {
        setScale(1);
        setPos({ x: 0, y: 0 });
        onClose();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const handleWheel = (e) => {
        e.preventDefault();
        setScale((prev) => Math.min(6, Math.max(0.5, prev - e.deltaY * 0.002)));
    };

    const handleMouseDown = (e) => {
        if (scale <= 1) { setScale(2); return; }
        dragRef.current.isDragging = true;
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
        dragRef.current.originX = pos.x;
        dragRef.current.originY = pos.y;
        e.currentTarget.style.cursor = "grabbing";
    };

    const handleMouseMove = (e) => {
        if (!dragRef.current.isDragging) return;
        const dx = (e.clientX - dragRef.current.startX) / scale;
        const dy = (e.clientY - dragRef.current.startY) / scale;
        setPos({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
    };

    const handleMouseUp = (e) => {
        dragRef.current.isDragging = false;
        e.currentTarget.style.cursor = scale > 1 ? "grab" : "zoom-in";
    };

    return (
        <div
            className="fixed inset-0 z-70 flex items-center justify-center bg-black/90"
            onClick={handleBackdropClick}
            onWheel={handleWheel}
            style={{ touchAction: "none" }}
        >
            {/* Controles */}
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setScale((p) => Math.min(6, +(p + 0.5).toFixed(1)))}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                    title="Acercar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM11 8v6M8 11h6" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => setScale((p) => Math.max(0.5, +(p - 0.5).toFixed(1)))}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                    title="Alejar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM8 11h6" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                    title="Restablecer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={handleClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                    title="Cerrar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Indicador de zoom */}
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
                {Math.round(scale * 100)}%
            </span>

            {/* Imagen */}
            <img
                src={src}
                alt="Zoom evidencia"
                draggable={false}
                style={{
                    transform: `scale(${scale}) translate(${pos.x}px, ${pos.y}px)`,
                    transformOrigin: "center",
                    transition: "transform 0.15s ease",
                    maxWidth: "90vw",
                    maxHeight: "90vh",
                    cursor: scale > 1 ? "grab" : "zoom-in",
                    userSelect: "none",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { dragRef.current.isDragging = false; }}
            />
        </div>
    );
}
