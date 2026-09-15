/**
 * Sistema de colores empresarial para RindeGasto
 * Paleta profesional SaaS: Grises + Azul accent
 */

export const THEME = {
  // Colores principales
  primary: {
    dark: '#0f172a',      // slate-900: Fondo, texto principal
    light: '#f8fafc',     // slate-50: Fondo claro
  },

  // Accent - Azul corporativo
  accent: {
    50: '#eff6ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // ← Color principal (sky-500)
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c3d66',
  },

  // Estados
  success: '#10b981',     // emerald-500
  warning: '#f59e0b',     // amber-500
  error: '#ef4444',       // red-500
  info: '#3b82f6',        // blue-500

  // Grises neutrales
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Bordes y separadores
  border: {
    light: '#e5e7eb',     // gray-200
    default: '#d1d5db',   // gray-300
    dark: '#9ca3af',      // gray-400
  },

  // Fondos
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',  // gray-50
    tertiary: '#f3f4f6',   // gray-100
  },
};

/**
 * Clases Tailwind mapeadas a colores del sistema
 * Facilita cambios globales y consistencia
 */
export const COLOR_CLASSES = {
  // Botones
  button: {
    primary: 'bg-sky-500 hover:bg-sky-600 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
  },

  // Cards y contenedores
  card: {
    default: 'bg-white border border-gray-200',
    hover: 'hover:border-sky-300 hover:shadow-md transition-all',
    selected: 'bg-sky-50 border border-sky-300',
  },

  // Badges
  badge: {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
  },

  // Inputs
  input: {
    default: 'border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100',
    error: 'border border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100',
    disabled: 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60',
  },

  // Text
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    tertiary: 'text-gray-500',
    muted: 'text-gray-400',
    accent: 'text-sky-600',
  },
};

/**
 * Sombras consistentes
 */
export const SHADOWS = {
  sm: 'shadow-sm',           // Cards pequeñas
  md: 'shadow-md',           // Cards normales
  lg: 'shadow-lg',           // Cards hover
  xl: 'shadow-xl',           // Modals
};

export default THEME;
