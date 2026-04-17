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
        const currentUserArea = String(
            empresa?.currentUserArea ??
            empresa?.area ??
            empresa?.gerencia ??
            empresa?.useare ??
            empresa?.idArea ??
            empresa?.idarea ??
            ""
        );

        localStorage.setItem(
            "company",
            JSON.stringify({
                ...empresa,
                id: empresa.id,
                ruc: empresa.ruc,
                nombre: empresa.empresa,
                currentUserArea,
                area: empresa?.area ?? "",
                gerencia: empresa?.gerencia ?? "",
            })
        );

        /* console.log("🏢 EMPRESA GUARDADA:", empresa); */

        navigate("/dashboard");
    };
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100" />
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />

            <div className="relative z-10 w-full max-w-lg rounded-3xl border border-blue-200/70 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Selecciona Empresa</h2>
                    <p className="mt-1 text-sm text-slate-500">Elige tu entorno para continuar con la gestión.</p>
                </div>

                {error && (
                    <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div className="mb-5">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Empresa
                    </label>

                    <select
                        value={empresaSeleccionada}
                        onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="" disabled>
                            Selecciona una empresa
                        </option>
                        {empresas.map((empresa) => (
                            <option key={empresa.id} value={empresa.id}>
                                {empresa.empresa}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleContinue}
                    disabled={!empresaSeleccionada}
                    className="w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Continuar
                </button>
            </div>
        </div>
    );
}