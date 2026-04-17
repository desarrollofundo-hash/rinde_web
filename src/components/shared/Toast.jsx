import { useEffect, useRef } from "react";

export default function Toast({ message, type = "success", isVisible, onClose, duration = 3000 }) {
    const timerRef = useRef(null);

    useEffect(() => {
        if (!isVisible) return;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            onClose?.();
        }, duration);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    const toastConfig = {
        success: {
            bg: "from-emerald-600 to-emerald-700",
            border: "border-emerald-400/40",
            icon: "🎉",
            textColor: "text-white",
            accentBg: "bg-emerald-500/20",
            accentColor: "text-emerald-200",
        },
        error: {
            bg: "from-red-600 to-red-700",
            border: "border-red-400/40",
            icon: "⚡",
            textColor: "text-white",
            accentBg: "bg-red-500/20",
            accentColor: "text-red-200",
        },
        warning: {
            bg: "from-amber-600 to-amber-700",
            border: "border-amber-400/40",
            icon: "⚠️",
            textColor: "text-white",
            accentBg: "bg-amber-500/20",
            accentColor: "text-amber-200",
        },
        info: {
            bg: "from-blue-600 to-blue-700",
            border: "border-blue-400/40",
            icon: "💡",
            textColor: "text-white",
            accentBg: "bg-blue-500/20",
            accentColor: "text-blue-200",
        },
    };

    const config = toastConfig[type];

    return (
        <>
            <style>{`
 @keyframes toastSlideIn {
 from {
 opacity: 0;
transform: translateY(30px) translateX(100px);
 }
 to {
 opacity: 1;
transform: translateY(0) translateX(0);
}
 }
 
 @keyframes toastSlideOut {
from {
opacity: 1;
transform: translateY(0) translateX(0);
}
to {
opacity: 0;
transform: translateY(30px) translateX(100px);
}
 }

 @keyframes pulse-ring {
0% {
box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
}
70% {
box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
}
100% {
box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
}
 }

 .toast-enter {
animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
 }

 .toast-exit {
animation: toastSlideOut 0.3s ease-in forwards;
 }

 .pulse-icon {
animation: pulse-ring 2s infinite;
 }
 `}</style>

            <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50">
                <div
                    className={`toast-enter relative overflow-hidden rounded-2xl bg-linear-to-r ${config.bg} ${config.border} border backdrop-blur-xl shadow-2xl transition-all duration-300`}
                    style={{
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 255, 255, 0.1)",
                    }}
                >
                    {/* Efecto de luz de fondo */}
                    <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/5 to-white/0" />

                    {/* Contenedor principal */}
                    <div className="relative flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5">
                        {/* Icono con efecto */}
                        <div className={`${config.accentBg} rounded-xl p-3 shrink-0 pulse-icon`}>
                            <span className="text-2xl sm:text-3xl block">{config.icon}</span>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                            <p className={`${config.textColor} text-sm sm:text-base font-bold leading-snug word-break`}>
                                {message}
                            </p>
                        </div>

                        {/* Botón cerrar */}
                        <button
                            onClick={() => {
                                onClose?.();
                            }}
                            className={`${config.accentColor} hover:text-white shrink-0 ml-2 text-xl opacity-80 hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95`}
                            aria-label="Cerrar notificación"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Barra de progreso inferior */}
                    <div
                        className="absolute bottom-0 left-0 h-1 bg-white/40"
                        style={{
                            animation: `shrink ${duration}ms linear`,
                            width: "100%",
                        }}
                    />
                </div>

                <style>{`
@keyframes shrink {
from {
width: 100%;
}
to {
width: 0%;
}
}
`}</style>
            </div>
        </>
    );
}