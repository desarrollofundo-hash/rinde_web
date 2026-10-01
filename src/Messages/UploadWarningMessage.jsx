import { BadgeAlertIcon } from "@/Icons/BadgeAlertIcon";

export default function UploadWarningMessage() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px",
        border: "1px solid #FCD34D",
        background: "#FFFBEB",
        borderRadius: "8px",
        color: "#92400E",
        fontSize: "13px",
      }}
    >
      <BadgeAlertIcon size={18} style={{ color: "#B45309", flexShrink: 0 }} />
      <span>
        Para subir más de 2 facturas, selecciona{" "}
        <strong>Centro de Costo</strong> y <strong>Categoría</strong>.
      </span>
    </div>
  );
}
