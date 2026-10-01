import { useState, useEffect } from "react";

const NAV_LINKS = [
    { label: "Inicio", href: "#" },
    { label: "Características", href: "#features" },
    { label: "Precios", href: "#pricing" },
    { label: "Contacto", href: "#contact" },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Cerrar menú al redimensionar a desktop
    useEffect(() => {
        const onResize = () => { if (window.innerWidth >= 768) setIsOpen(false); };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    return (
        <header
            className={[
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                scrolled
                    ? "bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-lg shadow-black/5"
                    : "bg-white/5 backdrop-blur-sm border-b border-white/10",
            ].join(" ")}
        >
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <a
                        href="#"
                        className="flex items-center gap-2 flex-shrink-0 group"
                        aria-label="Inicio"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
                            <span className="text-white font-bold text-sm">R</span>
                        </div>
                        <span className="text-white font-semibold text-lg tracking-tight hidden sm:block">
                            Rinde<span className="text-violet-300">Web</span>
                        </span>
                    </a>

                    {/* Links desktop */}
                    <ul className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map(({ label, href }) => (
                            <li key={label}>
                                <a
                                    href={href}
                                    className="relative px-4 py-2 text-sm font-medium text-white/80 hover:text-white rounded-lg transition-all duration-200 hover:bg-white/10 group"
                                >
                                    {label}
                                    <span className="absolute bottom-1 left-4 right-4 h-px bg-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                                </a>
                            </li>
                        ))}
                    </ul>

                    {/* CTA + Hamburguesa */}
                    <div className="flex items-center gap-3">
                        <a
                            href="#login"
                            className="hidden md:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all duration-200 shadow-md hover:shadow-violet-500/30 hover:scale-[1.03] active:scale-95"
                        >
                            Iniciar Sesión
                        </a>

                        {/* Botón hamburguesa */}
                        <button
                            onClick={() => setIsOpen((v) => !v)}
                            aria-expanded={isOpen}
                            aria-label="Toggle menú"
                            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors duration-200 gap-[5px]"
                        >
                            <span
                                className={[
                                    "block w-5 h-0.5 bg-white rounded-full transition-all duration-300",
                                    isOpen ? "translate-y-[7px] rotate-45" : "",
                                ].join(" ")}
                            />
                            <span
                                className={[
                                    "block w-5 h-0.5 bg-white rounded-full transition-all duration-300",
                                    isOpen ? "opacity-0 scale-x-0" : "",
                                ].join(" ")}
                            />
                            <span
                                className={[
                                    "block w-5 h-0.5 bg-white rounded-full transition-all duration-300",
                                    isOpen ? "-translate-y-[7px] -rotate-45" : "",
                                ].join(" ")}
                            />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Menú móvil desplegable */}
            <div
                className={[
                    "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
                ].join(" ")}
            >
                <div className="bg-white/10 backdrop-blur-lg border-t border-white/10 px-4 py-3 flex flex-col gap-1">
                    {NAV_LINKS.map(({ label, href }) => (
                        <a
                            key={label}
                            href={href}
                            onClick={() => setIsOpen(false)}
                            className="block px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                        >
                            {label}
                        </a>
                    ))}
                    <a
                        href="#login"
                        onClick={() => setIsOpen(false)}
                        className="mt-2 flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all duration-200"
                    >
                        Iniciar Sesión
                    </a>
                </div>
            </div>
        </header>
    );
}
