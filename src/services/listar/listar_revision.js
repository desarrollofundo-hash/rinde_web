import API from "../api";

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Obtener lista de revisiones (rendición)
 */
export async function getListaRevision({ id, idrev, gerencia, ruc }) {
  const endpoint = "/reporte/rendicionrevision";

  const requestWithParams = async (params) => {
    const response = await API.get(endpoint, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "no-cache",
      },
    });

    if (response.status !== 200) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    let data = response.data;

    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
       /*  console.error("❌ Error parseando JSON:", e); */
        throw new Error("Respuesta inválida del servidor");
      }
    }

    if (Array.isArray(data)) return data;
    if (typeof data === "object" && data?.data) {
      return Array.isArray(data.data) ? data.data : [data.data];
    }
    if (typeof data === "object") return [data];
    return [];
  };

  try {
    const normalizedId = String(id ?? "");
    const normalizedIdrev = String(idrev ?? "");
    const normalizedGerencia = String(gerencia ?? "");
    const normalizedRuc = String(ruc ?? "");

    const hasIdrev = normalizedIdrev !== "" && normalizedIdrev !== "0";
    const hasGerencia =
      normalizedGerencia !== "" && normalizedGerencia.trim() !== "";

    const paramAttempts = [];

    // 1) Enviar los valores tal cual llegan
    paramAttempts.push({
      id: normalizedId,
      idrev: normalizedIdrev,
      gerencia: normalizedGerencia,
      ruc: normalizedRuc,
    });

    // 2) Si tiene idrev pero no gerencia, intentar con gerencia="0"
    if (hasIdrev && !hasGerencia) {
      paramAttempts.push({
        id: normalizedId,
        idrev: normalizedIdrev,
        gerencia: "0",
        ruc: normalizedRuc,
      });
    }

    // 3) Si tiene gerencia pero no idrev, intentar con idrev="0"
    if (hasGerencia && !hasIdrev) {
      paramAttempts.push({
        id: normalizedId,
        idrev: "0",
        gerencia: normalizedGerencia,
        ruc: normalizedRuc,
      });
    }

    let bestResult = [];
    for (const params of paramAttempts) {
      try {
        const result = await requestWithParams(params);
        if (Array.isArray(result) && result.length > bestResult.length) {
          bestResult = result;
        }
      } catch (error) {
        const status = error?.response?.status;
        /*  console.warn("⚠️ Falló intento listado revisión", { status, params }); */
        if (status && status !== 400) throw error;
      }
    }

    return bestResult.filter((item) => item && typeof item === "object");
  } catch (error) {
 /*    console.error("❌ ERROR en getListaRevision:", error?.message); */
    if (error?.response) {
     /*  console.error("📄 Response status:", error.response.status); */
    /*   console.error("📄 Response body:", error.response.data); */
    }
    throw error;
  }
}
