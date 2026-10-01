import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GetCompany } from "../services/company.js";
import { BackgroundRippleEffect } from "./ui/background-ripple-effect";
import { LogOut, Building2, ShieldCheck, Users, ChevronRight } from "lucide-react";

export default function Company() {
    const [empresas, setEmpresas] = useState([]);
    const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEmpresas = async () => {
            try {
                const rawUser = localStorage.getItem("user");
                if (!rawUser) throw new Error("No hay sesión activa");

                const user = JSON.parse(rawUser);
                const userId = parseInt(user.usecod);
                if (!userId) throw new Error("ID de usuario inválido");

                const data = await GetCompany(userId);
                const lista = Array.isArray(data) ? data : [];
                setEmpresas(lista);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEmpresas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveAndNavigate = (empresa) => {
        const currentUserArea = String(
            empresa?.currentUserArea ??
            empresa?.area ??
            empresa?.gerencia ??
            empresa?.useare ??
            empresa?.idArea ??
            empresa?.idarea ??
            ""
        );

        const normalized = {
            ...empresa,
            id: empresa.id,
            ruc: empresa.ruc,
            nombre: empresa.empresa,
            currentUserArea,
            area: empresa?.area ?? "",
            gerencia: empresa?.gerencia ?? "",
        };

        localStorage.setItem("company", JSON.stringify(normalized));
        localStorage.setItem("empresa", JSON.stringify(normalized));
        navigate("/dashboard");
    };

    const handleContinue = () => {
        if (!empresaSeleccionada) {
            setFormError("Selecciona una empresa para continuar");
            return;
        }
        setFormError("");
        saveAndNavigate(empresaSeleccionada);
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("company");
        localStorage.removeItem("empresa");
        navigate("/");
    };

    return (
        <div className="relative grid min-h-screen overflow-hidden bg-slate-100 md:grid-cols-2">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100" />

            {/* Panel izquierdo — solo desktop */}
            <section className="relative hidden items-center justify-center overflow-hidden border-r border-blue-200/60 bg-linear-to-br from-blue-950 to-slate-900 p-10 text-white md:flex">
                <BackgroundRippleEffect rows={12} cols={8} />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.22),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.08),transparent_34%)]" />
                <div className="relative z-10 max-w-md space-y-6">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-white/20">
                        <Building2 size={28} className="text-blue-200" />
                    </div>
                    <h1 className="text-4xl font-extrabold leading-tight">
                        Selecciona tu empresa
                    </h1>
                    <p className="text-base leading-7 text-blue-100/90">
                        Cada empresa tiene su propio espacio de trabajo. Elige con cuál deseas operar hoy.
                    </p>
                    <ul className="space-y-3 pt-2">
                        {[
                            { icon: ShieldCheck, text: "Gastos aislados por empresa" },
                            { icon: Users, text: "Roles y permisos independientes" },
                            { icon: Building2, text: "Cambia de empresa cuando necesites" },
                        ].map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm text-blue-100/85">
                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                                    <Icon size={14} />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Panel derecho — formulario */}
            <section className="relative z-10 flex items-center justify-center px-5 py-10 sm:px-8">
                <div className="w-full max-w-md">

                    {/* Breadcrumb de pasos */}
                    <div className="mb-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                        <span className="text-slate-400">Inicio de sesión</span>
                        <ChevronRight size={13} className="text-slate-300" />
                        <span className="font-semibold text-blue-600">Selección de empresa</span>
                    </div>

                    {/* Card */}
                    <div className="rounded-3xl border border-blue-200/70 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">

                        {/* Branding */}
                        <div className="mb-7 flex flex-col items-center gap-3 text-center">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 shadow-sm ring-1 ring-blue-200">
                                <Building2 size={22} />
                            </span>
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900">Tu empresa</h1>
                                <p className="text-sm text-slate-500">Elige la empresa con la que trabajarás hoy</p>
                            </div>
                        </div>

                        {/* Error de API */}
                        {error && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {/* Loading */}
                        {loading && (
                            <div className="flex flex-col items-center gap-3 py-10">
                                <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                                <p className="text-sm text-slate-500">Cargando empresas...</p>
                            </div>
                        )}

                        {/* Sin empresas */}
                        {!loading && !error && empresas.length === 0 && (
                            <div className="flex flex-col items-center gap-4 py-8 text-center">
                                <div className="rounded-full bg-amber-50 p-3">
                                    <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">No hay empresas asociadas</p>
                                    <p className="mt-1 text-sm text-slate-500">Contacta al administrador para que te asigne una empresa.</p>
                                </div>
                            </div>
                        )}

                        {/* Dropdown de empresas */}
                        {!loading && empresas.length > 0 && (
                            <>
                                <div className="mb-5">
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Empresa
                                    </label>
                                    <select
                                        value={empresaSeleccionada?.id ?? ""}
                                        onChange={(e) => {
                                            const emp = empresas.find(x => x.id === parseInt(e.target.value));
                                            setEmpresaSeleccionada(emp ?? null);
                                            setFormError("");
                                        }}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                                    >
                                        <option value="" disabled>Selecciona una empresa</option>
                                        {empresas.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.empresa}
                                            </option>
                                        ))}
                                    </select>

                                    {empresaSeleccionada?.ruc && (
                                        <p className="mt-2 flex items-center gap-1.5 text-xs">
                                            <span className="font-medium text-slate-400">RUC:</span>
                                            <span className="font-mono font-semibold text-slate-600">{empresaSeleccionada.ruc}</span>
                                        </p>
                                    )}
                                </div>

                                {formError && (
                                    <p className="mb-3 text-xs font-medium text-red-500">{formError}</p>
                                )}

                                <button
                                    type="button"
                                    onClick={handleContinue}
                                    disabled={!empresaSeleccionada}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-900 to-blue-800 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:from-blue-800 hover:to-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                                >
                                    Continuar
                                </button>
                            </>
                        )}

                        {/* Cerrar sesión */}
                        {!loading && (
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="mt-5 flex w-full items-center justify-center gap-1.5 text-xs text-slate-400 transition hover:text-red-500 cursor-pointer"
                            >
                                <LogOut size={13} />
                                Cerrar sesión
                            </button>
                        )}
                    </div>

                    <p className="mt-5 text-center text-xs text-slate-400">
                        © {new Date().getFullYear()} Rindegasto · AG Santa Azul
                    </p>
                </div>
            </section>
        </div>
    );
}
