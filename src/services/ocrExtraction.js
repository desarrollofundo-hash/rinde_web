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

    return `Eres un extractor de datos PERFECCIONISTA de comprobantes de pago peruanos (SUNAT).
Analiza la imagen del comprobante (factura, boleta, ticket de restaurante, etc).

INSTRUCCIONES CRÍTICAS:
1. Responde SOLO con JSON válido - sin código markdown, sin backticks, sin explicaciones
2. El JSON debe ser parseable directamente
3. Todos los campos deben estar presentes (usa null si no se encuentra)

FORMATO ESPERADO:
{"rucEmisor":"20602094805","rucCliente":null,"serie":"F001","numero":"00015317","tipoComprobante":"01","fecha":"2025-05-29","moneda":"01","igv":"2.20","total":"27.00","razonSocial":"NOMBRE"}

REGLAS DE EXTRACCIÓN:
- "rucEmisor": RUC del NEGOCIO/PROVEEDOR (emisor en encabezado). Solo números, sin puntos.
- "rucCliente": RUC del comprador/cliente si aparece. null si no existe.
- "serie": Letras/números antes del primer o ÚNICO guion. Ej: "F001" de "F001-00015317"
- "numero": Solo dígitos después del ÚLTIMO guion. Ej: "00015317" de "F001-00015317"
- "tipoComprobante": Código: ${codigosValidos}. Si no claro, usa "11".
- "fecha": Formato ISO YYYY-MM-DD. Busca la fecha de EMISIÓN del documento.
- "moneda": "01" (Soles/S/), "03" (Dólares/$). Detecta del símbolo de moneda.
- "igv": Número decimal con punto. El monto del IGV o impuesto. Si no discrimina, usa "0".
- "total": Monto total con decimales. Número puro, sin símbolo.
- "razonSocial": Nombre/razón social del EMISOR (empresa que emite el comprobante).

NO INVENTES DATOS. Si no ves algo claramente, usa null.`;
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
    let contenido = data.choices?.[0]?.message?.content || "";

    // Intentar extraer JSON de varias formas posibles
    let json = null;

    // 1. Buscar JSON dentro de backticks (markdown code blocks)
    const jsonMatch = contenido.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        contenido = jsonMatch[1].trim();
    }

    // 2. Buscar objeto JSON entre llaves
    const jsonObjectMatch = contenido.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
        contenido = jsonObjectMatch[0];
    }

    // 3. Intentar parse
    try {
        json = JSON.parse(contenido);
        return json;
    } catch (e) {
        // 4. Si falla, intentar limpiar caracteres problemáticos
        const cleaned = contenido
            .replace(/[\r\n]+/g, ' ')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .trim();

        try {
            json = JSON.parse(cleaned);
            return json;
        } catch (e2) {
            throw new Error(`No se pudo interpretar respuesta de OpenAI como JSON. Contenido: ${contenido.substring(0, 200)}`);
        }
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
