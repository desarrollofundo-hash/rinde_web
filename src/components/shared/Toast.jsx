import { useEffect, useRef, useState } from "react";
import { normalizeWorkflowStatus } from "./workflowStatus";

export default function Toast({
  message,
  type = "success",
  isVisible,
  onClose,
  duration = 3000,
}) {
  const timerRef = useRef(null);
  const [isExiting, setIsExiting] = useState(false);

  const validationPrefix = "Completa los campos obligatorios:";
  const isValidationMessage =
    type === "error" &&
    typeof message === "string" &&
    message.startsWith(validationPrefix);

  const validationFields = isValidationMessage
    ? message
        .slice(validationPrefix.length)
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  useEffect(() => {
    if (!isVisible) {
      setIsExiting(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose?.();
      }, 300);
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  // Normalizar estados de workflow al tipo de toast correspondiente
  const workflowTypeMap = {
    APROBADO:      "success",
    RECHAZADO:     "error",
    "EN REVISION": "revision",
    "EN AUDITORIA":"auditoria",
    "EN INFORME":  "informe",
    BORRADOR:      "borrador",
    PENDIENTE:     "pendiente",
  };
  const workflowNormalized = normalizeWorkflowStatus(type);
  const resolvedType = workflowTypeMap[workflowNormalized] ?? type;

  const toastConfig = {
    success: {
      bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-emerald-100", textColor: "text-white",
      progress: "bg-white/40", title: "Operación completada",
      shadow: "shadow-emerald-500/40",
    },
    error: {
      bg: "bg-gradient-to-br from-rose-500 to-red-600",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-rose-100", textColor: "text-white",
      progress: "bg-white/40", title: "Ocurrió un problema",
      shadow: "shadow-rose-500/40",
    },
    warning: {
      bg: "bg-gradient-to-br from-amber-400 to-orange-500",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-amber-100", textColor: "text-white",
      progress: "bg-white/40", title: "Atención",
      shadow: "shadow-amber-400/40",
    },
    info: {
      bg: "bg-gradient-to-br from-sky-500 to-sky-600",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-sky-100", textColor: "text-white",
      progress: "bg-white/40", title: "Información",
      shadow: "shadow-sky-500/40",
    },
    // Estados del workflow
    revision: {
      bg: "bg-gradient-to-br from-orange-400 to-orange-600",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-orange-100", textColor: "text-white",
      progress: "bg-white/40", title: "En revisión",
      shadow: "shadow-orange-400/40",
    },
    auditoria: {
      bg: "bg-gradient-to-br from-sky-500 to-sky-700",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-sky-100", textColor: "text-white",
      progress: "bg-white/40", title: "En auditoría",
      shadow: "shadow-sky-500/40",
    },
    informe: {
      bg: "bg-gradient-to-br from-amber-400 to-amber-600",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-amber-100", textColor: "text-white",
      progress: "bg-white/40", title: "En informe",
      shadow: "shadow-amber-400/40",
    },
    borrador: {
      bg: "bg-gradient-to-br from-slate-400 to-slate-600",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-slate-100", textColor: "text-white",
      progress: "bg-white/40", title: "Borrador",
      shadow: "shadow-slate-400/40",
    },
    pendiente: {
      bg: "bg-gradient-to-br from-slate-400 to-slate-600",
      iconBg: "bg-white/20", iconColor: "text-white",
      titleColor: "text-slate-100", textColor: "text-white",
      progress: "bg-white/40", title: "Pendiente",
      shadow: "shadow-slate-400/40",
    },
  };

  const config = toastConfig[resolvedType] ?? toastConfig.info;

  const renderIcon = () => {
    if (resolvedType === "success")
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
      );
    if (resolvedType === "error")
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3h.01M10.3 3.84l-7.37 12.8A1.4 1.4 0 0 0 4.17 19h15.66a1.4 1.4 0 0 0 1.24-2.36L13.7 3.84a1.97 1.97 0 0 0-3.4 0Z" />
        </svg>
      );
    if (resolvedType === "warning" || resolvedType === "revision")
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 3h.01M3.43 17h17.14c1.11 0 1.8-1.2 1.24-2.16L13.24 4.16a1.43 1.43 0 0 0-2.48 0L2.2 14.84C1.63 15.8 2.33 17 3.43 17Z" />
        </svg>
      );
    // info / auditoria / informe / borrador / pendiente
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9h.01M11 12h1v4h1m-1-14a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
      </svg>
    );
  };

  return (
    <>
      <style>{`
                @keyframes toast-slide-in {
                    0%   { opacity: 0; transform: translateX(110%) scale(0.95); }
                    100% { opacity: 1; transform: translateX(0)   scale(1);    }
                }
                @keyframes toast-slide-out {
                    0%   { opacity: 1; transform: translateX(0) scale(1); }
                    100% { opacity: 0; transform: translateX(110%) scale(0.95); }
                }
                @keyframes toast-progress {
                    from { width: 100%; }
                    to   { width: 0%;   }
                }
                .toast-enter { animation: toast-slide-in 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .toast-exit { animation: toast-slide-out 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .toast-progress { animation-name: toast-progress; animation-timing-function: linear; animation-fill-mode: forwards; }
                @media (prefers-reduced-motion: reduce) { .toast-enter, .toast-exit, .toast-progress { animation: none; } }
            `}</style>

      <div className="fixed bottom-5 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] sm:bottom-7 sm:right-6">
        <div
          className={`${isExiting ? 'toast-exit' : 'toast-enter'} relative overflow-hidden rounded-2xl ${config.bg} shadow-2xl ${config.shadow}`}
        >
          <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.iconColor}`}
            >
              {renderIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-[11px] font-bold uppercase tracking-widest ${config.titleColor}`}
              >
                {config.title}
              </p>
              {isValidationMessage ? (
                <div className="mt-1.5">
                  <p
                    className={`text-sm font-medium leading-snug ${config.textColor}`}
                  >
                    Completa los campos obligatorios
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {validationFields.map((field) => (
                      <span
                        key={field}
                        className="rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-semibold text-white"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p
                  className={`mt-1 text-sm font-medium leading-snug whitespace-pre-line ${config.textColor}`}
                >
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white/80 transition-all duration-200 hover:bg-white/30 hover:text-white active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Cerrar notificación"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 6 12 12M18 6 6 18"
                />
              </svg>
            </button>
          </div>
          <div className="h-1.5 w-full bg-white/20">
            <div
              className={`toast-progress h-full ${config.progress}`}
              style={{ animationDuration: `${duration}ms`, width: "100%" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
