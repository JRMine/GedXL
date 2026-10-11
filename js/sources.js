/**
 * sources.js — Quelleneinstellungen State & Logik
 */

// ---- Available GEDCOM source fields (for "+" button) ----
const AVAILABLE_SOURCE_FIELDS = [
  { tag: 'TITL', label: 'Titel / Bezeichnung' },
  { tag: 'AUTH', label: 'Autor / Bearbeiter' },
  { tag: 'REPO', label: 'Archiv / Fundstelle' },
  { tag: 'PUBL', label: 'URL / Publikationsangabe' },
  { tag: 'ABBR', label: 'Abkürzung' },
  { tag: 'TEXT', label: 'Textauszug' },
  { tag: 'NOTE', label: 'Notiz zur Quelle' },
  { tag: 'CHAN', label: 'Änderungsdatum' },
];

const AVAILABLE_CITATION_FIELDS = [
  { tag: 'PAGE', label: 'Seite / Fundstelle' },
  { tag: 'DATA', label: 'Transkription / Zitat' },
  { tag: 'NOTE', label: 'Notiz zur Zitation' },
  { tag: 'QUAY', label: 'Qualitätsbewertung (0-3)' },
  { tag: 'EVEN', label: 'Ereignisbezug' },
  { tag: 'DATE', label: 'Datum der Abschrift' },
];

// ---- Source Modes ----
const SOURCE_MODES = [
  {
    value: 'new',
    label: '✏️ Neue Quelle erstellen',
    desc: 'Quellenfelder als feste Werte oder aus Tabellenspalten — Quelle wird in GEDCOM neu angelegt',
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

function createSourceFieldDef(tag, label, valueType = 'static') {
  return { id: newSourceId(), tag, label, valueType, value: '', colIdx: null };
}

function createSourceDef() {
  return {
    id: newSourceId(),
    name: 'Quelle 1',
    mode: 'new',

    sourceFields: [
      createSourceFieldDef('TITL', 'Titel / Bezeichnung', 'static'),
      createSourceFieldDef('AUTH', 'Autor / Bearbeiter',  'static'),
      createSourceFieldDef('REPO', 'Archiv / Fundstelle', 'static'),
      createSourceFieldDef('PUBL', 'URL / Publikationsangabe', 'static'),
    ],

    citationFields: [
      createSourceFieldDef('PAGE', 'Seite / Fundstelle', 'col'),
      createSourceFieldDef('DATA', 'Transkription / Zitat', 'col'),
    ],

    existingId: '',
    attachTo: { person: true, events: true },
  };
}

function applyModeDefaults(src) {
  // 'new' — no changes, user controls each field individually
  // 'existing' — sourceFields irrelevant, citationFields stay
}

function previewSourceField(field, dataRow) {
  if (field.valueType === 'static') return field.value || null;
  if (field.valueType === 'col' && field.colIdx !== null) {
    const v = dataRow[field.colIdx];
    return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
  }
  if (field.valueType === 'var' && field.varName) {
    const gvars = (typeof collectGlobalVars === 'function') ? collectGlobalVars() : {};
    return gvars[field.varName] || null;
  }
  return null;
}
