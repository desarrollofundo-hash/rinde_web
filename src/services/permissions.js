/**
 * Gestión centralizada de permisos basada en rol de usuario
 * 
 * Flujo:
 * 1. API /login/rol_usuario_app devuelve array de objetos con idSubMenu y subMenu
 * 2. extractPermissionsFromRolePayload() mapea cada fila a los tabs de Dashboard
 * 3. Se guardan en localStorage y se usan para validar rutas
 */

export const DASHBOARD_PATHS = {
	Gastos: "/dashboard/gastos",
	Informe: "/dashboard/informe",
	Auditoria: "/dashboard/auditoria",
	Revision: "/dashboard/revision",
};

export const DEFAULT_PERMISSIONS = {
	Gastos: true,
	Informe: true,
	Auditoria: true,
	Revision: true,
};

/**
 * Mapeo directo de idSubMenu (ID numérico) al nombre de tab en Dashboard
 * Cada entrada que trae el API tiene un idSubMenu que corresponde a un tab
 */
const API_SUBMENU_ID_TO_TAB = {
	500: "Gastos",    // API: idSubMenu 500 → Dashboard tab: Gastos
	501: "Informe",   // API: idSubMenu 501 → Dashboard tab: Informe
	502: "Auditoria", // API: idSubMenu 502 → Dashboard tab: Auditoria
	503: "Revision",  // API: idSubMenu 503 → Dashboard tab: Revision
};

/**
 * Mapeo de subMenu string (nombre en API) al nombre de tab en Dashboard
 * Nota: API trae "Informes" (plural), pero Dashboard usa "Informe" (singular)
 */
const API_SUBMENU_NAME_TO_TAB = {
	Gastos: "Gastos",
	Informes: "Informe",      // IMPORTANTE: "Informes" del API → "Informe" del tab
	Auditoria: "Auditoria",
	Revision: "Revision",
};

/**
 * Extrae permisos del payload de rol recibido de API
 * @param {Array|Object} payload - Respuesta de GET /login/rol_usuario_app
 * @returns {Object} Objeto con permisos: { Gastos, Informe, Auditoria, Revision }
 * 
 * Ejemplo de entrada:
 * [
 *   { idSubMenu: 500, subMenu: "Gastos", ... },
 *   { idSubMenu: 501, subMenu: "Informes", ... },
 *   { idSubMenu: 502, subMenu: "Auditoria", ... },
 *   { idSubMenu: 503, subMenu: "Revision", ... }
 * ]
 * 
 * Salida:
 * { Gastos: true, Informe: true, Auditoria: true, Revision: true }
 */
export const extractPermissionsFromRolePayload = (payload) => {
	// Normalizar a array
	const rows = Array.isArray(payload) ? payload : [payload].filter(Boolean);
	
	if (rows.length === 0) {
		return { ...DEFAULT_PERMISSIONS };
	}

	// Objeto a completar: por defecto todos false, se habilitan solo si aparecen en API
	const permissions = {
		Gastos: false,
		Informe: false,
		Auditoria: false,
		Revision: false,
	};

	// Iterar cada fila del API y mapear a un tab
	rows.forEach((row) => {
		if (!row) return;

		// Opción 1: Usar idSubMenu (ID numérico, más confiable)
		const idSubMenu = Number.parseInt(String(row.idSubMenu ?? ""), 10);
		if (idSubMenu && API_SUBMENU_ID_TO_TAB[idSubMenu]) {
			const tabName = API_SUBMENU_ID_TO_TAB[idSubMenu];
			permissions[tabName] = true;
		}
		// Opción 2: Usar subMenu (nombre string, como fallback)
		else {
			const subMenuName = String(row.subMenu ?? "").trim();
			if (subMenuName && API_SUBMENU_NAME_TO_TAB[subMenuName]) {
				const tabName = API_SUBMENU_NAME_TO_TAB[subMenuName];
				permissions[tabName] = true;
			}
		}
	});

	return permissions;
};

/**
 * Lee permisos guardados en localStorage
 * @returns {Object} Permisos desde storage, o DEFAULT_PERMISSIONS si no existen
 */
export const readPermissionsFromStorage = () => {
	try {
		const raw = localStorage.getItem("permissions");
		if (!raw) return { ...DEFAULT_PERMISSIONS };
		const parsed = JSON.parse(raw);
		return { ...DEFAULT_PERMISSIONS, ...(parsed || {}) };
	} catch {
		return { ...DEFAULT_PERMISSIONS };
	}
};

/**
 * Guarda permisos en localStorage
 * @param {Object} permissions - Permisos a guardar
 */
export const savePermissionsToStorage = (permissions) => {
	const safe = { ...DEFAULT_PERMISSIONS, ...(permissions || {}) };
	localStorage.setItem("permissions", JSON.stringify(safe));
};

/**
 * Obtiene la primera ruta de dashboard permitida según permisos
 * @param {Object} permissions - Objeto de permisos
 * @returns {string} Ruta permitida o "/dashboard/gastos" por defecto
 */
export const getFirstAllowedDashboardPath = (permissions) => {
	const merged = { ...DEFAULT_PERMISSIONS, ...(permissions || {}) };
	if (merged.Gastos) return DASHBOARD_PATHS.Gastos;
	if (merged.Informe) return DASHBOARD_PATHS.Informe;
	if (merged.Auditoria) return DASHBOARD_PATHS.Auditoria;
	if (merged.Revision) return DASHBOARD_PATHS.Revision;
	return DASHBOARD_PATHS.Gastos; // fallback
};

/**
 * Valida si una ruta de dashboard es permitida
 * @param {string} path - Ruta a validar (ej: "/dashboard/informe")
 * @param {Object} permissions - Objeto de permisos
 * @returns {boolean} true si está permitida
 */
export const isDashboardPathAllowed = (path, permissions) => {
	const merged = { ...DEFAULT_PERMISSIONS, ...(permissions || {}) };

	if (path === DASHBOARD_PATHS.Gastos) return merged.Gastos;
	if (path === DASHBOARD_PATHS.Informe) return merged.Informe;
	if (path === DASHBOARD_PATHS.Auditoria) return merged.Auditoria;
	if (path === DASHBOARD_PATHS.Revision) return merged.Revision;

	return false;
};
