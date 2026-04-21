/**
 * Utilidades compartidas para exportar datos a Excel en formato XML Spreadsheet 2003.
 * Usado por Informe.jsx, Auditoria.jsx y Revisión.jsx.
 */

export const excelEscape = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");

export const buildWorksheetXml = (sheetName, rows) => {
    const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : [{ Mensaje: "Sin datos" }];
    const headers = Object.keys(safeRows[0]);

    const headerXml = headers
        .map((header) => `<Cell><Data ss:Type="String">${excelEscape(header)}</Data></Cell>`)
        .join("");

    const bodyXml = safeRows
        .map((row) => {
            const cells = headers.map((header) => {
                const value = row?.[header];
                const isNumber = typeof value === "number" && Number.isFinite(value);
                const type = isNumber ? "Number" : "String";
                const content = isNumber ? String(value) : excelEscape(value);
                return `<Cell><Data ss:Type="${type}">${content}</Data></Cell>`;
            }).join("");
            return `<Row>${cells}</Row>`;
        })
        .join("");

    return `<Worksheet ss:Name="${excelEscape(sheetName)}"><Table><Row>${headerXml}</Row>${bodyXml}</Table></Worksheet>`;
};

export const downloadExcelXml = ({ fileName, sheets }) => {
    const sheetsXml = (Array.isArray(sheets) ? sheets : [])
        .map((sheet) => buildWorksheetXml(sheet.name, sheet.rows))
        .join("");

    const workbookXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${sheetsXml}
</Workbook>`;

    const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
