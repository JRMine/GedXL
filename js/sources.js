/**
 * sources.js — Quelleneinstellungen State & Logik
 */

// ---- Source Modes ----
const SOURCE_MODES = [
  {
    value: 'static',
    label: '✏️ Feste Quelle',
    desc: 'Titel, Archiv etc. als feste Werte — Seitenzahl aus Tabellenspalte',
  },
  {
    value: 'sheet',
    label: '📋 Aus Tabellenblatt',
    desc: 'Quellangaben aus einem separaten Sheet (z.B. „Quelle und Bearbeiter") auslesen',
  },
  {
    value: 'column',
    label: '🔄 Aus Spalten',
    desc: 'Alle Quellenfelder variieren je Zeile — alles aus Tabellenspalten',
  },
  {
    value: 'existing',
    label: '🔗 Vorhandene ID',
    desc: 'Verweis auf eine bereits in der Ziel-GEDCOM vorhandene Quelle (@S1@ etc.)',
  },
];

// ---- Source State ----
let sourceDefs = [];
let sourceIdCounter = 0;

function newSourceId() { return 'src_' + (++sourceIdCounter); }

function createSourceDef() {
  return {
    id: newSourceId(),
    name: 'Quelle 1',
    mode: 'static', // 'static' | 'sheet' | 'column' | 'existing'

    sourceFields: [
      { tag: 'TITL', label: 'Titel / Bezeichnung',       valueType: 'static', value: '', colIdx: null },
      { tag: 'AUTH', label: 'Autor / Bearbeiter',         valueType: 'static', value: '', colIdx: null },
      { tag: 'REPO', label: 'Archiv / Fundstelle',        valueType: 'static', value: '', colIdx: null },
      { tag: 'PUBL', label: 'URL / Publikationsangabe',   valueType: 'static', value: '', colIdx: null },
      { tag: 'NOTE', label: 'Notiz zur Quelle',           valueType: 'static', value: '', colIdx: null },
    ],

    citationFields: [
      { tag: 'PAGE', label: 'Seite / Fundstelle',         valueType: 'col',    value: '', colIdx: null },
      { tag: 'DATA', label: 'Transkription / Zitat',      valueType: 'col',    value: '', colIdx: null },
      { tag: 'NOTE', label: 'Notiz zur Zitation',         valueType: 'static', value: '', colIdx: null },
    ],

    existingId: '',
    attachTo: { person: true, events: true },
  };
}

/**
 * Passt valueType-Defaults beim Moduswechsel an.
 */
function applyModeDefaults(src) {
  if (src.mode === 'static') {
    src.sourceFields.forEach(f => { f.valueType = 'static'; });
    // Zitation bleibt col
  } else if (src.mode === 'sheet' || src.mode === 'column') {
    src.sourceFields.forEach(f => { f.valueType = 'col'; f.colIdx = null; });
    src.citationFields.forEach(f => { f.valueType = 'col'; f.colIdx = null; });
  }
  // 'existing' — alles irrelevant
}

function previewSourceField(field, dataRow) {
  if (field.valueType === 'static') return field.value || null;
  if (field.valueType === 'col' && field.colIdx !== null) {
    const v = dataRow[field.colIdx];
    return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
  }
  return null;
}
