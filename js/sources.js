/**
 * sources.js — Quelleneinstellungen State & Logik
 */

// ---- Source State ----
let sourceDefs = []; // Array von Source-Definitionen
let sourceIdCounter = 0;

function newSourceId() { return 'src_' + (++sourceIdCounter); }

/**
 * Erstellt eine neue leere Quell-Definition.
 */
function createSourceDef() {
  return {
    id: newSourceId(),
    name: 'Quelle 1',

    // Quell-Felder (GEDCOM SOUR-Record)
    sourceFields: [
      { tag: 'TITL', label: 'Titel / Bezeichnung',       valueType: 'static', value: '', colIdx: null },
      { tag: 'AUTH', label: 'Autor / Bearbeiter',         valueType: 'static', value: '', colIdx: null },
      { tag: 'REPO', label: 'Archiv / Fundstelle',        valueType: 'static', value: '', colIdx: null },
      { tag: 'PUBL', label: 'URL / Publikationsangabe',   valueType: 'static', value: '', colIdx: null },
      { tag: 'NOTE', label: 'Notiz zur Quelle',           valueType: 'static', value: '', colIdx: null },
    ],

    // Zitations-Felder (GEDCOM SOUR-Zitation pro Person/Ereignis)
    citationFields: [
      { tag: 'PAGE', label: 'Seite / Fundstelle',         valueType: 'col',    value: '', colIdx: null },
      { tag: 'DATA', label: 'Transkription / Zitat',      valueType: 'col',    value: '', colIdx: null },
      { tag: 'NOTE', label: 'Notiz zur Zitation',         valueType: 'static', value: '', colIdx: null },
    ],

    // Wohin wird die Quelle angehängt?
    attachTo: {
      person: true,
      events: true,
    }
  };
}

/**
 * Gibt den Vorschauwert eines Quell-Feldes zurück.
 */
function previewSourceField(field, dataRow) {
  if (field.valueType === 'static') return field.value || null;
  if (field.valueType === 'col' && field.colIdx !== null) {
    const v = dataRow[field.colIdx];
    return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
  }
  return null;
}
