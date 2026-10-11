/**
 * classifier.js — Zeilenklassifikation (Heuristiken)
 */

const ROW_TYPES = ['DATA', 'HEADER', 'SECTION', 'GLOBAL_VAR', 'IGNORE'];

/**
 * Klassifiziert eine Zeile basierend auf ihrem Inhalt.
 * @param {Array} row - Array von Zellwerten
 * @param {number} rowIndex - 0-basierter Zeilenindex
 * @param {number} totalCols - Gesamtanzahl Spalten
 * @returns {string} Vorgeschlagener Typ
 */
function classifyRow(row, rowIndex, totalCols) {
  const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
  const filled = nonEmpty.length;
  const ratio = totalCols > 0 ? filled / totalCols : 0;

  // Komplett leer → IGNORE
  if (filled === 0) return 'IGNORE';

  // Erste Zeile mit vielen String-Werten → HEADER
  if (rowIndex === 0 && ratio >= 0.4) {
    const strCount = nonEmpty.filter(c => typeof c === 'string' && isNaN(Number(c))).length;
    if (strCount / filled >= 0.6) return 'HEADER';
  }

  // Genau 1 Wert, Rest leer → SECTION oder GLOBAL_VAR Kandidat
  if (filled === 1) {
    const val = String(nonEmpty[0]).trim();
    // Reine Jahreszahl → GLOBAL_VAR
    if (/^\d{4}$/.test(val)) return 'GLOBAL_VAR';
    // Kurzer Text → SECTION
    if (val.length < 60) return 'SECTION';
  }

  // Sehr wenige Werte (≤ 2) in einer breiten Tabelle → SECTION
  if (totalCols >= 5 && filled <= 2) return 'SECTION';

  return 'DATA';
}

/**
 * Klassifiziert alle Zeilen einer Tabelle.
 * @param {Array<Array>} rows
 * @returns {Array<{type: string, suggested: string}>}
 */
function classifyAllRows(rows) {
  if (rows.length === 0) return [];
  const totalCols = Math.max(...rows.map(r => r.length));
  return rows.map((row, i) => {
    const suggested = classifyRow(row, i, totalCols);
    return { type: suggested, suggested };
  });
}

/**
 * Berechnet Spaltenstatistiken basierend auf DATA-Zeilen.
 * @param {Array<Array>} rows
 * @param {Array<{type: string}>} classifications
 * @param {Array<string>} headers - Spaltennamen
 * @returns {Array<{name, fillRate, examples}>}
 */
function computeColumnStats(rows, classifications, headers) {
  const dataRows = rows.filter((_, i) => classifications[i]?.type === 'DATA');
  if (dataRows.length === 0) return [];

  const totalCols = headers.length;
  return headers.map((name, colIdx) => {
    const values = dataRows.map(r => r[colIdx]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    const fillRate = Math.round((values.length / dataRows.length) * 100);
    const examples = [...new Set(values.map(v => String(v).trim()))].slice(0, 3);
    return { name: name || `Spalte ${colIdx + 1}`, fillRate, examples };
  });
}
