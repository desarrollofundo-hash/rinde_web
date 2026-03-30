import CrearGasto from "./Gasto/CrearGasto";
import LecturaScaner from "./Gasto/LecturaScaner";
import EscanerIA from "./Gasto/EscanearIA";

export default function Gastos({ subMenu }) {
    const renderSubmenuContent = () => {
        switch (subMenu) {
            case "Nuevo Gasto":
                return <CrearGasto />;
            case "Escanear con QR":
                return <LecturaScaner />;
            case "Scanner IA":
                return <EscanerIA />;
            default:
                return <CrearGasto />;
        }
    };

    return (
        <div className="">
            {/* <h1 className="text-2xl font-bold mb-4">Gastos</h1>
            <p>Aquí puedes crear y gestionar los gastos de la empresa.</p>
            <p className="mt-2 text-sm text-gray-600">
                Submenú activo: <span className="font-semibold">{subMenu || "Nuevo Gasto"}</span>
            </p> */}
            <div className="">
                {renderSubmenuContent()}
            </div>
        </div>
    );
}