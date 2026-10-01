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

import * as pdfjsLib from "pdfjs-dist";
import { isPdfFile } from "./isPdfFile";

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

async function convertirPdfAImagen(file) {
  try {
    const pdfWorkerUrl = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const imagenFile = new File([blob], "factura.png", {
          type: "image/png",
        });
        resolve(imagenFile);
      }, "image/png");
    });
  } catch (error) {
    throw new Error(`No se pudo convertir PDF a imagen: ${error.message}`);
  }
}

/**
 * Redimensiona y comprime una imagen antes de enviarla al OCR.
 * Una foto de factura puede pesar varios MB; eso hace lenta la subida (sobre
 * todo por túneles como ngrok) y aumenta el tiempo de OpenAI. Bajarla a ~2000px
 * de lado y JPEG de calidad ~0.85 mantiene el texto legible pero reduce el
 * tamaño a unos cientos de KB.
 *
 * @param {File|Blob} file  Imagen de entrada
 * @param {object} [opts]
 * @param {number} [opts.maxLado=2000]  Lado máximo (px) del lado más largo
 * @param {number} [opts.calidad=0.85]  Calidad JPEG (0-1)
 * @returns {Promise<File>} Imagen JPEG comprimida
 */
async function comprimirImagen(file, { maxLado = 2000, calidad = 0.85 } = {}) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("No se pudo cargar la imagen para comprimir"));
      image.src = objectUrl;
    });

    const anchoOriginal = img.naturalWidth || img.width;
    const altoOriginal = img.naturalHeight || img.height;

    // Si ya es pequeña, no vale la pena reescalar.
    const ladoMayor = Math.max(anchoOriginal, altoOriginal);
    const escala = ladoMayor > maxLado ? maxLado / ladoMayor : 1;

    const ancho = Math.round(anchoOriginal * escala);
    const alto = Math.round(altoOriginal * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    // Fondo blanco: si el origen es PNG con transparencia, evita que quede negro.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", calidad),
    );

    if (!blob) {
      // Si por alguna razón no se pudo comprimir, se usa el original.
      return file;
    }

    return new File([blob], "factura.jpg", { type: "image/jpeg" });
  } catch {
    // Ante cualquier fallo de compresión, se sigue con el archivo original.
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function construirPrompt() {
  const codigosValidos = TIPOS_COMPROBANTE_CATALOGO.map(
    (t) => `${t.id}=${t.name}`,
  ).join(", ");

  return `EXTRACTOR DE DATOS DE COMPROBANTES PERUANOS (SUNAT) - MÁXIMA PRECISIÓN

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
   - BUSCA EXHAUSTIVAMENTE: puede estar en múltiples formatos

3. "razonSocialCliente": Nombre/empresa del cliente
   - Ubicado junto al RUC Cliente
   - Mayúsculas típicamente
   - Ejemplo: "AGRICOLA SANTA AZUL S.A.C"

4. "razonSocial": Nombre empresa EMISORA (no cliente)
   - Del membrete/encabezado
   - NO confundir con cliente

5. "tipoComprobante": Código ${codigosValidos}. Defecto "11".

6. "serie": Letras/números ANTES guion. Ej: "FPP1" de "FPP1-002356"

7. "numero": Solo dígitos DESPUÉS último guion. Ej: "002356"

8. "fecha": ISO YYYY-MM-DD (fecha de EMISIÓN)

9. "moneda": "01"=Soles o "03"=Dólares

10. "igv": Impuesto con punto decimal. "0" si no discrimina

11. "total": Monto final, solo números y punto

⚠️ IMPORTANTE:
- Responde SOLO JSON, sin markdown, sin backticks
- Si campo NO existe, usa null (no vacío, no "N/A")
- rucCliente y razonSocialCliente SIEMPRE presentes en factura peruana
- Busca exhaustivamente en TODA la imagen`;
}

async function extraerCamposConOpenAI(base64Imagen, mimeType) {
  // URL del backend.
  // Por defecto se usa una ruta relativa (mismo origen): en desarrollo el proxy
  // de Vite reenvía /api a server.js, y en producción (IIS) el backend sirve el
  // frontend, así que el mismo origen ya es correcto.
  // VITE_BACKEND_URL solo hace falta si el backend vive en otro host.
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  let respuesta;
  try {
    respuesta = await fetch(`${backendUrl}/api/ocr/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Image: base64Imagen,
        mimeType: mimeType,
      }),
    });
  } catch {
    throw new Error(
      "No se pudo contactar al servidor de OCR. Verifica que el backend esté ejecutándose (npm run dev:full).",
    );
  }

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => ({}));

    // 502/503/504 sin cuerpo JSON = el proxy (Vite o IIS) no alcanzó a server.js.
    if (!errorData.error && respuesta.status >= 502 && respuesta.status <= 504) {
      throw new Error(
        "El servidor de OCR no está respondiendo. Verifica que el backend esté ejecutándose (npm run dev:full).",
      );
    }

    throw new Error(
      errorData.error || `Error en servidor OCR: ${respuesta.status}`,
    );
  }

  return respuesta.json();
}

/**
 * Extrae los campos de un comprobante a partir de un archivo (imagen o PDF).
 * Si es PDF, lo convierte a imagen primero.
 * Devuelve el mismo "shape" que parseQrPayload() en GastoGeneral.jsx.
 *
 * @param {File} file  Imagen (JPG, PNG, etc) o PDF
 */
export async function extraerDatosComprobante(file) {
  let archivoParaProcesar = file;

  // Si es PDF, convertir a imagen
  if (isPdfFile(file)) {
    console.log("📄 Detectado PDF, convirtiendo a imagen...");
    archivoParaProcesar = await convertirPdfAImagen(file);
    console.log("✅ PDF convertido a imagen");
  }

  // Comprimir/redimensionar antes de enviar: acelera la subida y el OCR, y
  // evita timeouts al pasar por túneles (ngrok) con fotos grandes.
  archivoParaProcesar = await comprimirImagen(archivoParaProcesar);

  const base64Imagen = await convertirFileABase64(archivoParaProcesar);
  const mimeType = archivoParaProcesar.type || "image/jpeg";
  const campos = await extraerCamposConOpenAI(base64Imagen, mimeType);

  // VALIDACIÓN CRÍTICA: rucCliente es obligatorio para validar contra empresa
  const rucClienteExtraido = String(campos.rucCliente || "")
    .replace(/\D/g, "")
    .trim();
  const razonSocialClienteExtraida = String(
    campos.razonSocialCliente || "",
  ).trim();

  if (!rucClienteExtraido) {
    console.warn(
      "⚠️ ADVERTENCIA: No se pudo extraer el RUC del Cliente de la factura",
    );
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
