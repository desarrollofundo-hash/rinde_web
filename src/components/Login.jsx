import { useState, useEffect } from "react";
import { loginCredencial } from "../services/usuarios.js";
import { GetRolUsuario } from "../services/rol_usuario";
import {
    DEFAULT_PERMISSIONS,
    extractPermissionsFromRolePayload,
    savePermissionsToStorage,
} from "../services/permissions";
import { useNavigate } from "react-router-dom";
import { Button as MovingBorderButton } from "./ui/moving-border";
import { Eye, EyeOff, Loader2, ShieldCheck, FileText, BarChart3, HelpCircle, X } from "lucide-react";
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
    const [showManual, setShowManual] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (!showManual) return;
        const handleKey = (e) => { if (e.key === "Escape") setShowManual(false); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [showManual]);

    const getUserDni = (user, fallback) => {
        const candidates = [
            user?.dni,
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
            localStorage.removeItem("company");
            localStorage.removeItem("empresa");

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
          <div className="relative z-10 max-w-md space-y-6">
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
            <h1 className="text-4xl font-extrabold leading-tight">
              Rindegasto ASA
            </h1>
            <p className="text-base leading-7 text-blue-100/90">
              Controla, organiza y gestiona tus rendiciones de manera
              centralizada con una experiencia moderna y segura.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                { icon: FileText, text: "Registro y seguimiento de gastos en tiempo real" },
                { icon: ShieldCheck, text: "Flujo de aprobación con auditoría completa" },
                { icon: BarChart3, text: "Reportes y exportación Excel al instante" },
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

            <section className="relative z-10 flex items-center justify-center px-5 py-10 sm:px-8">
              
                
          <div className="relative w-full max-w-md rounded-3xl border border-blue-200/70 bg-white/95 p-6 shadow-xl backdrop-blur sm:p-8">
            <button
              type="button"
              onClick={() => setShowManual(true)}
              title="Ver manual de usuario"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
              aria-label="Abrir manual de usuario"
            >
              <HelpCircle size={16} />
            </button>
            <div className="mb-7 flex flex-col items-center gap-2 text-center">
           {/*    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white text-lg font-black shadow-lg shadow-blue-600/30">
                R
              </span> */}
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Rindegasto</h1>
                <p className="text-sm text-slate-500">Ingresa con tus credenciales para continuar</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="usuario"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  DNI:
                </label>
                <input
                  id="usuario"
                  type="text"
                  name="usuario"
                  placeholder="Ej. 12345678"
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="contrasena"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Contraseña:
                </label>
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
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-linear-to-r from-blue-900 to-blue-800 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/30 hover:from-blue-800 hover:to-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
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

            <p className="mt-8 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} Rindegasto · AG Santa Azul
            </p>
          </div>
        </section>

        {/* ── Modal manual ── */}
        {showManual && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Manual de usuario"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setShowManual(false)}
            />

            {/* Panel */}
            <div className="relative flex h-full w-full max-h-[92vh] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <HelpCircle size={18} className="text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">Manual de usuario — RindeGasto</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManual(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  aria-label="Cerrar manual"
                >
                  <X size={16} />
                </button>
              </div>

              {/* iframe */}
              <iframe
                src="/ManualRindeGasto/manual.html"
                title="Manual RindeGasto"
                className="h-full w-full flex-1 border-0"
              />
            </div>
          </div>
        )}
      </div>
    );
}