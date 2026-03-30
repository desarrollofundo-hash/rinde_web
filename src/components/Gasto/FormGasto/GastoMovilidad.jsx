import { useState } from "react";

export default function GastoMovilidad() {
    const [formData, setFormData] = useState({
        politica: "",
        categoria: "",
        centroCosto: "",
        rucCliente: "",
        rucEmisor: "",
        fecha: "",
        total: "",
        igv: "",
        numeroSerie: "",
        glosa: "",
        evidencia: null,
    });

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData({
            ...formData,
            [name]: files ? files[0] : value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("📦 Datos enviados:", formData);
    };

    return (
        <form onSubmit={handleSubmit} className="mt-6 bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Formulario - Gasto Movilidad</h2>

            {/* 🔹 Adjuntar evidencia */}
            <div className="mb-4">
                <label className="block font-semibold mb-1">Adjuntar evidencia</label>
                <input type="file" name="evidencia" onChange={handleChange} />
            </div>

            {/* 🔹 Lector QR */}
            <div className="mb-4">
                <label className="block font-semibold mb-1">Lector de código QR</label>
                <button
                    type="button"
                    className="bg-gray-500 text-white px-3 py-2 rounded"
                    onClick={() => alert("Abrir escáner QR")}
                >
                    Escanear QR
                </button>
            </div>

            {/* 🔹 Datos Generales */}
            <h3 className="text-lg font-semibold mt-6 mb-2">Datos Generales</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    name="politica"
                    placeholder="Seleccionar Política"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="categoria"
                    placeholder="Seleccionar Categoría"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="centroCosto"
                    placeholder="Centro de Costo"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="text"
                    value="AUTOMÁTICO"
                    disabled
                    className="border p-2 rounded bg-gray-100"
                />
            </div>

            {/* 🔹 Datos del comprobante */}
            <h3 className="text-lg font-semibold mt-6 mb-2">Datos del comprobante</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    name="rucCliente"
                    placeholder="RUC del Cliente"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="rucEmisor"
                    placeholder="RUC del Emisor"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="date"
                    name="fecha"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="number"
                    name="total"
                    placeholder="Total"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="number"
                    name="igv"
                    placeholder="IGV"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="numeroSerie"
                    placeholder="Número de Serie"
                    className="border p-2 rounded"
                    onChange={handleChange}
                />
            </div>

            {/* 🔹 Glosa */}
            <div className="mt-4">
                <textarea
                    name="glosa"
                    placeholder="Glosa o Nota"
                    className="border p-2 rounded w-full"
                    onChange={handleChange}
                />
            </div>

            {/* 🔹 Botones */}
            <div className="flex gap-4 mt-6">
                <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                    Guardar
                </button>

                <button
                    type="button"
                    className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded"
                    onClick={() => console.log("Cancelar")}
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}