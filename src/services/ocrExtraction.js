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
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function construirPrompt() {
  const codigosValidos = TIPOS_COMPROBANTE_CATALOGO.map(
    (t) => `${t.id}=${t.name}`,
  ).join(", ");

  return `EXTRACTOR DE DATOS DE COMPROBANTES PERUANOS (SUNAT) - PRECISIÓN MÁXIMA

Analiza la imagen del comprobante y extrae TODOS los campos según estas reglas EXACTAS.

INSTRUCCIONES CRÍTICAS:
1. Responde SOLO con JSON válido - sin markdown, sin backticks, sin explicaciones extra
2. Incluir SIEMPRE los 10 campos, usar null si no existe
3. Números sin símbolos ($,S/), sin puntos de miles

ESTRUCTURA JSON REQUERIDA (EJEMPLO REAL):
{
  "rucEmisor": "10077149231",
  "razonSocial": "GUES HOUSE",
  "rucCliente": "20603461534",
  "razonSocialCliente": "AGRICOLA SANTA AZUL S.A.C",
  "tipoComprobante": "01",
  "serie": "FPP1",
  "numero": "002356",
  "fecha": "2025-05-29",
  "moneda": "01",
  "igv": "0.77",
  "total": "27.00"
}

EXTRACCIÓN OBLIGATORIA DE CAMPOS:

1. "rucEmisor" (CRÍTICO):
   - RUC quien EMITE la factura (en el encabezado/membrete)
   - Solo 11 dígitos, sin puntos
   - Ejemplo: "10077149231"

2. "rucCliente" (CRÍTICO - OBLIGATORIO BUSCAR):
   - RUC del COMPRADOR/CLIENTE (quien RECIBE la factura)
   - Busca después de "Cliente:", "R.U.C:", "RUC Cliente:", etc
   - En la sección de "Cliente" o "Comprador" del documento
   - Solo 11 dígitos, sin puntos
   - Ejemplo: "20603461534"
   - Si NO hay cliente explícito: usa null

3. "razonSocialCliente" (CRÍTICO - OBLIGATORIO BUSCAR):
   - NOMBRE/RAZÓN SOCIAL del CLIENTE (quien compra/recibe)
   - Busca en la sección "Cliente:", "Señor(es):", "Razón Social:", cerca del rucCliente
   - NO confundir con razonSocial (que es del emisor)
   - Ejemplo: "AGRICOLA SANTA AZUL S.A.C"
   - Si NO aparece explícito: usa null (no inventar)

4. "tipoComprobante": Código ${codigosValidos}. Defecto "11".

4. "serie": Letras/números ANTES del guion. Ej: "FPP1" de "FPP1-002356"

5. "numero": Solo dígitos DESPUÉS del último guion. Ej: "002356"

6. "fecha": ISO YYYY-MM-DD (fecha de EMISIÓN)

7. "moneda": "01" (Soles/S/PEN) o "03" (Dólares/USD)

8. "igv": Monto IGV con punto decimal. Si no discrimina: "0"

9. "total": Monto total con punto decimal, sin símbolo

10. "razonSocial": Nombre de quien EMITE (no del cliente)

IMPORTANTE: NO INVENTAR. Si está claro que falta un dato, usa null exacto.`;
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
      Authorization: `Bearer ${apiKey}`,
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
      `OpenAI respondió con error ${respuesta.status}: ${errorData.error?.message || "Error desconocido"}`,
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
      .replace(/[\r\n]+/g, " ")
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .trim();

    try {
      json = JSON.parse(cleaned);
      return json;
    } catch (e2) {
      throw new Error(
        `No se pudo interpretar respuesta de OpenAI como JSON. Contenido: ${contenido.substring(0, 200)}`,
      );
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

  // VALIDACIÓN CRÍTICA: rucCliente es obligatorio para validar contra empresa
  const rucClienteExtraido = String(campos.rucCliente || "").replace(/\D/g, "").trim();
  const razonSocialClienteExtraida = String(campos.razonSocialCliente || "").trim();

  if (!rucClienteExtraido) {
    console.warn("⚠️ ADVERTENCIA: No se pudo extraer el RUC del Cliente de la factura");
    console.log("Campos recibidos:", campos);
  }

  return {
    rucEmisor: String(campos.rucEmisor || ""),
    rucCliente: rucClienteExtraido,
    razonSocialCliente: razonSocialClienteExtraida,
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
