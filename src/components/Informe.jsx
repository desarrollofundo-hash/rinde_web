import React, { useEffect, useState } from "react";
import { getListaInformes } from "../services//listar/listar_informes";

export default function Informe() {
    const [informes, setInformes] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchInformes = async () => {
            setLoading(true);

            try {
                // ✅ obtener datos del localStorage
                const userRaw = localStorage.getItem("user");
                const companyRaw = localStorage.getItem("company");

                const userData = userRaw ? JSON.parse(userRaw) : null;
                const companyData = companyRaw ? JSON.parse(companyRaw) : null;

                console.log("👤 USER:", userData);
                console.log("🏢 COMPANY:", companyData);

                // 🚨 validación
                if (!userData) {
                    throw new Error("No hay usuario logueado");
                }

                if (!companyData) {
                    throw new Error("No hay empresa seleccionada");
                }

                // ✅ llamada API
                const data = await getListaInformes({
                    id: "1",
                    idrend: "1",
                    user: String(userData.usecod),
                    ruc: String(companyData.ruc),
                });

                console.log("📥 INFORMES:", data);

                setInformes(data);

            } catch (error) {
                console.error("❌ Error:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInformes();
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Informe</h1>

            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
                Nuevo Informe
            </button>

            {loading && <p>Cargando informes...</p>}

            {!loading && informes.length === 0 && (
                <p>No hay informes disponibles</p>
            )}

            {!loading && informes.length > 0 && (
                <table className="w-full border border-gray-300">
                    <thead>
                        <tr>
                            <th className="border px-4 py-2">#</th>
                            <th className="border px-4 py-2">DNI</th>
                            <th className="border px-4 py-2">RUC</th>
                            <th className="border px-4 py-2">Título</th>
                            <th className="border px-4 py-2">Política</th>
                            <th className="border px-4 py-2">Estado Actual</th>
                            <th className="border px-4 py-2">Fecha Creación</th>
                        </tr>
                    </thead>

                    <tbody>
                        {informes.map((inf, index) => (
                            <tr key={index}>
                                <td className="border px-4 py-2">{index + 1}</td>
                                <td className="border px-4 py-2">{inf.dni}</td>
                                <td className="border px-4 py-2">{inf.ruc}</td>
                                <td className="border px-4 py-2">{inf.titulo}</td>
                                <td className="border px-4 py-2">{inf.politica}</td>
                                <td className="border px-4 py-2">{inf.estadoActual}</td>
                                <td className="border px-4 py-2">{inf.fecCre?.split("T")[0]}    </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}