/**
 * parser.js — SheetJS-Wrapper für Excel und CSV
 */

/**
 * Liest eine Datei ein und gibt alle Sheets zurück.
 * @param {File} file
 * @returns {Promise<{sheetNames: string[], getSheet: (name: string) => Array<Array>}>}
 */
async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: false });

        resolve({
          sheetNames: workbook.SheetNames,
          getSheet: (name) => {
            const ws = workbook.Sheets[name];
            // dense: true gibt ein 2D-Array zurück, leere Zellen als null
            const raw = XLSX.utils.sheet_to_json(ws, {
              header: 1,
              defval: null,
              blankrows: true,
              raw: false
            });
            return raw;
          }
        });
      } catch (err) {
        reject(new Error('Datei konnte nicht gelesen werden: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
    reader.readAsArrayBuffer(file);
  });
}
