import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
//IMPORTS DE COMPONENTES
import Gastos from "./Gastos";
import Informe from "./Informe/Informe";
import Auditoria from "./Auditoria/Auditoria";
import Revision from "./Revision/Revisión";
//IMPORT DE ICONS
import { GetCompany } from "../services/company";
import {
    getFirstAllowedDashboardPath,
    readPermissionsFromStorage,
} from "../services/permissions";
import { IconLogout } from "../Icons/logout";
import { IconCompany } from "../Icons/companyIcon";

export default function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();

    const tabPathMap = useMemo(() => ({
        Gastos: "/dashboard/gastos",
        Informe: "/dashboard/informe",
        Auditoria: "/dashboard/auditoria",
        Revision: "/dashboard/revision",
    }), []);

    const pathTabMap = useMemo(() => ({
        "/dashboard/gastos": "Gastos",
        "/dashboard/informe": "Informe",
        "/dashboard/auditoria": "Auditoria",
        "/dashboard/revision": "Revision",
    }), []);

    const permissions = useMemo(() => readPermissionsFromStorage(), []);
    const tabs = useMemo(() => ["Gastos", "Informe", "Auditoria", "Revision"], []);
    const allowedTabs = useMemo(() => tabs.filter((tab) => Boolean(permissions?.[tab])), [permissions, tabs]);

    const resolveTabFromPath = (pathname) => {
        const resolved = pathTabMap[pathname] || "Gastos";
        if (allowedTabs.includes(resolved)) return resolved;
        return allowedTabs[0] || "Gastos";
    };

    const activeTab = resolveTabFromPath(location.pathname);
    const [activeGastoSubmenu, setActiveGastoSubmenu] = useState("Nuevo Gasto");
    const [gastoRefreshToken, setGastoRefreshToken] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    /* console.log(JSON.parse(localStorage.getItem("user"))); */

    const [empresa, setEmpresa] = useState(() => {
        try {
            const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
            return rawEmpresa ? JSON.parse(rawEmpresa) : null;
        } catch {
            return null;
        }
    });

    const [usuario, setUsuario] = useState(() => {
        try {
            const rawUsuario = localStorage.getItem("user");
            return rawUsuario ? JSON.parse(rawUsuario) : null;
        } catch {
            return null;
        }
    });

    const [isCompanySelectorOpen, setIsCompanySelectorOpen] = useState(false);
    const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
    const [loadingEmpresas, setLoadingEmpresas] = useState(false);
    const [companyError, setCompanyError] = useState("");

    //LLAMADA DE SUB MENUS
    const gastoSubmenus = ["Nuevo Gasto"];
    useEffect(() => {
        const currentTab = pathTabMap[location.pathname];
        if (currentTab && allowedTabs.includes(currentTab)) return;

        const fallbackPath = getFirstAllowedDashboardPath(permissions);
        if (location.pathname !== fallbackPath) {
            navigate(fallbackPath, { replace: true });
        }
    }, [allowedTabs, location.pathname, navigate, pathTabMap, permissions]);

    useEffect(() => {
        if (!isMobileMenuOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileMenuOpen]);

    const handleSelectTab = (tab) => {
        setIsMobileMenuOpen(false);

        const nextPath = tabPathMap[tab] || "/dashboard/gastos";
        if (location.pathname !== nextPath) {
            navigate(nextPath);
        }
    };

    const handleSelectGastoSubmenu = (submenu) => {
        setActiveGastoSubmenu(submenu);
        if (submenu === "Nuevo Gasto") {
            setGastoRefreshToken((prev) => prev + 1);
        }
        setIsMobileMenuOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("company");
        localStorage.removeItem("empresa");
        localStorage.removeItem("permissions");
        navigate("/login", { replace: true });
    };

    const handleChangeCompany = async () => {
        const nextOpen = !isCompanySelectorOpen;
        setIsCompanySelectorOpen(nextOpen);

        if (!nextOpen || empresasDisponibles.length > 0) {
            return;
        }

        setCompanyError("");
        setLoadingEmpresas(true);

        try {
            const rawUser = localStorage.getItem("user");
            if (!rawUser) throw new Error("No hay sesión de usuario");

            const user = JSON.parse(rawUser);
            const userId = parseInt(user?.usecod, 10);
            if (!userId) throw new Error("ID de usuario inválido");

            const data = await GetCompany(userId);
            setEmpresasDisponibles(Array.isArray(data) ? data : []);
        } catch (error) {
            setCompanyError(error?.message || "No se pudo cargar empresas");
        } finally {
            setLoadingEmpresas(false);
        }
    };

    const handleSelectCompany = (selectedCompany) => {
        if (!selectedCompany) return;

        const currentUserArea = String(
            selectedCompany?.currentUserArea ??
            selectedCompany?.area ??
            selectedCompany?.gerencia ??
            selectedCompany?.useare ??
            selectedCompany?.idArea ??
            selectedCompany?.idarea ??
            ""
        );

        const normalizedCompany = {
            ...selectedCompany,
            id: selectedCompany?.id,
            ruc: selectedCompany?.ruc,
            nombre: selectedCompany?.empresa,
            currentUserArea,
            area: selectedCompany?.area ?? "",
            gerencia: selectedCompany?.gerencia ?? "",
        };

        localStorage.setItem("company", JSON.stringify(normalizedCompany));
        localStorage.setItem("empresa", JSON.stringify(normalizedCompany));

        setEmpresa(normalizedCompany);
        setIsCompanySelectorOpen(false);
        setIsMobileMenuOpen(false);

        const targetPath = tabPathMap[activeTab] || "/dashboard/gastos";
        navigate(targetPath, { replace: true });

        // Permite que componentes que escuchen eventos reactiven sus consultas.
        window.dispatchEvent(new Event("company:changed"));
    };



    const renderContent = () => {
        switch (activeTab) {
            case "Gastos":
                return <Gastos subMenu={activeGastoSubmenu} refreshToken={gastoRefreshToken} />;
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
        <div className="relative flex h-screen max-h-screen overflow-hidden bg-slate-100">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100" />
            <div className="pointer-events-none absolute -top-28 -right-30 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-30 -left-30 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />

            <div className="fixed left-0 right-0 top-0 z-30 border-b border-blue-200/70 bg-white/95 px-3 py-3 shadow-sm backdrop-blur lg:hidden">
                <div className="flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800"
                    >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-700" />
                        Menú
                    </button>
                    <p className="max-w-[65%] truncate text-sm font-semibold text-slate-700">
                        {empresa ? (empresa.empresa || empresa.nombre || empresa.name) : "No seleccionada"}
                    </p>
                </div>
            </div>

            {isMobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Cerrar menú"
                    className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[1px] lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-50 flex h-full w-[86vw] max-w-76 flex-col border-r border-blue-200/70 bg-white/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl transition-transform duration-300 sm:p-4 lg:static lg:z-auto lg:w-70 lg:translate-x-0 lg:shadow-none ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Tarjeta de perfil */}
                <div className="mb-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-4 shadow-sm">
                    {/* Usuario */}
                    <div className="flex items-center gap-3">

                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Usuario
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-800">
                                {usuario ? usuario.usenam : "No encontrado"}
                            </p>
                        </div>
                    </div>

                    <div className="my-3 border-t border-blue-100" />

                    {/* Empresa */}
                    <div className="flex items-center gap-3">

                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Empresa
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-800">
                                {empresa ? (empresa.empresa || empresa.nombre || empresa.name) : "No seleccionada"}
                            </p>
                        </div>
                    </div>
                </div>



                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">Navegación</h2>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="rounded-md border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 lg:hidden"
                    >
                        Cerrar
                    </button>
                </div>

                <nav className="space-y-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {allowedTabs.map((tab) => (
                        <div key={tab} className="rounded-xl">
                            <button
                                type="button"
                                onClick={() => handleSelectTab(tab)}
                                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${activeTab === tab
                                    ? "bg-blue-900 text-white shadow"
                                    : "text-slate-700 hover:bg-blue-50"
                                    }`}
                            >
                                <span>{tab}</span>
                                <span className={`h-2 w-2 rounded-full transition ${activeTab === tab ? "bg-blue-200" : "bg-slate-300 group-hover:bg-blue-300"}`} />
                            </button>

                            {tab === "Gastos" && activeTab === "Gastos" && (
                                <div className="mt-1 space-y-1 pl-2">
                                    {gastoSubmenus.map((submenu) => (
                                        <button
                                            key={submenu}
                                            type="button"
                                            onClick={() => handleSelectGastoSubmenu(submenu)}
                                            className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium transition ${activeGastoSubmenu === submenu
                                                ? "bg-blue-100 text-blue-900"
                                                : "text-slate-600 hover:bg-blue-50"
                                                }`}
                                        >
                                            {submenu}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="mt-auto space-y-3 border-t border-blue-200/70 pt-4">
                    <button
                        type="button"
                        onClick={handleChangeCompany}
                        className="group inline-flex w-full items-center justify-between rounded-xl border border-blue-700/20 bg-linear-to-r from-blue-700 to-blue-600 px-3.5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:from-blue-800 hover:to-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 cursor-pointer"
                    >
                        <IconCompany className="h-5 w-5" />
                        <span>{isCompanySelectorOpen ? "Ocultar empresas" : "Cambiar de empresa"}</span>

                        <span className={`text-base leading-none transition-transform ${isCompanySelectorOpen ? "rotate-180" : ""}`}>
                            ▾
                        </span>
                    </button>

                    {isCompanySelectorOpen && (
                        <div className="rounded-2xl border border-blue-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur-sm">
                            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Selecciona empresa
                            </p>

                            {loadingEmpresas && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                                    Cargando empresas...
                                </div>
                            )}

                            {companyError && !loadingEmpresas && (
                                <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-600">
                                    {companyError}
                                </p>
                            )}

                            {!loadingEmpresas && !companyError && empresasDisponibles.length === 0 && (
                                <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                                    No hay empresas disponibles.
                                </p>
                            )}

                            {!loadingEmpresas && !companyError && empresasDisponibles.length > 0 && (
                                <div className="max-h-44 space-y-1 overflow-y-auto pr-1 lg:max-h-56 [scrollbar-width:thin]">
                                    {empresasDisponibles.map((item) => {
                                        const itemId = String(item?.id ?? "");
                                        const currentId = String(empresa?.id ?? "");
                                        const isCurrent = itemId && currentId && itemId === currentId;

                                        return (
                                            <button
                                                key={item?.id}
                                                type="button"
                                                onClick={() => handleSelectCompany(item)}
                                                disabled={isCurrent}
                                                className={`w-full rounded-xl border px-2.5 py-2.5 text-left transition ${isCurrent
                                                    ? "cursor-not-allowed border-emerald-200 bg-emerald-50/90 text-emerald-800"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 active:scale-[0.99]"
                                                    }`}
                                            >
                                                <p className="text-xs font-semibold leading-4">
                                                    {item?.empresa || item?.nombre || "Empresa sin nombre"}
                                                </p>
                                                <div className="mt-0.5 flex items-center justify-between gap-2">
                                                    <p className="truncate text-[11px] text-slate-500">
                                                        RUC: {item?.ruc || "-"}
                                                    </p>
                                                    {isCurrent && (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                                            actual
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}


                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-red-500/20 bg-red-600 px-3.5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 cursor-pointer"
                    >
                        <IconLogout className="mr-1 h-5 w-5 text-white [&_path]:stroke-white" />
                        Cerrar sesión
                    </button>
                </div>
            </aside >

            <main className="relative z-10 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pt-[calc(3.75rem+env(safe-area-inset-top))] lg:pt-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="w-full" key={String(empresa?.id ?? empresa?.ruc ?? "no-company")}>
                    {renderContent()}
                </div>
            </main>
        </div >
    );
}