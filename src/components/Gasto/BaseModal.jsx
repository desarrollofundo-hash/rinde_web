import { useEffect } from "react";

export default function BaseModal({
    isOpen,
    onClose,
    title,
    children,
    maxWidthClass = "max-w-2xl",
    viewportClass = "items-end p-2 sm:items-center sm:p-4",
    panelClass = "p-4 sm:p-6",
}) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose?.();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            <button
                type="button"
                aria-label="Cerrar modal"
                className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <div className={`fixed inset-0 z-50 flex justify-center items-start sm:items-center mt-8 sm:mt-0 ${viewportClass}`}>
                <div className={`flex w-full flex-col overflow-hidden border border-slate-200/80 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.55)] ring-1 ring-white/60 backdrop-blur-sm max-h-[98vh] sm:max-h-[88vh] rounded-none sm:rounded-[1.35rem] max-w-full sm:${maxWidthClass} ${panelClass}`}>
                    {title && (
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-blue-100 bg-linear-to-r from-blue-50 via-white to-indigo-50 px-4 py-3 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="h-9 w-1 rounded-full bg-linear-to-b from-blue-600 via-blue-700 to-indigo-500" />
                                <div className="min-w-0">
                                    <h2 className="truncate text-base font-extrabold text-slate-800 sm:text-xl">{title}</h2>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="cursor-pointer rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 sm:text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto bg-linear-to-b from-white to-slate-50/70">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
    }

