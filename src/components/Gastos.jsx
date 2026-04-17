import CrearGasto from "./Gasto/CrearGasto";
import LecturaScaner from "./Gasto/LecturaScaner";
import EscanerIA from "./Gasto/EscanearIA";

export default function Gastos({ subMenu, refreshToken = 0 }) {
    const renderSubmenuContent = () => {
        switch (subMenu) {
            case "Nuevo Gasto":
                return <CrearGasto key={`nuevo-gasto-${refreshToken}`} />;
            case "Escanear con QR":
                return <LecturaScaner />;
            case "Scanner IA":
                return <EscanerIA />;
            default:
                return <CrearGasto key={`nuevo-gasto-default-${refreshToken}`} />;
        }   
    };

    return (
        <div className="">
            <div className="">
                {renderSubmenuContent()}
            </div>
        </div>
    );
}