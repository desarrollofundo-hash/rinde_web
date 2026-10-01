import Navbar from "./Navbar";

export default function NavbarDemo() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950">
            <Navbar />
            {/* Contenido de relleno para demostrar el scroll */}
            <main className="pt-24 px-6 max-w-3xl mx-auto space-y-8">
                {Array.from({ length: 6 }).map((_, i) => (
                    <section
                        key={i}
                        className="rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-sm"
                    >
                        <h2 className="text-white font-semibold text-xl mb-2">Sección {i + 1}</h2>
                        <p className="text-white/50 text-sm leading-relaxed">
                            Contenido de ejemplo para demostrar el comportamiento del Navbar al hacer
                            scroll. El fondo del navbar se vuelve más opaco conforme bajas en la página.
                        </p>
                    </section>
                ))}
            </main>
        </div>
    );
}
