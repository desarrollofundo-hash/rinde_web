import { motion } from "framer-motion";
import {
  Receipt,
  FileText,
  ClipboardCheck,
  Eye,
} from "lucide-react";

import { cn } from "@/lib/utils";

const DEFAULT_NAV_ITEMS = [
  { label: "Gastos", icon: Receipt },
  { label: "Informe", icon: FileText },
  { label: "Auditoria", icon: ClipboardCheck },
  { label: "Revision", icon: Eye },
];

const MOBILE_LABEL_WIDTH = 72;

export function BottomNavBar({
  className,
  activeIndex = 0,
  onSelect,
  items = DEFAULT_NAV_ITEMS,
  stickyBottom = false,
}) {
  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Bottom Navigation"
      className={cn(
        "bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/60 rounded-full flex items-center p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl space-x-0.5 min-w-[280px] max-w-[95vw] h-[52px]",
        stickyBottom && "fixed inset-x-0 bottom-4 mx-auto z-20 w-fit",
        className,
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;

        return (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center gap-0 px-3 py-2 rounded-full transition-colors duration-200 relative h-10 min-w-[44px] min-h-[40px] max-h-[44px] cursor-pointer",
              isActive
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 gap-2"
                : "bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
            )}
            onClick={() => onSelect?.(item.label, idx)}
            aria-label={item.label}
            type="button"
          >
            <Icon
              size={20}
              strokeWidth={2}
              aria-hidden
              className="shrink-0 transition-colors duration-200"
            />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${MOBILE_LABEL_WIDTH}px` : "0px",
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? "4px" : "0px",
              }}
              transition={{
                width: { type: "spring", stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className="overflow-hidden flex items-center max-w-[72px]"
            >
              <span
                className={cn(
                  "font-semibold text-xs whitespace-nowrap select-none transition-opacity duration-200 overflow-hidden text-ellipsis leading-[1.9]",
                  isActive ? "text-white opacity-100" : "opacity-0",
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
