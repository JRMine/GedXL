/**
 * mapping.js — GedXL Mapping State & Logik
 */

// ---- GEDCOM Schema Definition ----
const GEDCOM_PERSON_FIELDS = [
  { path: 'NAME.GIVN',  label: 'Vorname',           group: 'Name' },
  { path: 'NAME.SURN',  label: 'Nachname',           group: 'Name' },
  { path: 'NAME.NICK',  label: 'Alternativer Name',  group: 'Name' },
  { path: 'SEX',        label: 'Geschlecht',         group: 'Person' },
  { path: 'BIRT.DATE',  label: 'Geburtsdatum',       group: 'Geburt' },
  { path: 'BIRT.PLAC',  label: 'Geburtsort',         group: 'Geburt' },
  { path: 'DEAT.DATE',  label: 'Sterbedatum',        group: 'Tod' },
  { path: 'DEAT.PLAC',  label: 'Sterbeort',          group: 'Tod' },
  { path: 'OCCU',       label: 'Beruf',              group: 'Sonstiges' },
  { path: 'NOTE',       label: 'Notiz (Person)',      group: 'Sonstiges' },
];

const GEDCOM_EVENT_TYPES = [
  // ---- Lebens-Ereignisse ----
  { tag: 'BIRT', label: 'Geburt (BIRT)',              group: 'Leben' },
  { tag: 'CHR',  label: 'Taufe / Christening (CHR)',  group: 'Leben' },
  { tag: 'BAPM', label: 'Taufe / Baptism (BAPM)',     group: 'Leben' },
  { tag: 'DEAT', label: 'Tod (DEAT)',                 group: 'Leben' },
  { tag: 'BURI', label: 'Bestattung (BURI)',          group: 'Leben' },
  { tag: 'CREM', label: 'Einäscherung (CREM)',        group: 'Leben' },
  { tag: 'ADOP', label: 'Adoption (ADOP)',            group: 'Leben' },
  // ---- Kirchlich / Konfession ----
  { tag: 'FCOM', label: 'Erstkommunion (FCOM)',       group: 'Kirche' },
  { tag: 'CONF', label: 'Konfirmation (CONF)',        group: 'Kirche' },
  { tag: 'ORDN', label: 'Ordination (ORDN)',          group: 'Kirche' },
  { tag: 'RELI', label: 'Religion (RELI)',            group: 'Kirche' },
  // ---- Ehe & Familie ----
  { tag: 'MARR', label: 'Heirat (MARR)',              group: 'Familie' },
  { tag: 'ENGA', label: 'Verlobung (ENGA)',           group: 'Familie' },
  { tag: 'MARB', label: 'Aufgebot (MARB)',            group: 'Familie' },
  { tag: 'MARC', label: 'Ehevertrag (MARC)',          group: 'Familie' },
  { tag: 'MARL', label: 'Ehelizenz (MARL)',           group: 'Familie' },
  { tag: 'MARS', label: 'Eheabrechnungsvertrag (MARS)', group: 'Familie' },
  { tag: 'DIVF', label: 'Scheidungsantrag (DIVF)',    group: 'Familie' },
  { tag: 'DIV',  label: 'Scheidung (DIV)',            group: 'Familie' },
  // ---- Beruf & Bildung ----
  { tag: 'OCCU', label: 'Beruf (OCCU)',               group: 'Beruf & Bildung' },
  { tag: 'EDUC', label: 'Ausbildung / Schulbesuch (EDUC)', group: 'Beruf & Bildung' },
  { tag: 'GRAD', label: 'Abschluss / Graduation (GRAD)', group: 'Beruf & Bildung' },
  { tag: 'TITL', label: 'Titel / Stand (TITL)',       group: 'Beruf & Bildung' },
  // ---- Militär ----
  { tag: 'MILI', label: 'Militärdienst (MILI)',       group: 'Militär' },
  // ---- Zivil & Recht ----
  { tag: 'RESI', label: 'Wohnort (RESI)',             group: 'Zivil' },
  { tag: 'EMIG', label: 'Auswanderung (EMIG)',        group: 'Zivil' },
  { tag: 'IMMI', label: 'Einwanderung (IMMI)',        group: 'Zivil' },
  { tag: 'NATU', label: 'Einbürgerung (NATU)',        group: 'Zivil' },
  { tag: 'CENS', label: 'Volkszählung (CENS)',        group: 'Zivil' },
  { tag: 'PROB', label: 'Testamentseröffnung (PROB)', group: 'Zivil' },
  { tag: 'WILL', label: 'Testament (WILL)',           group: 'Zivil' },
  { tag: 'PROP', label: 'Besitz / Eigentum (PROP)',   group: 'Zivil' },
  { tag: 'NCHI', label: 'Anzahl Kinder (NCHI)',       group: 'Zivil' },
  { tag: 'NMR',  label: 'Anzahl Ehen (NMR)',          group: 'Zivil' },
  // ---- Sonstiges ----
  { tag: 'EVEN', label: 'Benutzerdefiniertes Ereignis (EVEN)', group: 'Sonstiges' },
];

