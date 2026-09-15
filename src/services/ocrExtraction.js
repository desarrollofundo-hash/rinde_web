// src/services/ocrExtraction.js
//
// Extrae los campos de un comprobante (imagen) usando OpenAI Vision,
// devolviendo EXACTAMENTE el mismo "shape" que parseQrPayload() en
// GastoGeneral.jsx, para poder reusar el mismo merge de setFormData que ya
// usa el flujo de escaneo de QR.
//
// ⚠️ PENSADO PARA PRUEBAS: la clave de OpenAI queda visible en el bundle del navegador
// porque el prefijo VITE_ la expone al cliente. Antes de ir a producción esto debería
// moverse a un endpoint de tu backend real que guarde las claves del lado servidor.

// Mismo catálogo que FALLBACK_TIPOS_COMPROBANTE en GastoGeneral.jsx.
// Si cambias uno, cambia el otro para que no se desincronicen.
export const TIPOS_COMPROBANTE_CATALOGO = [
    { id: "01", name: "FACTURA ELECTRONICA" },
    { id: "03", name: "BOLETA DE VENTA" },
    { id: "07", name: "NOTA DE CREDITO" },
    { id: "08", name: "NOTA DE DEBITO" },
    { id: "10", name: "RECIBO POR HONORARIO" },
    { id: "11", name: "OTROS" },
];

async function convertirFileABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function construirPrompt() {
    const codigosValidos = TIPOS_COMPROBANTE_CATALOGO.map((t) => `${t.id}=${t.name}`).join(", ");

    return `Eres un extractor de datos de comprobantes de pago peruanos (SUNAT).
Analiza la imagen del comprobante (factura, boleta, ticket de restaurante, etc).
El formato y las etiquetas varían mucho según el emisor, así que interpreta el contenido
por significado visual, no busques una palabra exacta.

REGLAS IMPORTANTES:
- "rucEmisor": el RUC del NEGOCIO/PROVEEDOR que VENDE y EMITE el comprobante (encabezado).
  NO es el RUC del cliente/comprador.
- "rucCliente": el RUC del comprador/cliente, si aparece en el documento.
- "serie" y "numero": divide el correlativo por el ÚLTIMO guion.
  Ej: "F001-00015317" -> serie "F001", numero "00015317"
- "tipoComprobante": código según este catálogo: ${codigosValidos}
  Si no calza claramente, usa "11" (OTROS).
- "fecha": fecha de EMISIÓN en formato ISO YYYY-MM-DD.
- "moneda": "01" para Soles (S/, PEN), "03" para Dólares ($, USD).
- "igv" y "total": números con punto decimal, sin símbolo de moneda.
  Si no discrimina IGV, usa 0.
- "razonSocial": nombre o razón social del NEGOCIO EMISOR (no el cliente).
- Si un campo no se puede determinar, usa null (no inventes).

Responde SOLO con JSON válido, sin explicaciones adicionales.`;
}

async function extraerCamposConOpenAI(base64Imagen, mimeType) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Falta VITE_OPENAI_API_KEY en tu .env");
    }

    const prompt = construirPrompt();

    const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Imagen}`,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.2,
            max_tokens: 500,
        }),
    });

    if (!respuesta.ok) {
        const errorData = await respuesta.json();
        throw new Error(
            `OpenAI respondió con error ${respuesta.status}: ${errorData.error?.message || "Error desconocido"}`
        );
    }

    const data = await respuesta.json();
    const contenido = data.choices?.[0]?.message?.content || "";

    try {
        return JSON.parse(contenido);
    } catch {
        throw new Error(`No se pudo interpretar la respuesta de OpenAI como JSON: ${contenido}`);
    }
}

/**
 * Extrae los campos de un comprobante a partir de un archivo (imagen).
 * Devuelve el mismo "shape" que parseQrPayload() en GastoGeneral.jsx.
 *
 * @param {File} file  Imagen ya lista (si venía de un PDF, ya fue convertida
 *                      antes de llegar acá, igual que en el flujo existente).
 */
export async function extraerDatosComprobante(file) {
    const base64Imagen = await convertirFileABase64(file);
    const mimeType = file.type || "image/jpeg";
    const campos = await extraerCamposConOpenAI(base64Imagen, mimeType);

    return {
        rucEmisor: String(campos.rucEmisor || ""),
        rucCliente: String(campos.rucCliente || ""),
        tipoComprobante: String(campos.tipoComprobante || ""),
        serie: String(campos.serie || ""),
        numero: String(campos.numero || ""),
        igv: campos.igv != null ? String(campos.igv) : "",
        total: campos.total != null ? String(campos.total) : "",
        fecha: String(campos.fecha || ""),
        moneda: String(campos.moneda || ""),
        razonSocial: String(campos.razonSocial || ""),
        proveedor: String(campos.razonSocial || ""),
    };
}
