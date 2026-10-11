/**
 * mapping.js — GedXL Mapping State & Logik
 */

const GEDCOM_PERSON_FIELDS = [
  // ---- Name ----
  { path: 'NAME.GIVN',  label: 'Vorname',                          group: 'Name' },
  { path: 'NAME.SURN',  label: 'Nachname / Familienname',          group: 'Name' },
  { path: 'NAME.NICK',  label: 'Spitzname / Rufname',              group: 'Name' },
  { path: 'NAME.NPFX',  label: 'Namenspraefix (Dr., Graf…)',       group: 'Name' },
  { path: 'NAME.NSFX',  label: 'Namenssuffix (Jr., Sr.…)',         group: 'Name' },
  { path: 'NAME.SPFX',  label: 'Adelspr\u00e4fix (von, de…)',      group: 'Name' },
  { path: 'NAME.MARNM', label: 'Ehename (MARNM)',                  group: 'Name' },
  { path: 'NAME.TYPE',  label: 'Namenstyp (birth/married…)',       group: 'Name' },
  { path: 'NAME.FONE',  label: 'Phonetische Schreibweise (FONE)',  group: 'Name' },
  { path: 'NAME.ROMN',  label: 'Romanisierung (ROMN)',             group: 'Name' },
  // ---- Person ----
  { path: 'SEX',        label: 'Geschlecht (M/F/U)',               group: 'Person' },
  { path: 'AGE',        label: 'Alter',                            group: 'Person' },
  { path: 'TITL',       label: 'Titel / Stand',                    group: 'Person' },
  { path: 'RELI',       label: 'Religion / Konfession',            group: 'Person' },
  { path: 'NATI',       label: 'Nationalit\u00e4t / Herkunft',     group: 'Person' },
  { path: 'CAST',       label: 'Kaste / sozialer Stand (CAST)',    group: 'Person' },
  { path: 'DSCR',       label: 'K\u00f6rperbeschreibung (DSCR)',   group: 'Person' },
  { path: 'FACT',       label: 'Attribut / Tatsache (FACT)',       group: 'Person' },
  { path: 'IDNO',       label: 'Personenidentifikator (IDNO)',     group: 'Person' },
  { path: 'SSN',        label: 'Sozialversicherungsnummer (SSN)',  group: 'Person' },
  { path: 'REFN',       label: 'Referenznummer (REFN)',            group: 'Person' },
  { path: 'RIN',        label: 'Record-ID (RIN)',                  group: 'Person' },
  { path: 'AFN',        label: 'Ancestral File Number (AFN)',      group: 'Person' },
  { path: 'RFN',        label: 'Permanent Record File Nr (RFN)',   group: 'Person' },
  { path: 'ALIA',       label: 'Alias-Name (ALIA)',                group: 'Person' },
  // ---- Geburt ----
  { path: 'BIRT.DATE',  label: 'Geburtsdatum',                    group: 'Geburt' },
  { path: 'BIRT.PLAC',  label: 'Geburtsort',                      group: 'Geburt' },
  { path: 'BIRT.AGE',   label: 'Alter bei Geburt',                group: 'Geburt' },
  { path: 'BIRT.AGNC',  label: 'Einrichtung (Geburt)',            group: 'Geburt' },
  { path: 'BIRT.NOTE',  label: 'Notiz zur Geburt',                group: 'Geburt' },
  // ---- Taufe ----
  { path: 'CHR.DATE',   label: 'Taufdatum (CHR)',                 group: 'Taufe' },
  { path: 'CHR.PLAC',   label: 'Taufort (CHR)',                   group: 'Taufe' },
  { path: 'CHR.AGE',    label: 'Alter bei Taufe (CHR)',           group: 'Taufe' },
  { path: 'CHR.AGNC',   label: 'Gemeinde / Kirche (CHR)',         group: 'Taufe' },
  { path: 'CHR.NOTE',   label: 'Notiz zur Taufe (CHR)',           group: 'Taufe' },
  { path: 'BAPM.DATE',  label: 'Taufdatum (BAPM)',                group: 'Taufe' },
  { path: 'BAPM.PLAC',  label: 'Taufort (BAPM)',                  group: 'Taufe' },
  { path: 'BAPM.AGE',   label: 'Alter bei Taufe (BAPM)',          group: 'Taufe' },
  { path: 'BAPM.AGNC',  label: 'Gemeinde / Kirche (BAPM)',        group: 'Taufe' },
  // ---- Konfirmation / Kommunion ----
  { path: 'FCOM.DATE',  label: 'Datum Erstkommunion',             group: 'Kirche' },
  { path: 'FCOM.PLAC',  label: 'Ort Erstkommunion',              group: 'Kirche' },
  { path: 'FCOM.AGE',   label: 'Alter bei Erstkommunion',        group: 'Kirche' },
  { path: 'CONF.DATE',  label: 'Datum Konfirmation',              group: 'Kirche' },
  { path: 'CONF.PLAC',  label: 'Ort Konfirmation',               group: 'Kirche' },
  { path: 'CONF.AGE',   label: 'Alter bei Konfirmation',         group: 'Kirche' },
  { path: 'ORDN.DATE',  label: 'Datum Ordination',               group: 'Kirche' },
  { path: 'ORDN.PLAC',  label: 'Ort Ordination',                 group: 'Kirche' },
  // ---- Tod ----
  { path: 'DEAT.DATE',  label: 'Sterbedatum',                    group: 'Tod' },
  { path: 'DEAT.PLAC',  label: 'Sterbeort',                      group: 'Tod' },
  { path: 'DEAT.CAUS',  label: 'Todesursache',                   group: 'Tod' },
  { path: 'DEAT.AGE',   label: 'Alter bei Tod',                  group: 'Tod' },
  { path: 'DEAT.AGNC',  label: 'Einrichtung (Tod)',              group: 'Tod' },
  { path: 'DEAT.NOTE',  label: 'Notiz zum Tod',                  group: 'Tod' },
  // ---- Bestattung ----
  { path: 'BURI.DATE',  label: 'Bestattungsdatum',               group: 'Bestattung' },
  { path: 'BURI.PLAC',  label: 'Bestattungsort',                 group: 'Bestattung' },
  { path: 'BURI.CAUS',  label: 'Todesursache (BURI)',            group: 'Bestattung' },
  { path: 'BURI.AGE',   label: 'Alter bei Bestattung',           group: 'Bestattung' },
  { path: 'BURI.NOTE',  label: 'Notiz zur Bestattung',           group: 'Bestattung' },
  { path: 'CREM.DATE',  label: 'Einaescherungsdatum',            group: 'Bestattung' },
  { path: 'CREM.PLAC',  label: 'Einaescherungsort',              group: 'Bestattung' },
  // ---- Beruf & Bildung ----
  { path: 'OCCU',       label: 'Beruf (OCCU)',                   group: 'Beruf & Bildung' },
  { path: 'EDUC',       label: 'Ausbildung (EDUC)',              group: 'Beruf & Bildung' },
  { path: 'EDUC.DATE',  label: 'Datum Ausbildung',               group: 'Beruf & Bildung' },
  { path: 'EDUC.PLAC',  label: 'Schule / Ort',                   group: 'Beruf & Bildung' },
  { path: 'EDUC.AGE',   label: 'Alter (Ausbildung)',             group: 'Beruf & Bildung' },
  { path: 'EDUC.AGNC',  label: 'Schule / Einrichtung (EDUC)',   group: 'Beruf & Bildung' },
  { path: 'GRAD.DATE',  label: 'Abschlussdatum',                 group: 'Beruf & Bildung' },
  { path: 'GRAD.PLAC',  label: 'Abschlussort',                   group: 'Beruf & Bildung' },
  { path: 'GRAD.AGE',   label: 'Alter bei Abschluss',            group: 'Beruf & Bildung' },
  // ---- Militar ----
  { path: 'MILI.DATE',  label: 'Datum Militaerdienst',           group: 'Milit\u00e4r' },
  { path: 'MILI.PLAC',  label: 'Ort Militaerdienst',            group: 'Milit\u00e4r' },
  { path: 'MILI.AGE',   label: 'Alter (Militaerdienst)',         group: 'Milit\u00e4r' },
  { path: 'MILI.AGNC',  label: 'Einheit / Behoerde',            group: 'Milit\u00e4r' },
  { path: 'MILI.NOTE',  label: 'Notiz Militaerdienst',          group: 'Milit\u00e4r' },
  // ---- Wohnort & Migration ----
  { path: 'RESI.DATE',  label: 'Wohndatum',                     group: 'Wohnort & Migration' },
  { path: 'RESI.PLAC',  label: 'Wohnort',                       group: 'Wohnort & Migration' },
  { path: 'RESI.ADDR',  label: 'Wohnadresse',                   group: 'Wohnort & Migration' },
  { path: 'RESI.NOTE',  label: 'Notiz Wohnort',                 group: 'Wohnort & Migration' },
  { path: 'EMIG.DATE',  label: 'Auswanderungsdatum',            group: 'Wohnort & Migration' },
  { path: 'EMIG.PLAC',  label: 'Auswanderungsort',              group: 'Wohnort & Migration' },
  { path: 'EMIG.AGE',   label: 'Alter bei Auswanderung',        group: 'Wohnort & Migration' },
  { path: 'IMMI.DATE',  label: 'Einwanderungsdatum',            group: 'Wohnort & Migration' },
  { path: 'IMMI.PLAC',  label: 'Einwanderungsort',              group: 'Wohnort & Migration' },
  { path: 'IMMI.AGE',   label: 'Alter bei Einwanderung',        group: 'Wohnort & Migration' },
  { path: 'NATU.DATE',  label: 'Einbuergerungsdatum',           group: 'Wohnort & Migration' },
  { path: 'NATU.PLAC',  label: 'Einbuergerungsort',             group: 'Wohnort & Migration' },
  // ---- Zivil & Recht ----
  { path: 'CENS.DATE',  label: 'Datum Volkszaehlung',           group: 'Zivil & Recht' },
  { path: 'CENS.PLAC',  label: 'Ort Volkszaehlung',             group: 'Zivil & Recht' },
  { path: 'PROB.DATE',  label: 'Datum Testamenteroeffnung',     group: 'Zivil & Recht' },
  { path: 'PROB.PLAC',  label: 'Ort Testamenteroeffnung',       group: 'Zivil & Recht' },
  { path: 'WILL.DATE',  label: 'Datum Testament',               group: 'Zivil & Recht' },
  { path: 'WILL.PLAC',  label: 'Ort Testament',                 group: 'Zivil & Recht' },
  { path: 'PROP',       label: 'Besitz / Eigentum (PROP)',      group: 'Zivil & Recht' },
  { path: 'NCHI',       label: 'Anzahl Kinder (NCHI)',          group: 'Zivil & Recht' },
  { path: 'NMR',        label: 'Anzahl Ehen (NMR)',             group: 'Zivil & Recht' },
  // ---- Adoption ----
  { path: 'ADOP.DATE',  label: 'Adoptionsdatum',                group: 'Adoption' },
  { path: 'ADOP.PLAC',  label: 'Adoptionsort',                  group: 'Adoption' },
  { path: 'ADOP.AGE',   label: 'Alter bei Adoption',            group: 'Adoption' },
  // ---- Sonstiges ----
  { path: 'NOTE',       label: 'Notiz (Person)',                group: 'Sonstiges' },
  { path: 'CHAN.DATE',  label: 'Aenderungsdatum (CHAN)',         group: 'Sonstiges' },
];