const GEDCOM_EVENT_FIELDS = [
  { path: 'DATE',      label: 'Datum' },
  { path: 'PLAC',      label: 'Ort' },
  { path: 'TYPE',      label: 'Ereignistyp (bei EVEN)' },
  { path: 'NOTE',      label: 'Notiz' },
  { path: 'SOUR.PAGE', label: 'Quelle / Seite' },
];

// ---- Source Settings State ----
let sourceSettings = {
  mode: 'static',       // 'static' | 'sheet' | 'column' | 'existing'
  // mode: static
  title: '',
  archive: '',
  editor: '',
  citationColIdx: null, // Spalte für Seitenzahl
  // mode: sheet
  sheetName: '',        // Name des Quell-Sheets
  // mode: column
  titleColIdx: null,
  // mode: existing
  existingId: '',
};

let mappingPersons = [];  // Array of person templates
let mappingIdCounter = 0;

function newId() { return 'id_' + (++mappingIdCounter); }

function createPerson() {
  return {
    id: newId(),
    label: 'Person',
    fields: [],   // [{id, path, label, sources:[...]}]
    events: [],   // [{id, tag, label, customType, fields:[...]}]
    relatives: [], // [{id, role:'Vater'|'Mutter'|'Kind'|'Partner', targetPersonId}]
    citations: []  // [{id, sourceId}] — manual + auto from attachTo.person
  };
}

function addPersonField(person, path) {
  const def = GEDCOM_PERSON_FIELDS.find(f => f.path === path);
  person.fields.push({
    id: newId(),
    path,
    label: def ? def.label : path,
    sources: []
  });
}

function addEvent(person, tag) {
  const def = GEDCOM_EVENT_TYPES.find(e => e.tag === tag);
  const ev = {
    id: newId(),
    tag,
    label: def ? def.label.split(' (')[0] : tag,
    customType: '',
    fields: [],
    citations: [] // [{sourceId, overrides:{tag->sources[]}}] — manual citation overrides
  };
  ['DATE','PLAC','NOTE'].forEach(p => {
    const fdef = GEDCOM_EVENT_FIELDS.find(f => f.path === p);
    ev.fields.push({ id: newId(), path: p, label: fdef ? fdef.label : p, sources: [] });
  });
  person.events.push(ev);
  return ev;
}

function addEventField(ev, path) {
  const def = GEDCOM_EVENT_FIELDS.find(f => f.path === path);
  ev.fields.push({
    id: newId(),
    path,
    label: def ? def.label : path,
    sources: []
  });
}

function addSourceToField(field, source) {
  // Avoid duplicate columns
  if (source.type === 'col' && field.sources.some(s => s.type === 'col' && s.colIdx === source.colIdx)) return;
  field.sources.push({ ...source, id: newId() });
}

function removeSourceFromField(field, sourceId) {
  field.sources = field.sources.filter(s => s.id !== sourceId);
}

/**
 * Renders a preview value for a field given a data row.
 */
function previewFieldValue(field, dataRow, globalVars) {
  if (field.sources.length === 0) return null;
  const parts = field.sources.map(s => {
    if (s.type === 'col') {
      const v = dataRow[s.colIdx];
      return v !== null && v !== undefined ? String(v).trim() : '';
    }
    if (s.type === 'static') return s.value || '';
    if (s.type === 'var') {
      return globalVars[s.varName] || s.varName;
    }
    return '';
  });
  return parts.filter(p => p !== '').join(' ');
}

/**
 * Collects all global variables from current classifications.
 * Returns { '{Jahr}': '1702', ... }
 */
function collectGlobalVars() {
  const result = {};
  currentRows.forEach((row, i) => {
    if (classifications[i]?.type !== 'GLOBAL_VAR') return;
    const tr = rowTableBody.children[i];
    const inputs = tr?.querySelectorAll('.varname-input') || [];
    inputs.forEach(inp => {
      const colIdx = parseInt(inp.dataset.colIdx);
      const cell = row[colIdx];
      if (cell !== null && cell !== undefined) {
        result[inp.value] = String(cell).trim();
      }
    });
  });
  return result;
}

/**
 * Returns the first DATA row for preview purposes.
 */
function getFirstDataRow() {
  const idx = classifications.findIndex(c => c.type === 'DATA');
  return idx >= 0 ? currentRows[idx] : [];
}
