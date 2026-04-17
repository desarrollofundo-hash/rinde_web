import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_REGION_ID = "qr-reader-region";

const pickDefaultCamera = (cameraList) => {
    if (!Array.isArray(cameraList) || cameraList.length === 0) return "";

    const rearCamera = cameraList.find((camera) => {
        const label = String(camera.label || "").toLowerCase();
        return (
            label.includes("back") ||
            label.includes("rear") ||
            label.includes("environment") ||
            label.includes("trasera")
        );
    });

    return (rearCamera || cameraList[0]).id;
};

export default function QrScannerModal({ isOpen, onClose, onDetected }) {
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const scannerRef = useRef(null);
    const hasDetectedRef = useRef(false);

    const hasCameras = useMemo(() => cameras.length > 0, [cameras]);

    const stopScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        if (!scanner) return;

        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
            await scanner.clear();
        } catch (error) {
            /* console.warn("No se pudo detener el escaner QR:", error); */
        } finally {
            scannerRef.current = null;
            setIsRunning(false);
        }
    }, []);

    const startScanner = useCallback(
        async (cameraId) => {
            if (!cameraId) return;

            setErrorMessage("");
            hasDetectedRef.current = false;

            await stopScanner();

            const scanner = new Html5Qrcode(SCANNER_REGION_ID);
            scannerRef.current = scanner;

            try {
                await scanner.start(
                    cameraId,
                    {
                        fps: 10,
                        qrbox: { width: 260, height: 260 },
                        aspectRatio: 1.777,
                        disableFlip: false,
                    },
                    async (decodedText) => {
                        if (hasDetectedRef.current) return;
                        hasDetectedRef.current = true;

                        onDetected(decodedText);
                        await stopScanner();
                        onClose();
                    },
                    () => { }
                );

                setIsRunning(true);
            } catch (error) {
                console.error("Error iniciando escaner QR:", error);
                setErrorMessage("No se pudo iniciar la camara. Verifica permisos del navegador.");
                await stopScanner();
            }
        },
        [onClose, onDetected, stopScanner]
    );

    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            return;
        }

        let isMounted = true;

        const loadCameras = async () => {
            try {
                const cameraList = await Html5Qrcode.getCameras();

                if (!isMounted) return;

                setCameras(cameraList);

                if (!cameraList.length) {
                    setErrorMessage("No se encontraron camaras disponibles.");
                    return;
                }

                const defaultCameraId = pickDefaultCamera(cameraList);
                setSelectedCameraId(defaultCameraId);
                await startScanner(defaultCameraId);
            } catch (error) {
                console.error("Error listando camaras:", error);
                if (!isMounted) return;
                setErrorMessage("No se pudo acceder a la camara. Permite el acceso en tu navegador.");
            }
        };

        loadCameras();

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, [isOpen, startScanner, stopScanner]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-base font-bold text-slate-800">Escanear codigo QR</h4>
                    <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={async () => {
                            await stopScanner();
                            onClose();
                        }}
                    >
                        Cerrar
                    </button>
                </div>

                <p className="mb-3 text-sm text-slate-600">
                    Funciona en movil y laptop. Selecciona la camara y apunta al QR del comprobante.
                </p>

                {hasCameras && (
                    <div className="mb-3">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Camara</label>
                        <div className="flex gap-2">
                            <select
                                value={selectedCameraId}
                                onChange={async (event) => {
                                    const cameraId = event.target.value;
                                    setSelectedCameraId(cameraId);
                                    await startScanner(cameraId);
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                            >
                                {cameras.map((camera) => (
                                    <option key={camera.id} value={camera.id}>
                                        {camera.label || `Camara ${camera.id}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div id={SCANNER_REGION_ID} className="mx-auto min-h-70 w-full overflow-hidden rounded-lg" />
                </div>

                {isRunning && (
                    <p className="mt-3 text-xs font-medium text-emerald-700">Escaner activo: acerca el QR al centro.</p>
                )}

                {errorMessage && (
                    <p className="mt-3 text-xs font-semibold text-rose-700">{errorMessage}</p>
                )}
            </div>
        </div>
    );
}