const GEDCOM_EVENT_TYPES = [
  // ---- Lebens-Ereignisse ----
  { tag: 'BIRT', label: 'Geburt (BIRT)',                          group: 'Leben' },
  { tag: 'CHR',  label: 'Taufe / Christening (CHR)',              group: 'Leben' },
  { tag: 'BAPM', label: 'Taufe / Baptism (BAPM)',                 group: 'Leben' },
  { tag: 'DEAT', label: 'Tod (DEAT)',                             group: 'Leben' },
  { tag: 'BURI', label: 'Bestattung (BURI)',                      group: 'Leben' },
  { tag: 'CREM', label: 'Einaescherung (CREM)',                   group: 'Leben' },
  { tag: 'ADOP', label: 'Adoption (ADOP)',                        group: 'Leben' },
  // ---- Kirchlich / Konfession ----
  { tag: 'FCOM', label: 'Erstkommunion (FCOM)',                   group: 'Kirche' },
  { tag: 'CONF', label: 'Konfirmation (CONF)',                    group: 'Kirche' },
  { tag: 'ORDN', label: 'Ordination (ORDN)',                      group: 'Kirche' },
  { tag: 'RELI', label: 'Religion (RELI)',                        group: 'Kirche' },
  // ---- Ehe & Familie ----
  { tag: 'MARR', label: 'Heirat (MARR)',                          group: 'Familie' },
  { tag: 'ENGA', label: 'Verlobung (ENGA)',                       group: 'Familie' },
  { tag: 'MARB', label: 'Aufgebot (MARB)',                        group: 'Familie' },
  { tag: 'MARC', label: 'Ehevertrag (MARC)',                      group: 'Familie' },
  { tag: 'MARL', label: 'Ehelizenz (MARL)',                       group: 'Familie' },
  { tag: 'MARS', label: 'Eheabrechnungsvertrag (MARS)',           group: 'Familie' },
  { tag: 'DIVF', label: 'Scheidungsantrag (DIVF)',                group: 'Familie' },
  { tag: 'DIV',  label: 'Scheidung (DIV)',                        group: 'Familie' },
  // ---- Beruf & Bildung ----
  { tag: 'OCCU', label: 'Beruf (OCCU)',                           group: 'Beruf & Bildung' },
  { tag: 'EDUC', label: 'Ausbildung / Schulbesuch (EDUC)',        group: 'Beruf & Bildung' },
  { tag: 'GRAD', label: 'Abschluss / Graduation (GRAD)',          group: 'Beruf & Bildung' },
  { tag: 'TITL', label: 'Titel / Stand (TITL)',                   group: 'Beruf & Bildung' },
  // ---- Militar ----
  { tag: 'MILI', label: 'Militaerdienst (MILI)',                  group: 'Milit\u00e4r' },
  // ---- Zivil & Recht ----
  { tag: 'RESI', label: 'Wohnort (RESI)',                         group: 'Zivil' },
  { tag: 'EMIG', label: 'Auswanderung (EMIG)',                    group: 'Zivil' },
  { tag: 'IMMI', label: 'Einwanderung (IMMI)',                    group: 'Zivil' },
  { tag: 'NATU', label: 'Einbuergerung (NATU)',                   group: 'Zivil' },
  { tag: 'CENS', label: 'Volkszaehlung (CENS)',                   group: 'Zivil' },
  { tag: 'PROB', label: 'Testamenteroeffnung (PROB)',             group: 'Zivil' },
  { tag: 'WILL', label: 'Testament (WILL)',                       group: 'Zivil' },
  { tag: 'PROP', label: 'Besitz / Eigentum (PROP)',               group: 'Zivil' },
  { tag: 'NCHI', label: 'Anzahl Kinder (NCHI)',                   group: 'Zivil' },
  { tag: 'NMR',  label: 'Anzahl Ehen (NMR)',                      group: 'Zivil' },
  // ---- Sonstiges ----
  { tag: 'EVEN', label: 'Benutzerdefiniertes Ereignis (EVEN)',    group: 'Sonstiges' },
];

