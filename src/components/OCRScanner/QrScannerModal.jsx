import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Flashlight, FlashlightOff, X, Loader2, Upload } from "lucide-react";

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
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const scannerRef = useRef(null);
  const hasDetectedRef = useRef(false);
  const fileInputRef = useRef(null);
  const torchFeatureRef = useRef(null);

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
      torchFeatureRef.current = null;
      setIsRunning(false);
      setTorchSupported(false);
      setIsTorchOn(false);
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
          () => {},
        );

        setIsRunning(true);

        try {
          const torchFeature = scanner
            .getRunningTrackCameraCapabilities()
            .torchFeature();
          const isSupported = torchFeature.isSupported();
          torchFeatureRef.current = isSupported ? torchFeature : null;
          setTorchSupported(isSupported);
        } catch {
          torchFeatureRef.current = null;
          setTorchSupported(false);
        }
        setIsTorchOn(false);
      } catch (error) {
        /* console.error("Error iniciando escaner QR:", error); */
        setErrorMessage(
          "No se pudo iniciar la camara. Verifica permisos del navegador.",
        );
        await stopScanner();
      }
    },
    [onClose, onDetected, stopScanner],
  );

  const toggleTorch = useCallback(async () => {
    const torchFeature = torchFeatureRef.current;
    if (!torchFeature) return;

    const nextState = !isTorchOn;

    try {
      await torchFeature.apply(nextState);
      setIsTorchOn(nextState);
    } catch {
      setErrorMessage("No se pudo controlar la linterna del dispositivo.");
    }
  }, [isTorchOn]);

  const handleFileSelected = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setErrorMessage("");
      setIsReadingFile(true);
      hasDetectedRef.current = false;

      await stopScanner();

      const fileScanner = new Html5Qrcode(SCANNER_REGION_ID);

      try {
        const decodedText = await fileScanner.scanFile(file, true);
        hasDetectedRef.current = true;
        onDetected(decodedText);
        await fileScanner.clear();
        onClose();
      } catch {
        setErrorMessage(
          "No se pudo leer el codigo QR de la imagen. Intenta con otra foto o usa la camara.",
        );
        try {
          await fileScanner.clear();
        } catch {
          /* noop */
        }
      } finally {
        setIsReadingFile(false);
      }
    },
    [onClose, onDetected, stopScanner],
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
        /* console.error("Error listando camaras:", error); */
        if (!isMounted) return;
        setErrorMessage(
          "No se pudo acceder a la camara. Permite el acceso en tu navegador.",
        );
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
          <h4 className="text-base font-bold text-slate-800">
            Escanear codigo QR
          </h4>
          <button
            type="button"
            aria-label="Cerrar scanner"
            className="
    inline-flex
    h-10 w-10
    items-center
    justify-center
    rounded-full
    border border-slate-200
    bg-white/95
    text-slate-600
    shadow-md
    backdrop-blur-sm
    transition-all
    hover:bg-slate-50
    hover:text-slate-900
    active:scale-95
    focus:outline-none
    focus:ring-2
    focus:ring-slate-300
    focus:ring-offset-2
  "
            onClick={async () => {
              await stopScanner();
              onClose();
            }}
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-600">
          Funciona en movil y laptop. Selecciona la camara y apunta al QR del
          comprobante.
        </p>

        {hasCameras && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Camara
            </label>
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

        <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div
            id={SCANNER_REGION_ID}
            className="mx-auto min-h-70 w-full overflow-hidden rounded-lg"
          />

          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={isTorchOn ? "Apagar linterna" : "Encender linterna"}
              className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition ${
                isTorchOn
                  ? "bg-amber-400 text-slate-900"
                  : "bg-slate-900/70 text-white hover:bg-slate-900/90"
              }`}
            >
              {isTorchOn ? (
                <FlashlightOff className="h-5 w-5" />
              ) : (
                <Flashlight className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {isRunning && (
          <p className="mt-3 text-xs font-medium text-emerald-700">
            Escaner activo: acerca el QR al centro.
          </p>
        )}

        {errorMessage && (
          <p className="mt-3 text-xs font-semibold text-rose-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase text-slate-400">
            o
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />

        <button
          type="button"
          disabled={isReadingFile}
          onClick={() => fileInputRef.current?.click()}
          className="
    mt-3
    flex
    min-h-12
    w-full
    items-center
    justify-center
    gap-2.5
    rounded-xl
    border
    border-dashed
    border-slate-300
    bg-white
    px-4
    py-3
    text-sm
    font-semibold
    text-slate-700
    shadow-sm
    transition-all
    duration-200
    hover:border-blue-300
    hover:bg-blue-50/40
    hover:text-blue-700
    active:scale-[0.99]
    disabled:cursor-not-allowed
    disabled:opacity-60
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500/20
    focus:ring-offset-2 cursor-pointer
  "
        >
          {isReadingFile ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Procesando QR...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Subir imagen del QR</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
