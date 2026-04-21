import { useState } from "react";
import { loginCredencial } from "../services/usuarios.js";
import { GetRolUsuario } from "../services/rol_usuario";
import {
    DEFAULT_PERMISSIONS,
    extractPermissionsFromRolePayload,
    savePermissionsToStorage,
} from "../services/permissions";
import { useNavigate } from "react-router-dom";
import { Button as MovingBorderButton } from "./ui/moving-border";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { IconSignIn } from "@/Icons/signIn.jsx";
import { BackgroundRippleEffect } from "./ui/background-ripple-effect";

export default function Login() {
    const [form, setForm] = useState({
        usuario: "",
        contrasena: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    const getUserDni = (user, fallback) => {
        const candidates = [
            user?.dni,
            user?.DNI,
            user?.usedoc,
            user?.nrodoc,
            user?.numdoc,
            user?.documento,
            user?.docident,
            user?.doc,
        ];

        const value = candidates.find(
            (item) => item !== undefined && item !== null && String(item).trim() !== ""
        );

        if (value) return String(value).trim();

        const fallbackValue = String(fallback || "").trim();
        const isLikelyDni = /^\d{8,11}$/.test(fallbackValue);

        return isLikelyDni ? fallbackValue : "";
    };

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.usuario || !form.contrasena) {
            setError("Completa todos los campos");
            return;
        }

        setLoading(true);

        try {
            const user = await loginCredencial(form);

            /* console.log("🔍 USER LOGIN:", user); */

            const normalizedUser = {
                ...user,
                usuario: user?.usuario ?? form.usuario,
                dni: getUserDni(user, form.usuario),
            };

            // 🔥 GUARDAMOS TAL CUAL (incluye usecod) y aseguramos dni
            localStorage.setItem("user", JSON.stringify(normalizedUser));

            const resolvedUserId = Number.parseInt(
                String(normalizedUser?.usecod ?? normalizedUser?.id ?? normalizedUser?.iduser ?? 0),
                10
            );

            if (resolvedUserId > 0) {
                try {
                    const rolePayload = await GetRolUsuario({
                        iduser: String(resolvedUserId),
                        idapp: "12",
                    });

                    const permissions = extractPermissionsFromRolePayload(rolePayload);
                    savePermissionsToStorage(permissions);
                } catch {
                    /* console.warn("⚠️ No se pudo cargar rol de usuario. Se usarán permisos por defecto.", roleError); */
                    savePermissionsToStorage(DEFAULT_PERMISSIONS);
                }
            } else {
                savePermissionsToStorage(DEFAULT_PERMISSIONS);
            }

            navigate("/company");

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="relative grid min-h-screen overflow-hidden bg-slate-100 md:grid-cols-2">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100" />
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />

            <section className="relative hidden items-center justify-center overflow-hidden border-r border-blue-200/60 bg-linear-to-br from-blue-950 to-slate-900 p-10 text-white md:flex">
                <BackgroundRippleEffect rows={12} cols={8} />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.22),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.08),transparent_34%)]" />
                <div className="relative z-10 max-w-md space-y-5">
                    <MovingBorderButton
                        as="div"
                        borderRadius="9999px"
                        duration={3000}
                        containerClassName="inline-flex h-auto w-auto p-px text-xs"
                        borderClassName="h-12 w-12 bg-[radial-gradient(#e0f2fe_30%,#7dd3fc_60%,transparent_72%)] opacity-90"
                        className="inline-flex border border-white/25 bg-white/10 px-3 py-1 font-semibold uppercase tracking-[0.14em] text-blue-100"
                    >
                        Plataforma de Gestión de Gastos
                    </MovingBorderButton>
                    <h1 className="text-4xl font-extrabold leading-tight">Rindegasto ASA </h1>
                    <p className="text-base leading-7 text-blue-100/90">
                        Controla, organiza y gestiona tus facturas de manera centralizada con una experiencia moderna y segura.
                    </p>

                </div>
            </section>

            <section className="relative z-10 flex items-center justify-center px-5 py-10 sm:px-8">
                <div className="w-full max-w-md rounded-3xl border border-blue-200/70 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">
                    <div className="mb-8 text-center md:hidden">
                        <h1 className="text-3xl font-extrabold text-slate-900">Rindegasto</h1>
                        <p className="mt-1 text-sm text-slate-500">Gestión de rendiciones corporativas</p>
                    </div>

                    <div className="mb-6 space-y-1 text-center">
                        <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
                        <p className="text-sm text-slate-500">Ingresa con tus credenciales para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="usuario" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario:</label>
                            <input
                                id="usuario"
                                type="text"
                                name="usuario"
                                placeholder="Ej. 12345678"
                                onChange={handleChange}
                                disabled={loading}
                                autoComplete="username"
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                        </div>

                        <div>
                            <label htmlFor="contrasena" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Contraseña:</label>
                            <div className="relative">
                                <input
                                    id="contrasena"
                                    type={showPassword ? "text" : "password"}
                                    name="contrasena"
                                    placeholder="••••••••"
                                    onChange={handleChange}
                                    disabled={loading}
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    disabled={loading}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                                <p className="font-semibold">No se pudo iniciar sesión</p>
                                <p className="text-red-500">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-linear-to-r from-blue-900 to-blue-800 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/30 hover:from-blue-800 hover:to-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <span className="inline-flex transition-transform duration-300 group-hover:translate-x-0.5">
                                    <IconSignIn size={18} className="drop-shadow-sm" />
                                </span>
                            )}
                            {loading ? "Ingresando..." : "Entrar"}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-400">© 2026 Rindegasto</p>
                </div>
            </section>
        </div>
    );
}