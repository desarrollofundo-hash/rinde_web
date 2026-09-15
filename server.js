import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// CORS solo para desarrollo local
if (process.env.NODE_ENV !== "production") {
  app.use(cors());
}

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "dist")));

app.post("/api/ocr/extract", async (req, res) => {
  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({
        error: "base64Image y mimeType son requeridos",
      });
    }

    const apiKey = process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "VITE_OPENAI_API_KEY no configurada en servidor",
      });
    }

    const prompt = `EXTRACTOR DE DATOS DE COMPROBANTES PERUANOS (SUNAT) - PRECISIÓN MÁXIMA

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

4. "tipoComprobante": Código 01=FACTURA ELECTRONICA, 03=BOLETA DE VENTA, 07=NOTA DE CREDITO, 08=NOTA DE DEBITO, 10=RECIBO POR HONORARIO, 11=OTROS. Defecto "11".

5. "serie": Letras/números ANTES del guion. Ej: "FPP1" de "FPP1-002356"

6. "numero": Solo dígitos DESPUÉS del último guion. Ej: "002356"

7. "fecha": ISO YYYY-MM-DD (fecha de EMISIÓN)

8. "moneda": "01" (Soles/S/PEN) o "03" (Dólares/USD)

9. "igv": Monto IGV con punto decimal. Si no discrimina: "0"

10. "total": Monto total con punto decimal, sin símbolo

11. "razonSocial": Nombre de quien EMITE (no del cliente)

IMPORTANTE: NO INVENTAR. Si está claro que falta un dato, usa null exacto.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: `OpenAI respondió con error ${response.status}: ${errorData.error?.message || "Error desconocido"}`,
      });
    }

    const data = await response.json();
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
      return res.json(json);
    } catch (e) {
      // 4. Si falla, intentar limpiar caracteres problemáticos
      const cleaned = contenido
        .replace(/[\r\n]+/g, " ")
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .trim();

      try {
        json = JSON.parse(cleaned);
        return res.json(json);
      } catch (e2) {
        return res.status(400).json({
          error: `No se pudo interpretar respuesta de OpenAI como JSON. Contenido: ${contenido.substring(0, 200)}`,
        });
      }
    }
  } catch (err) {
    console.error("Error en OCR extraction:", err);
    res.status(500).json({
      error: err.message || "Error interno del servidor",
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Servidor OCR funcionando" });
});

// Fallback para SPA: servir index.html para cualquier ruta no coincidente
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📝 Frontend: http://localhost:${PORT}`);
  console.log(`📝 API OCR: POST http://localhost:${PORT}/api/ocr/extract`);
});