const GEDCOM_EVENT_FIELDS = [
  { path: 'DATE',      label: 'Datum' },
  { path: 'PLAC',      label: 'Ort' },
  { path: 'AGE',       label: 'Alter (bei diesem Ereignis)' },
  { path: 'CAUS',      label: 'Ursache / Grund' },
  { path: 'TYPE',      label: 'Ereignistyp (bei EVEN)' },
  { path: 'AGNC',      label: 'Institution / Behoerde' },
  { path: 'ADDR',      label: 'Adresse' },
  { path: 'PHON',      label: 'Telefon' },
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
  citationColIdx: null, // Spalte fur Seitenzahl
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
    citations: []  // [{id, sourceId}]
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
    citations: []
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
  if (source.type === 'col' && field.sources.some(s => s.type === 'col' && s.colIdx === source.colIdx)) return;
  field.sources.push({ ...source, id: newId() });
}

function removeSourceFromField(field, sourceId) {
  field.sources = field.sources.filter(s => s.id !== sourceId);
}

function previewFieldValue(field, dataRow, globalVars) {
  if (field.sources.length === 0) return null;
  const parts = field.sources.map(s => {
    if (s.type === 'col') {
      const v = dataRow[s.colIdx];
      return v !== null && v !== undefined ? String(v).trim() : '';
    }
    if (s.type === 'static') return s.value || '';
    if (s.type === 'var') return globalVars[s.varName] || s.varName;
    return '';
  });
  return parts.filter(p => p !== '').join(' ');
}

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

function getFirstDataRow() {
  const idx = classifications.findIndex(c => c.type === 'DATA');
  return idx >= 0 ? currentRows[idx] : [];
}
