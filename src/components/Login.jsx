import { useState } from "react";
import { loginCredencial } from "../services/usuarios.js";
import { GetRolUsuario } from "../services/rol_usuario";
import {
    DEFAULT_PERMISSIONS,
    extractPermissionsFromRolePayload,
    savePermissionsToStorage,
} from "../services/permissions";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [form, setForm] = useState({
        usuario: "",
        contrasena: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
                } catch (roleError) {
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

            <section className="relative hidden md:flex items-center justify-center border-r border-blue-200/60 bg-linear-to-br from-blue-950 to-slate-900 p-10 text-white">
                <div className="max-w-md space-y-5">
                    <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
                        Plataforma de Gestión de Gastos
                    </span>
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
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario o DNI</label>
                            <input
                                type="text"
                                name="usuario"
                                placeholder="Ej. 12345678"
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Contraseña</label>
                            <input
                                type="password"
                                name="contrasena"
                                placeholder="••••••••"
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
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
                            className="w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Ingresando..." : "Entrar"}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-400">© 2026 Rindegasto</p>
                </div>
            </section>
        </div>
    );
}