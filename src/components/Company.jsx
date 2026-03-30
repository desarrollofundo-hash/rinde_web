import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GetCompany } from "../services/company.js";

export default function Company() {
    const [empresas, setEmpresas] = useState([]);
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEmpresas = async () => {
            try {
                const rawUser = localStorage.getItem("user");
                if (!rawUser) throw new Error("No hay sesión");

                const user = JSON.parse(rawUser);
                const userId = parseInt(user.usecod);
                if (!userId) throw new Error("ID inválido");

                const data = await GetCompany(userId);
                setEmpresas(data);
            } catch (err) {
                setError(err.message);
                console.error(err);
            }
        };

        fetchEmpresas();
    }, []);

    const handleContinue = () => {
        if (!empresaSeleccionada) {
            alert("Selecciona una empresa antes de continuar");
            return;
        }

        const empresa = empresas.find(
            e => e.id === parseInt(empresaSeleccionada)
        );

        if (!empresa) {
            alert("La empresa seleccionada no es válida");
            return;
        }

        // ✅ guardar empresa correcta
        localStorage.setItem(
            "company",
            JSON.stringify({
                id: empresa.id,
                ruc: empresa.ruc,
                nombre: empresa.empresa,
            })
        );

        console.log("🏢 EMPRESA GUARDADA:", empresa);

        navigate("/dashboard");
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md bg-white p-6 rounded-xl shadow">
                <h2 className="text-xl font-bold mb-4 text-center">
                    Selecciona Empresa
                </h2>

                {error && <p className="text-red-500 text-center">{error}</p>}

                <select
                    value={empresaSeleccionada}
                    onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                    className="w-full p-2 border rounded-lg mb-4"
                >
                    <option value="">-- Selecciona --</option>
                    {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                            {empresa.empresa}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleContinue}
                    disabled={!empresaSeleccionada}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continuar
                </button>
            </div>
        </div>
    );
}