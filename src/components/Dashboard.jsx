import { useState } from "react";
import Gastos from "./Gastos";
import Informe from "./Informe";
import Auditoria from "./Auditoria";
import Revision from "./Revisión";

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("Gastos");
    const [activeGastoSubmenu, setActiveGastoSubmenu] = useState("Nuevo Gasto");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    const [empresa] = useState(() => {
        try {
            const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
            return rawEmpresa ? JSON.parse(rawEmpresa) : null;
        } catch {
            return null;
        }
    });


    const gastoSubmenus = ["Nuevo Gasto", "Escanear con QR", "Scanner IA"];

    const handleSelectTab = (tab) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    const handleSelectGastoSubmenu = (submenu) => {
        setActiveGastoSubmenu(submenu);
        setIsMobileMenuOpen(false);
    };



    const renderContent = () => {
        switch (activeTab) {
            case "Gastos":
                return <Gastos subMenu={activeGastoSubmenu} />;
            case "Informe":
                return <Informe />;
            case "Auditoria":
                return <Auditoria />;
            case "Revision":
                return <Revision />;
            default:
                return <p>Selecciona una opción</p>;
        }
    };

    return (
        <div className="h-screen flex bg-gray-100">
            {/* Header móvil */}
            <div className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 shadow sm:hidden">
                <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="rounded bg-gray-800 px-3 py-2 text-sm font-semibold text-white"
                >
                    Menu
                </button>
                <p className="max-w-[70%] truncate text-sm font-semibold text-gray-700">
                    {empresa ? (empresa.empresa || empresa.nombre || empresa.name) : "No seleccionada"}
                </p>
            </div>

            {/* Overlay móvil */}
            {isMobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Cerrar menú"
                    className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed left-0 top-0 z-50 h-full w-72 bg-gray-800 p-4 text-white transition-transform duration-200 sm:static sm:z-auto sm:w-64 sm:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="mb-4 flex items-center justify-between sm:block">
                    <h2 className="text-lg font-semibold">Empresa:</h2>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="rounded bg-gray-700 px-2 py-1 text-xs sm:hidden"
                    >
                        Cerrar
                    </button>
                </div>
                <p className="mb-6">
                    {empresa ? (empresa.empresa || empresa.nombre || empresa.name) : "No seleccionada"}
                </p>

                <h2 className="text-xl font-bold mb-4">Menú</h2>

                {["Gastos", "Informe", "Auditoria", "Revision"].map((tab) => (
                    <div key={tab}>
                        <button
                            onClick={() => handleSelectTab(tab)}
                            className={`mb-2 py-2 px-4 text-left rounded w-full ${activeTab === tab
                                ? "bg-gray-700"
                                : "hover:bg-gray-700"
                                }`}
                        >
                            {tab}
                        </button>

                        {/* Submenú de Gastos */}
                        {tab === "Gastos" && activeTab === "Gastos" && (
                            <div className="mb-2 ml-3">
                                {gastoSubmenus.map((submenu) => (
                                    <button
                                        key={submenu}
                                        onClick={() => handleSelectGastoSubmenu(submenu)}
                                        className={`block w-full rounded px-3 py-1 text-left text-sm ${activeGastoSubmenu === submenu
                                            ? "bg-gray-600 text-white"
                                            : "text-gray-300 hover:bg-gray-700"
                                            }`}
                                    >
                                        {submenu}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto pt-14 sm:pt-0">
                {renderContent()}
            </div>
        </div>
    );
}