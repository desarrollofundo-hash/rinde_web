import { useState, useRef } from "react";
import { extraerDatosComprobante } from "../../services/ocrExtraction";
import Toast from "../shared/Toast.jsx";
import { Upload, Loader, CheckCircle, AlertCircle } from "lucide-react";

export default function EscanearIA() {
    const [archivo, setArchivo] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setArchivo(file);
        setError(null);
        setResultado(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            setPreview(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const procesarImagen = async () => {
        if (!archivo) {
            setError("Por favor selecciona una imagen de factura");
            return;
        }

        setCargando(true);
        setError(null);

        try {
            const datos = await extraerDatosComprobante(archivo);
            setResultado(datos);
            Toast.success("Datos de factura extraídos correctamente");
        } catch (err) {
            const mensaje = err.message || "Error al procesar la imagen";
            setError(mensaje);
            Toast.error(mensaje);
        } finally {
            setCargando(false);
        }
    };

    const limpiar = () => {
        setArchivo(null);
        setPreview(null);
        setResultado(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Escanear Factura con IA</h1>
                <p className="mt-2 text-slate-600">
                    Carga una foto de tu factura y la IA extraerá automáticamente los datos.
                    Usa tu API key de OpenAI para procesar la imagen.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Área de carga */}
                <div className="space-y-4">
                    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            disabled={cargando}
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={cargando}
                            className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                        >
                            <Upload className="h-6 w-6" />
                        </button>

                        <p className="font-semibold text-slate-900">
                            {archivo ? "Imagen cargada" : "Selecciona una imagen"}
                        </p>
                        <p className="text-sm text-slate-600">
                            {archivo
                                ? archivo.name
                                : "Arrastra una foto de factura o haz clic para seleccionar"}
                        </p>
                    </div>

                    {preview && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <img
                                src={preview}
                                alt="Vista previa"
                                className="h-64 w-full object-cover rounded-lg"
                            />
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={procesarImagen}
                            disabled={!archivo || cargando}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {cargando ? (
                                <>
                                    <Loader className="h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                "Procesar Factura"
                            )}
                        </button>
                        {archivo && (
                            <button
                                onClick={limpiar}
                                disabled={cargando}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Resultados */}
                <div className="space-y-4">
                    {error && (
                        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-red-800">
                                <p className="font-semibold">Error</p>
                                <p>{error}</p>
                            </div>
                        </div>
                    )}

                    {resultado && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex gap-2 mb-4">
                                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                                <p className="font-semibold text-emerald-900">
                                    Datos extraídos correctamente
                                </p>
                            </div>

                            <div className="space-y-3 bg-white rounded-lg p-4">
                                {[
                                    ["RUC Emisor", resultado.rucEmisor],
                                    ["Razón Social", resultado.razonSocial],
                                    ["Tipo Comprobante", resultado.tipoComprobante],
                                    ["Serie", resultado.serie],
                                    ["Número", resultado.numero],
                                    ["Fecha", resultado.fecha],
                                    ["Moneda", resultado.moneda === "01" ? "Soles" : "Dólares"],
                                    ["IGV", resultado.igv],
                                    ["Total", resultado.total],
                                ].map(([label, valor]) => (
                                    valor && (
                                        <div key={label} className="flex justify-between">
                                            <span className="text-sm font-semibold text-slate-600">
                                                {label}:
                                            </span>
                                            <span className="text-sm font-medium text-slate-900">
                                                {valor}
                                            </span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {!resultado && !error && !cargando && (
                        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                            <p className="text-center text-sm text-slate-500">
                                Carga una imagen y haz clic en "Procesar Factura"
                                <br />
                                para ver los resultados aquí
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}