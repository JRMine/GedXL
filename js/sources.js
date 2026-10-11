/**
 * sources.js — Quelleneinstellungen State & Logik
 */

const AVAILABLE_SOURCE_FIELDS = [
  { tag: 'TITL', label: 'Titel / Bezeichnung' },
  { tag: 'AUTH', label: 'Autor / Bearbeiter' },
  { tag: 'REPO', label: 'Archiv / Fundstelle' },
  { tag: 'PUBL', label: 'URL / Publikationsangabe' },
  { tag: 'ABBR', label: 'Abkuerzung' },
  { tag: 'TEXT', label: 'Textauszug' },
  { tag: 'NOTE', label: 'Notiz zur Quelle' },
];

const AVAILABLE_CITATION_FIELDS = [
  { tag: 'PAGE', label: 'Seite / Fundstelle' },
  { tag: 'DATA', label: 'Transkription / Zitat' },
  { tag: 'NOTE', label: 'Notiz zur Zitation' },
  { tag: 'QUAY', label: 'Qualitaetsbewertung (0-3)' },
  { tag: 'EVEN', label: 'Ereignisbezug' },
  { tag: 'DATE', label: 'Datum der Abschrift' },
];

const SOURCE_MODES = [
  { value: 'new',      label: 'Neue Quelle erstellen',  desc: 'Quellenfelder frei befuellbar — Quelle wird in GEDCOM neu angelegt' },
  { value: 'existing', label: 'Vorhandene ID verwenden', desc: 'Verweis auf bereits vorhandene GEDCOM-Quelle (@S1@ etc.)' },
];

let sourceDefs = [];
let sourceIdCounter = 0;

function newSourceId() { return 'src_' + (++sourceIdCounter); }

/**
 * Erstellt ein Quellenfeld mit sources-Array (wie Mapping-Felder).
 * sources: [{id, type:'col'|'static'|'var', colIdx?, value?, varName?, label}]
 */
function createSourceFieldDef(tag, label, defaultSources) {
  return {
    id: newSourceId(),
    tag,
    label,
    sources: defaultSources || [],
  };
}

function createSourceDef() {
  return {
    id: newSourceId(),
    name: 'Quelle 1',
    mode: 'new',
    sourceFields: [
      createSourceFieldDef('TITL', 'Titel / Bezeichnung'),
      createSourceFieldDef('AUTH', 'Autor / Bearbeiter'),
      createSourceFieldDef('REPO', 'Archiv / Fundstelle'),
      createSourceFieldDef('PUBL', 'URL / Publikationsangabe'),
    ],
    citationFields: [
      createSourceFieldDef('PAGE', 'Seite / Fundstelle'),
      createSourceFieldDef('DATA', 'Transkription / Zitat'),
    ],
    existingId: '',
    attachTo: { person: true, events: true },
  };
}

/**
 * Berechnet den Vorschauwert eines Quellenfeldes fuer eine Datenzeile.
 * Nutzt dieselbe Logik wie previewFieldValue() im Mapping.
 */
function previewSourceField(field, dataRow) {
  if (!field.sources || field.sources.length === 0) return null;
  const gvars = (typeof collectGlobalVars === 'function') ? collectGlobalVars() : {};
  const parts = field.sources.map(s => {
    if (s.type === 'col' && s.colIdx !== null && s.colIdx !== undefined) {
      const v = dataRow ? dataRow[s.colIdx] : null;
      return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : '';
    }
    if (s.type === 'static') return s.value || '';
    if (s.type === 'var' && s.varName) return gvars[s.varName] || '';
    return '';
  });
  const result = parts.filter(p => p !== '').join(' ');
  return result || null;
}

function addSourceToSrcField(field, source) {
  if (source.type === 'col' && field.sources.some(s => s.type === 'col' && s.colIdx === source.colIdx)) return;
  field.sources.push({ ...source, id: newSourceId() });
}

function removeSourceFromSrcField(field, sourceId) {
  field.sources = field.sources.filter(s => s.id !== sourceId);
}
