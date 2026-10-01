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

    const prompt = `EXTRACTOR DE DATOS DE COMPROBANTES PERUANOS (SUNAT) - MÁXIMA PRECISIÓN

Analiza meticulosamente la imagen y extrae EXACTAMENTE los campos solicitados.

RESPUESTA REQUERIDA - JSON VÁLIDO ÚNICAMENTE:
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

INSTRUCCIONES CRÍTICAS PARA EXTRACCIÓN:

1. "rucEmisor": RUC de quien EMITE (proveedor/vendedor)
   - Ubicado arriba, membrete o encabezado
   - Formato: 11 dígitos exactos
   - Busca "R.U.C", "RUC:", "RUC Emisor"

2. "rucCliente": RUC de quien COMPRA/RECIBE (cliente)
   - CRÍTICO: Ubicado en sección inferior/media izquierda
   - Busca etiquetas: "Cliente", "Señor", "Razón Social Cliente", "R.U.C.", "Comprador"
   - SIEMPRE está en la factura después de emisor
   - Formato: 11 dígitos sin espacios ni puntos
   - Ejemplo en factura: "Cliente: AGRICOLA SANTA AZUL | RUC: 20603461534"

3. "razonSocialCliente": Nombre/empresa del cliente
   - Ubicado junto al RUC Cliente
   - Mayúsculas típicamente
   - Ejemplo: "AGRICOLA SANTA AZUL S.A.C"

4. "razonSocial": Nombre empresa EMISORA (no cliente)
   - Del membrete/encabezado
   - NO confundir con cliente

5. "tipoComprobante":
   - "01"=FACTURA ELECTRONICA
   - "03"=BOLETA
   - "07"=NOTA CREDITO
   - "08"=NOTA DEBITO
   - "10"=HONORARIO
   - "11"=OTROS (defecto)

6. "serie": Letras/números ANTES guion en número. Ej: "FPP1" de "FPP1-002356"

7. "numero": Dígitos DESPUÉS del último guion

8. "fecha": ISO YYYY-MM-DD

9. "moneda": "01"=Soles o "03"=Dólares

10. "igv": Impuesto con punto. "0" si no discrimina

11. "total": Monto final, solo dígitos y punto

⚠️ IMPORTANTE:
- Responde SOLO JSON, sin markdown, sin backticks
- Si un campo NO existe, usa null (no vacío, no "N/A")
- rucCliente y razonSocialCliente SIEMPRE están presentes en factura peruana
- Busca exhaustivamente en toda la imagen`;

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
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📝 Frontend: http://localhost:${PORT}`);
  console.log(`📝 API OCR: POST http://localhost:${PORT}/api/ocr/extract`);
});
