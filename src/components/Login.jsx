import { useState } from "react";
import { loginCredencial } from "../services/usuarios.js";
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

            console.log("🔍 USER LOGIN:", user);

            const normalizedUser = {
                ...user,
                usuario: user?.usuario ?? form.usuario,
                dni: getUserDni(user, form.usuario),
            };

            // 🔥 GUARDAMOS TAL CUAL (incluye usecod) y aseguramos dni
            localStorage.setItem("user", JSON.stringify(normalizedUser));

            navigate("/company");

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-200">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Rindegasto</h1>
                    <p className="text-gray-500 text-sm">
                        Sistema de gestión de facturas
                    </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Usuario */}
                    <div>
                        <label className="text-sm text-gray-600">
                            Usuario o DNI
                        </label>
                        <input
                            type="text"
                            name="usuario"
                            placeholder="Ingresa tu usuario"
                            onChange={handleChange}
                            className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label className="text-sm text-gray-600">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            name="contrasena"
                            placeholder="••••••••"
                            onChange={handleChange}
                            className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>


                    {/* Error */}
                    {error && (
                        <div className="bg-red-100 text-red-600 text-sm p-2 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    {/* Botón */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                    >
                        {loading ? "Ingresando..." : "Iniciar sesión"}
                    </button>

                </form>

                {/* Footer */}
                <p className="text-xs text-gray-400 text-center mt-6">
                    © 2026 Sistema Rindegasto
                </p>
            </div>
        </div>
    );
}