import { useEffect, useRef } from "react";

export default function Toast({ message, type = "success", isVisible, onClose, duration = 3000 }) {
    const timerRef = useRef(null);

    const validationPrefix = "Completa los campos obligatorios:";
    const isValidationMessage =
        type === "error" &&
        typeof message === "string" &&
        message.startsWith(validationPrefix);

    const validationFields = isValidationMessage
        ? message
            .slice(validationPrefix.length)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

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
            ring: "ring-emerald-500/20",
            iconContainer: "bg-emerald-100 text-emerald-700",
            title: "Operacion completada",
            titleColor: "text-emerald-700",
            textColor: "text-slate-700",
            progressFrom: "from-emerald-300",
            progressTo: "to-emerald-500",
        },
        error: {
            ring: "ring-rose-500/20",
            iconContainer: "bg-rose-100 text-rose-700",
            title: "Ocurrio un problema",
            titleColor: "text-rose-700",
            textColor: "text-slate-700",
            progressFrom: "from-rose-300",
            progressTo: "to-rose-500",
        },
        warning: {
            ring: "ring-amber-500/20",
            iconContainer: "bg-amber-100 text-amber-700",
            title: "Atencion",
            titleColor: "text-amber-700",
            textColor: "text-slate-700",
            progressFrom: "from-amber-200",
            progressTo: "to-amber-500",
        },
        info: {
            ring: "ring-sky-500/20",
            iconContainer: "bg-sky-100 text-sky-700",
            title: "Informacion",
            titleColor: "text-sky-700",
            textColor: "text-slate-700",
            progressFrom: "from-sky-200",
            progressTo: "to-sky-500",
        },
    };

    const config = toastConfig[type] || toastConfig.info;

    const renderIcon = () => {
        if (type === "success") {
            return (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
            );
        }

        if (type === "error") {
            return (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3h.01M10.3 3.84l-7.37 12.8A1.4 1.4 0 0 0 4.17 19h15.66a1.4 1.4 0 0 0 1.24-2.36L13.7 3.84a1.97 1.97 0 0 0-3.4 0Z" />
                </svg>
            );
        }

        if (type === "warning") {
            return (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 3h.01M3.43 17h17.14c1.11 0 1.8-1.2 1.24-2.16L13.24 4.16a1.43 1.43 0 0 0-2.48 0L2.2 14.84C1.63 15.8 2.33 17 3.43 17Z" />
                </svg>
            );
        }

        return (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9h.01M11 12h1v4h1m-1-14a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
            </svg>
        );
    };

    return (
        <>
            <style>{`
                @keyframes toast-enter {
                    0% {
                        opacity: 0;
                        transform: translateY(16px) scale(0.98);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes toast-progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }

                .toast-enter {
                    animation: toast-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }

                .toast-progress {
                    animation-name: toast-progress;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }

                @media (prefers-reduced-motion: reduce) {
                    .toast-enter,
                    .toast-progress {
                        animation: none;
                    }
                }
            `}</style>

            <div className="fixed bottom-5 left-3 right-3 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-104">
                <div
                    className={`toast-enter relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-1 text-slate-900 backdrop-blur-xl ring-1 ${config.ring} shadow-[0_18px_45px_rgba(15,23,42,0.16)]`}
                >
                    <div className="absolute -top-10 -right-14 h-32 w-32 rounded-full bg-cyan-200/45 blur-3xl" />
                    <div className="absolute -bottom-12 -left-10 h-24 w-24 rounded-full bg-emerald-200/35 blur-2xl" />

                    <div className="relative rounded-[15px] bg-white/85 px-4 py-3.5 sm:px-5 sm:py-4">
                        <div className="flex items-start gap-3.5">
                            <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${config.iconContainer} shrink-0`}>
                                {renderIcon()}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${config.titleColor}`}>
                                    {config.title}
                                </p>

                                {isValidationMessage ? (
                                    <div className="mt-1.5">
                                        <p className={`${config.textColor} text-sm font-medium leading-snug`}>
                                            Completa los campos obligatorios
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {validationFields.map((field) => (
                                                <span
                                                    key={field}
                                                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                                                >
                                                    {field}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className={`${config.textColor} mt-1 text-sm leading-snug whitespace-pre-line`}>
                                        {message}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    onClose?.();
                                }}
                                className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                aria-label="Cerrar notificacion"
                            >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className={`toast-progress h-full rounded-full bg-linear-to-r ${config.progressFrom} ${config.progressTo}`}
                                style={{ animationDuration: `${duration}ms`, width: "100%" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
