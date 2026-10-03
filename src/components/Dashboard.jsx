import { useEffect, useMemo, useRef, useState } from "react";
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
import { Button as MovingBorderButton } from "./ui/moving-border";
import { BackgroundRippleEffect } from "./ui/background-ripple-effect";
import { Wallet, BarChart2, CheckCircle2, Search, Bell, ChevronDown, Building2 } from "lucide-react";
import AuditoriaIcon from "../Icons/auditoria";

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
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);
    const sidebarRef = useRef(null);
    const companySelectorRef = useRef(null);
    const userMenuRef = useRef(null);
    const mobileUserMenuRef = useRef(null);
    /* console.log(JSON.parse(localStorage.getItem("user"))); */

    const [empresa, setEmpresa] = useState(() => {
        try {
            const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
            return rawEmpresa ? JSON.parse(rawEmpresa) : null;
        } catch {
            return null;
        }
    });

    const [usuario, _setUsuario] = useState(() => {
        try {
            const rawUsuario = localStorage.getItem("user");
            return rawUsuario ? JSON.parse(rawUsuario) : null;
        } catch {
            return null;
        }
    });

    const [isCompanySelectorOpen, setIsCompanySelectorOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
    const [loadingEmpresas, setLoadingEmpresas] = useState(false);
    const [companyError, setCompanyError] = useState("");
    const isDesktopSidebarCollapsed = !isDesktopSidebarExpanded;
    const TAB_ICONS = { Gastos: Wallet, Informe: BarChart2, Auditoria: AuditoriaIcon, Revision: CheckCircle2 };
    const TAB_LABELS = { Gastos: "Gastos", Informe: "Informes", Auditoria: "Auditoría", Revision: "Revisión" };
    const userDisplayName = usuario?.usenam || "No encontrado";
    const companyDisplayName = empresa ? (empresa.empresa || empresa.nombre || empresa.name) : "No seleccionada";

    const getInitials = (value, fallback = "--") => {
        if (!value || typeof value !== "string") return fallback;

        const words = value.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) return fallback;
        if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

        return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
    };

    const userInitials = getInitials(userDisplayName, "US");
    const companyInitials = getInitials(companyDisplayName, "EM");

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
        const handleOutsideClick = (e) => {
            if (
                isCompanySelectorOpen &&
                companySelectorRef.current &&
                !companySelectorRef.current.contains(e.target) &&
                mobileUserMenuRef.current &&
                !mobileUserMenuRef.current.contains(e.target)
            ) {
                setIsCompanySelectorOpen(false);
            }
            if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
            if (isMobileMenuOpen && mobileUserMenuRef.current && !mobileUserMenuRef.current.contains(e.target)) {
                setIsMobileMenuOpen(false);
                setIsCompanySelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isCompanySelectorOpen, isUserMenuOpen, isMobileMenuOpen]);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 1024px)");

        const syncDesktopSidebarState = (event) => {
            if (!event.matches) {
                setIsDesktopSidebarExpanded(true);
                return;
            }

            setIsDesktopSidebarExpanded(false);
        };

        syncDesktopSidebarState(mediaQuery);

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", syncDesktopSidebarState);
            return () => mediaQuery.removeEventListener("change", syncDesktopSidebarState);
        }

        mediaQuery.addListener(syncDesktopSidebarState);
        return () => mediaQuery.removeListener(syncDesktopSidebarState);
    }, []);

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
      <div className="relative flex flex-col h-dvh max-h-dvh overflow-hidden overscroll-none bg-[#f4f8ff]">
        <BackgroundRippleEffect rows={7} cols={10} className="pointer-events-none opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-50/70 via-blue-50/55 to-cyan-50/40" />
        <div className="pointer-events-none absolute -top-28 -right-30 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-30 -left-30 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />

        {/* TOP NAV BAR — desktop only */}
        <header
          className="relative z-50 shrink-0 hidden lg:flex items-center border-b border-slate-200 bg-white px-4 sm:px-6"
          style={{ minHeight: "calc(56px + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}
        >
          {/* Logo */}
       {/*    <div className="flex shrink-0 items-center gap-2 mr-4">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-[11px] font-black">R</span>
            <span className="text-[15px] font-bold text-slate-900 tracking-tight">Rindegasto</span>
          </div> */}

          {/* Company selector */}
          <div ref={companySelectorRef} className="relative shrink-0 mr-6 hidden lg:block">
            <button
              type="button"
              onClick={handleChangeCompany}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <span className="max-w-[220px] truncate font-medium">{companyDisplayName}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isCompanySelectorOpen ? "rotate-180" : ""}`} />
            </button>

            {isCompanySelectorOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Selecciona empresa</p>
                {loadingEmpresas && <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">Cargando empresas...</div>}
                {companyError && !loadingEmpresas && <p className="rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-600">{companyError}</p>}
                {!loadingEmpresas && !companyError && empresasDisponibles.length === 0 && <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">No hay empresas disponibles.</p>}
                {!loadingEmpresas && !companyError && empresasDisponibles.length > 0 && (
                  <div className="max-h-56 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {empresasDisponibles.map((item) => {
                      const itemId = String(item?.id ?? "");
                      const currentId = String(empresa?.id ?? "");
                      const isCurrent = itemId && currentId && itemId === currentId;
                      return (
                        <button key={item?.id} type="button" onClick={() => handleSelectCompany(item)} disabled={isCurrent}
                          className={`w-full rounded-xl border px-2.5 py-2.5 text-left transition ${isCurrent ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-100 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"}`}>
                          <p className="text-xs font-semibold leading-4">{item?.empresa || item?.nombre || "Empresa sin nombre"}</p>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="truncate text-[11px] text-slate-400">RUC: {item?.ruc || "-"}</p>
                            {isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">actual</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: tabs con íconos + underline activo */}
          <nav className="hidden lg:flex items-stretch h-full flex-1 justify-center gap-0">
            {allowedTabs.map((tab) => {
              const Icon = TAB_ICONS[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleSelectTab(tab)}
                  className={`relative flex items-center gap-1.5 px-4 text-sm font-semibold transition-colors duration-150 ${
                    isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {Icon && <Icon size={15} strokeWidth={2} />}
                  <span>{TAB_LABELS[tab] ?? tab}</span>
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-t-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop: derecha — búsqueda + campana + usuario */}
          <div className="hidden lg:flex items-center gap-3 ml-auto shrink-0">
            {/* Búsqueda */}
          {/*   <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent text-sm outline-none w-28 text-slate-700 placeholder:text-slate-400"
              />
            </div>
 */}
            {/* Campana */}
          {/*   <button type="button" className="relative p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
            </button> */}

            {/* Usuario */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100 transition-colors"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold">
                  {userInitials}
                </span>
                <span className="text-sm font-medium text-slate-700 max-w-[200px] truncate">{userDisplayName}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-lg py-1.5 z-50">
                  <button type="button" onClick={() => { setIsUserMenuOpen(false); handleChangeCompany(); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Building2 size={14} className="text-slate-400" />
                    Cambiar empresa
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button type="button" onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <IconLogout className="h-4 w-4 [&_path]:stroke-red-600" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>

        </header>

        <main className="relative flex flex-col flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#f3f6fb] px-2 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:px-3 lg:px-3 lg:py-3 lg:pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="h-full w-full max-w-full overflow-hidden" key={String(empresa?.id ?? empresa?.ruc ?? "no-company")}>
            {renderContent()}
          </div>
        </main>

        {/* Floating pill nav — mobile only */}
        <nav className="lg:hidden fixed z-30 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/60"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          {allowedTabs.map((tab) => {
            const Icon = TAB_ICONS[tab];
            const isActive = activeTab === tab;
            return (
              <button key={tab} type="button" onClick={() => { handleSelectTab(tab); setIsMobileMenuOpen(false); }}
                aria-label={TAB_LABELS[tab] ?? tab}
                className={`relative flex items-center justify-center w-11 h-9 rounded-full transition-all duration-200 ${
                  isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}>
                {Icon && <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />}
              </button>
            );
          })}

          {/* Separador */}
          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          {/* Avatar — abre dropdown hacia arriba */}
          <div ref={mobileUserMenuRef} className="relative">
            <button
              type="button"
              onClick={() => { setIsMobileMenuOpen((v) => !v); setIsCompanySelectorOpen(false); }}
              className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
                isMobileMenuOpen ? "ring-2 ring-blue-500 ring-offset-1" : ""
              }`}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-[11px] font-bold">
                {userInitials}
              </span>
            </button>

            {isMobileMenuOpen && (
              <div className="absolute right-0 bottom-full mb-3 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                {/* Info usuario */}
                <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold">
                    {userInitials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{userDisplayName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 size={10} className="text-slate-400 shrink-0" />
                      <p className="text-[11px] text-slate-500 truncate">{companyDisplayName}</p>
                    </div>
                  </div>
                </div>

                {/* Cambiar empresa */}
                <div className="py-1">
                  <button type="button" onClick={handleChangeCompany}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Building2 size={14} className="text-slate-400 shrink-0" />
                    <span className="flex-1 text-left">Cambiar empresa</span>
                    <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${isCompanySelectorOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isCompanySelectorOpen && (
                    <div className="mx-2 mb-1 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                      {loadingEmpresas && <p className="px-3 py-2 text-xs text-slate-500">Cargando empresas...</p>}
                      {companyError && !loadingEmpresas && <p className="px-3 py-2 text-xs text-red-500">{companyError}</p>}
                      {!loadingEmpresas && !companyError && empresasDisponibles.length === 0 && (
                        <p className="px-3 py-2 text-xs text-slate-500">No hay empresas disponibles.</p>
                      )}
                      {!loadingEmpresas && !companyError && empresasDisponibles.length > 0 && (
                        <div className="max-h-40 overflow-y-auto [scrollbar-width:thin]">
                          {empresasDisponibles.map((item) => {
                            const isCurrent = String(item?.id ?? "") === String(empresa?.id ?? "");
                            return (
                              <button key={item?.id} type="button"
                                onClick={() => { handleSelectCompany(item); setIsMobileMenuOpen(false); }}
                                disabled={isCurrent}
                                className={`w-full px-3 py-2 text-left text-xs border-b border-slate-100 last:border-0 transition-colors ${
                                  isCurrent ? "bg-emerald-50 cursor-not-allowed" : "hover:bg-white"
                                }`}>
                                <p className={`font-semibold leading-4 ${isCurrent ? "text-emerald-800" : "text-slate-700"}`}>
                                  {item?.empresa || item?.nombre || "Empresa sin nombre"}
                                </p>
                                <div className="flex items-center justify-between mt-0.5">
                                  <p className="text-[10px] text-slate-400">RUC: {item?.ruc || "-"}</p>
                                  {isCurrent && <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">actual</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100" />

                {/* Cerrar sesión */}
                <div className="py-1">
                  <button type="button" onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <IconLogout className="h-4 w-4 [&_path]:stroke-red-600" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    );
}