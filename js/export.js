/**
 * export.js - GEDCOM 5.5.1 + 7.0 Generator
 *
 * Reads: mappingPersons, sourceDefs, currentRows, classifications, headers, ignoredColumns
 * Produces: a .ged file string and triggers browser download
 */

// Sammelt Datum-Eintraege die beim Export geparst/nicht erkannt wurden
let dateReport = [];

function addDateReport(personName, rowNum, eventLabel, original, gedcom, note, unrecognized) {
  dateReport.push({ personName, rowNum, eventLabel, original, gedcom, note, unrecognized });
}

// ---- GEDCOM line builder ----
function gedLine(level, tag, value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return level + ' ' + tag + ' ' + String(value).trim();
}

// ---- Lange Texte splitten (CONT-Zeilen) ----
// GEDCOM 5.5.1: CONC + CONT erlaubt
// GEDCOM 7.0:   nur CONT erlaubt (kein CONC)
function splitLongValue(level, tag, value, isV7) {
  const lines = [];
  const str = String(value);
  const parts = str.split('\n');
  const maxLen = 248;
  parts.forEach((part, idx) => {
    if (idx === 0) {
      if (!isV7 && part.length > maxLen) {
        lines.push(level + ' ' + tag + ' ' + part.slice(0, maxLen));
        for (let i = maxLen; i < part.length; i += maxLen)
          lines.push((level + 1) + ' CONC ' + part.slice(i, i + maxLen));
      } else {
        lines.push(level + ' ' + tag + ' ' + part);
      }
    } else {
      lines.push((level + 1) + ' CONT ' + part);
    }
  });
  return lines;
}

// ---- SEX-Wert normalisieren ----
// GEDCOM 7.0: nur M, F, X, U erlaubt (case-sensitive)
function normalizeSex(raw, isV7) {
  if (!raw) return null;
  const v = String(raw).trim();
  if (/^(m|male|männlich|maennlich|mann)$/i.test(v)) return 'M';
  if (/^(f|female|weiblich|frau)$/i.test(v)) return 'F';
  if (/^(x|divers|nonbinary|non-binary|inter)$/i.test(v)) return 'X';
  if (/^(u|unknown|unbekannt|\?)$/i.test(v)) return 'U';
  if (/^(n|none|null)$/i.test(v)) return isV7 ? 'U' : 'N';
  const upper = v.toUpperCase();
  if ('MFU'.includes(upper)) return upper;
  if (!isV7 && 'XN'.includes(upper)) return upper;
  if (isV7 && upper === 'X') return upper;
  return null;
}

// ---- NOTE-Zeilen ausgeben (v7: als Record-Referenz, 5.5.1: inline) ----
// noteCounter wird per Export-Lauf hochgezaehlt
// noteRecords sammelt {id, text} fuer spaetere Record-Ausgabe
let _noteCounter = 0;
let _noteRecords = [];
function emitNote(level, text, isV7) {
  if (!text) return [];
  if (isV7) {
    _noteCounter++;
    const nid = '@N' + _noteCounter + '@';
    _noteRecords.push({ id: nid, text });
    return [level + ' NOTE ' + nid];
  } else {
    return splitLongValue(level, 'NOTE', text, false);
  }
}

// ---- Resolve a field value for a given data row ----
function resolveField(field, dataRow, gvars) {
  return previewFieldValue(field, dataRow, gvars) || null;
}

// ---- Zitationen fuer eine Person oder ein Ereignis ausgeben ----
// citations: [{id, sourceId, overrides:{}}]
// attachType: 'person' oder 'events'
// Gibt GEDCOM-Zeilen ab Level 1 zurueck (fuer Events: Aufrufer erhoeht um 1)
function collectCitations(citations, attachType, row, gvars) {
  const result = [];
  if (!citations || citations.length === 0) return result;
  citations.forEach(cit => {
    const src = sourceDefs.find(s => s.id === cit.sourceId);
    if (!src) return;
    if (src.mode === 'existing') {
      // Vorhandene Quell-ID direkt referenzieren
      result.push('1 SOUR ' + (src.existingId || ''));
      return;
    }
    if (!src._gedId) return; // Quelle noch nicht exportiert
    result.push('1 SOUR ' + src._gedId);
    // Overrides (z.B. PAGE aus Spalte)
    if (cit.overrides) {
      Object.entries(cit.overrides).forEach(([tag, fieldDef]) => {
        const v = resolveField(fieldDef, row, gvars);
        if (v) result.push('2 ' + tag + ' ' + v);
      });
    }
  });

  // Auto-attach: Quellen die per attachTo automatisch haengen
  sourceDefs.forEach(src => {
    if (src.mode === 'existing') return;
    if (!src._gedId) return;
    const shouldAttach = attachType === 'person'
      ? src.attachTo?.person
      : src.attachTo?.events;
    if (!shouldAttach) return;
    // Nicht doppelt hinzufuegen wenn schon manuell zitiert
    if (citations.some(c => c.sourceId === src.id)) return;
    result.push('1 SOUR ' + src._gedId);
  });

  return result;
}

// ---- Datum normalisieren ----
function normalizeDate(raw, isV7) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  // Schon ein GEDCOM-Datum
  if (/^(?:ABT|AFT|BEF|BET|CAL|EST|FROM|TO|INT)?\s*\d/.test(s) && /[A-Z]{3}/.test(s)) {
    const clean = isV7 ? s.replace(/@#D\w+@\s*/g, '') : s;
    return { gedcom: clean, note: null, unrecognized: false };
  }
  if (/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/.test(s)) return { gedcom: s, note: null, unrecognized: false };

  if (typeof parseHistoricalDate === 'function') {
    const parsed = parseHistoricalDate(s);
    if (parsed) return { gedcom: parsed.gedcom, note: parsed.note, unrecognized: false };
  }

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const m = parseInt(iso[2]) - 1;
    if (m >= 0 && m < 12) return { gedcom: iso[3] + ' ' + months[m] + ' ' + iso[1], note: null, unrecognized: false };
  }

  return { gedcom: null, note: 'Originalwert: ' + s, unrecognized: true };
}

// ---- Personenname aus Zeile ermitteln (fuer Report) ----
function resolvePersonName(person, row, gvars) {
  const givnF = person.fields.find(f => f.path === 'NAME.GIVN');
  const surnF = person.fields.find(f => f.path === 'NAME.SURN');
  const givn = givnF ? resolveField(givnF, row, gvars) : null;
  const surn = surnF ? resolveField(surnF, row, gvars) : null;
  return [givn, surn].filter(Boolean).join(' ') || ('Person ' + person.id);
}
function generateGEDCOM(headConfig) {
  headConfig = headConfig || {};
  dateReport = []; // Reset fuer neuen Export
  _noteCounter = 0;
  _noteRecords  = [];
  const gvars = collectGlobalVars();
  const dataRows = currentRows.map((row, i) => ({ row, i })).filter(({ i }) => classifications[i]?.type === 'DATA');
  const FAM_ROLES = ['Vater','Mutter','Kind','Partner','Geschwister'];

  // Assign stable GEDCOM IDs
  // personIdx: per-person per-row sequential INDI IDs
  // famIdx: per-family sequential FAM IDs

  let indiCounter = 0;
  let famCounter = 0;
  let sourCounter = 0;

  const lines = [];

  // ---- HEAD ----
  const isV7 = (headConfig.gedcomVer || '5.5.1') === '7.0';
  lines.push('0 HEAD');
  lines.push('1 SOUR GedXL');
  lines.push('2 VERS 1.0');
  lines.push('2 NAME GedXL Excel/CSV zu GEDCOM Konverter');
  if (headConfig.fileDesc) lines.push('1 FILE ' + headConfig.fileDesc);
  lines.push('1 GEDC');
  // GEDCOM 7: exakte Version 7.0.0 (dreistellig), kein FORM
  lines.push('2 VERS ' + (isV7 ? '7.0.0' : (headConfig.gedcomVer || '5.5.1')));
  if (!isV7) {
    lines.push('2 FORM LINEAGE-LINKED');
    lines.push('1 CHAR ' + (headConfig.charSet || 'UTF-8'));
  }
  // GEDCOM 7: SCHMA fuer verwendete Extension-Tags (leer wenn keine)
  if (isV7) {
    lines.push('1 SCHMA');
  }
  if (headConfig.lang) lines.push('1 LANG ' + headConfig.lang);
  lines.push('1 DATE ' + gedcomToday());
  if (isV7) {
    // GEDCOM 7: HEAD.DATE braucht TIME nicht zwingend, aber erlaubt
    // Kein HEAD.CHAR, kein HEAD.GEDC.FORM
  }
  if (headConfig.submitter) lines.push('1 SUBM @SUBM1@');
  if (headConfig.note) {
    if (isV7) {
      // GEDCOM 7: NOTE als eigener Record - wird spaeter mit _noteRecords ausgegeben
      _noteCounter++;
      const headNoteId = '@N' + _noteCounter + '@';
      _noteRecords.push({ id: headNoteId, text: headConfig.note });
      lines.push('1 NOTE ' + headNoteId);
    } else {
      lines.push('1 NOTE ' + headConfig.note);
    }
  }
  lines.push('');

  // ---- SOUR records (new sources only) ----
  sourceDefs.forEach(src => {
    if (src.mode === 'existing') return;
    sourCounter++;
    src._gedId = '@S' + sourCounter + '@';
    lines.push('0 ' + src._gedId + ' SOUR');
    src.sourceFields.forEach(f => {
      // For table-sourced fields we use first data row as representative — actual value varies per record
      const v = f.valueType === 'static' ? f.value : (dataRows.length > 0 ? previewSourceField(f, dataRows[0].row) : null);
      if (!v) return;
      lines.push('1 ' + f.tag + ' ' + v);
    });
    lines.push('');
  });

  // ---- INDI + FAM records per row ----
  dataRows.forEach(({ row, i }) => {
    // Map personIdx -> GEDCOM INDI ID for this row
    const indiIds = {};
    mappingPersons.forEach((person, pi) => {
      indiCounter++;
      indiIds[person.id] = '@I' + indiCounter + '@';
    });

    // INDI records
    mappingPersons.forEach(person => {
      const id = indiIds[person.id];
      lines.push('0 ' + id + ' INDI');

      // NAME record
      const givnF = person.fields.find(f => f.path === 'NAME.GIVN');
      const surnF = person.fields.find(f => f.path === 'NAME.SURN');
      const givn = givnF ? resolveField(givnF, row, gvars) : null;
      const surn = surnF ? resolveField(surnF, row, gvars) : null;
      if (givn || surn) {
        const nameVal = (givn || '') + (surn ? ' /' + surn + '/' : '');
        lines.push('1 NAME ' + nameVal.trim());
        if (givn) lines.push('2 GIVN ' + givn);
        if (surn) lines.push('2 SURN ' + surn);
      }

      // Other person fields
      person.fields.forEach(field => {
        if (field.path.startsWith('NAME.')) return; // already handled
        let v = resolveField(field, row, gvars);
        if (!v) return;
        // SEX normalisieren
        if (field.path === 'SEX') {
          const sexNorm = normalizeSex(v, isV7);
          if (sexNorm) lines.push('1 SEX ' + sexNorm);
          return;
        }
        if (field.path.includes('.')) {
          const [tag, sub] = field.path.split('.');
          lines.push('1 ' + tag);
          lines.push('2 ' + sub + ' ' + v);
        } else if (field.path === 'NOTE') {
          emitNote(1, v, isV7).forEach(l => lines.push(l));
        } else {
          splitLongValue(1, field.path, v, isV7).forEach(l => lines.push(l));
        }
      });

      // Events
      person.events.forEach(ev => {
        const evTag = ev.tag;
        const hasFields = ev.fields.some(f => resolveField(f, row, gvars));
        if (!hasFields) return;

        if (ev.tag === 'EVEN' && ev.customType) {
          lines.push('1 EVEN');
          lines.push('2 TYPE ' + ev.customType);
        } else {
          lines.push('1 ' + evTag);
        }

        ev.fields.forEach(field => {
          if (field.path === 'TYPE') return; // handled above
          let v = resolveField(field, row, gvars);
          if (!v) return;
          if (field.path === 'DATE') {
            const norm = normalizeDate(v, isV7);
            if (!norm) return;
            if (norm.unrecognized) {
              lines.push('2 DATE');
              emitNote(3, 'Originalwert: ' + v, isV7).forEach(l => lines.push(l));
              addDateReport(resolvePersonName(person, row, gvars), i + 1, ev.label || evTag, v, null, 'Nicht erkannt', true);
            } else {
              lines.push('2 DATE ' + norm.gedcom);
              if (norm.note) emitNote(3, norm.note, isV7).forEach(l => lines.push(l));
              // Nur im Report wenn automatisch konvertiert (nicht triviale Daten)
              if (norm.note || /Johannis|Michaelis|Ostern|Pfingsten|Martini|Himmelfahrt|Trinitatis|O\.S\.|Doppeljahr|ABT|BEF|AFT|BET/i.test(v)) {
                addDateReport(resolvePersonName(person, row, gvars), i + 1, ev.label || evTag, v, norm.gedcom, norm.note, false);
              }
            }
          } else {
            lines.push('2 ' + field.path + ' ' + v);
          }
        });

        // Event citations
        collectCitations(ev.citations, 'events', row, gvars).forEach(l => {
          lines.push(l.replace(/^(\d+)/, m => String(parseInt(m) + 1)));
        });
      });

      // Person citations
      collectCitations(person.citations, 'person', row, gvars).forEach(l => lines.push(l));

      // ASSO relationships (non-FAM)
      person.relatives.forEach(rel => {
        if (FAM_ROLES.includes(rel.role)) return;
        const targetId = indiIds[rel.targetPersonId];
        if (!targetId) return;
        lines.push('1 ASSO ' + targetId);
        lines.push('2 RELA ' + rel.role);
      });

      lines.push('');
    });

    // FAM records
    // Find all partner/parent-child relationships and group into families
    const famGroups = buildFamGroups(mappingPersons, indiIds, row, gvars);
    famGroups.forEach(fam => {
      famCounter++;
      const famId = '@F' + famCounter + '@';
      lines.push('0 ' + famId + ' FAM');
      if (fam.husb) lines.push('1 HUSB ' + fam.husb);
      if (fam.wife) lines.push('1 WIFE ' + fam.wife);
      fam.children.forEach(c => lines.push('1 CHIL ' + c));
      lines.push('');

      // Add FAMS/FAMC back-references to INDIs
      // (will be post-processed — GEDCOM validators tolerate missing back-refs)
    });
  });

  // ---- SUBM record (if submitter given) ----
  if (headConfig.submitter) {
    lines.push('0 @SUBM1@ SUBM');
    lines.push('1 NAME ' + headConfig.submitter);
    lines.push('');
  }

  // ---- GEDCOM 7: NOTE-Records (gesammelt waehrend INDI-Generierung) ----
  if (isV7 && _noteRecords.length > 0) {
    _noteRecords.forEach(nr => {
      lines.push('0 ' + nr.id + ' NOTE ' + nr.text.split('\n')[0]);
      const rest = nr.text.split('\n').slice(1);
      rest.forEach(l => lines.push('1 CONT ' + l));
      lines.push('');
    });
  }

  // ---- TRLR ----
  lines.push('0 TRLR');

  const lineEnd = isV7 ? '\r\n' : '\n';
  return lines.filter(l => l !== null).join(lineEnd);
}

// ---- Group FAM relationships ----
function buildFamGroups(persons, indiIds, row, gvars) {
  const FAM_ROLES = ['Vater','Mutter','Kind','Partner','Geschwister'];
  const families = [];

  // Helper: resolve SEX for a person in this row
  function getSex(person) {
    const sexField = person.fields.find(f => f.path === 'SEX');
    if (!sexField) return null;
    const v = resolveField(sexField, row, gvars);
    if (!v) return null;
    const s = v.trim().toUpperCase();
    if (s === 'M' || s === 'MALE' || s === 'MANN' || s === 'M\u00C4NNLICH') return 'M';
    if (s === 'F' || s === 'W' || s === 'FEMALE' || s === 'FRAU' || s === 'WEIBLICH') return 'F';
    return null;
  }

  // Helper: place a person into FAM as HUSB or WIFE based on SEX
  function assignSpouse(fam, personId, person) {
    const sex = getSex(person);
    if (sex === 'F') {
      if (!fam.wife) fam.wife = personId;
    } else {
      // M or unknown → HUSB (warn handled in validate)
      if (!fam.husb) fam.husb = personId;
      else if (!fam.wife) fam.wife = personId;
    }
  }

  persons.forEach(person => {
    person.relatives.filter(r => FAM_ROLES.includes(r.role)).forEach(rel => {
      const pId = indiIds[person.id];
      const tId = indiIds[rel.targetPersonId];
      const targetPerson = persons.find(p => p.id === rel.targetPersonId);
      if (!tId || !targetPerson) return;

      if (rel.role === 'Partner') {
        let fam = families.find(f =>
          (f.husb === pId && f.wife === tId) ||
          (f.husb === tId && f.wife === pId) ||
          (f.husb === pId || f.wife === pId) && (f.husb === tId || f.wife === tId)
        );
        if (!fam) {
          fam = { husb: null, wife: null, children: [], _personIds: [pId, tId] };
          families.push(fam);
          assignSpouse(fam, pId, person);
          assignSpouse(fam, tId, targetPerson);
        }

      } else if (rel.role === 'Kind') {
        // person is child of targetPerson
        let fam = families.find(f => f.husb === tId || f.wife === tId);
        if (!fam) {
          fam = { husb: null, wife: null, children: [] };
          assignSpouse(fam, tId, targetPerson);
          families.push(fam);
        }
        if (!fam.children.includes(pId)) fam.children.push(pId);

      } else if (rel.role === 'Vater') {
        let fam = families.find(f => f.husb === tId);
        if (!fam) {
          fam = { husb: tId, wife: null, children: [] };
          families.push(fam);
        }
        if (!fam.children.includes(pId)) fam.children.push(pId);

      } else if (rel.role === 'Mutter') {
        let fam = families.find(f => f.wife === tId);
        if (!fam) {
          fam = { husb: null, wife: tId, children: [] };
          families.push(fam);
        }
        if (!fam.children.includes(pId)) fam.children.push(pId);

      } else if (rel.role === 'Geschwister') {
        let fam = families.find(f => f.children.includes(pId) || f.children.includes(tId));
        if (!fam) {
          fam = { husb: null, wife: null, children: [] };
          families.push(fam);
        }
        if (!fam.children.includes(pId)) fam.children.push(pId);
        if (!fam.children.includes(tId)) fam.children.push(tId);
      }
    });
  });

  return families.filter(f => f.husb || f.wife || f.children.length > 0);
}

// ---- Today as GEDCOM date ----
function gedcomToday() {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = new Date();
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

// ---- Trigger download ----
function downloadGEDCOM(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.ged';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Validate before export ----
function validateBeforeExport() {
  const warnings = [];
  const gvars = collectGlobalVars();
  const dataRows = currentRows.filter((_, i) => classifications[i]?.type === 'DATA');

  if (dataRows.length === 0) {
    warnings.push({ level: 'error', msg: 'Keine Datenzeilen gefunden.' });
  }

  const FAM_ROLES = ['Vater','Mutter','Kind','Partner','Geschwister'];
  mappingPersons.forEach(person => {
    const hasName = person.fields.some(f => f.path === 'NAME.GIVN' || f.path === 'NAME.SURN');
    if (!hasName) warnings.push({ level: 'warn', msg: person.label + ': Kein Namensfeld (GIVN/SURN) zugeordnet.' });

    // SEX-Warnung nur wenn Person als Elternteil oder Partner vorkommt
    // Direkt: Person selbst hat Rolle Vater/Mutter/Partner
    // Indirekt: eine andere Person sagt "ich bin Kind/Geschwister von dieser Person"
    //           → diese Person ist implizit Elternteil
    const PARENT_PARTNER_ROLES = ['Vater', 'Mutter', 'Partner'];
    const isDirectParentOrPartner = person.relatives.some(r => PARENT_PARTNER_ROLES.includes(r.role));
    const isImpliedParent = mappingPersons.some(other =>
      other.id !== person.id &&
      other.relatives.some(r => r.targetPersonId === person.id && r.role === 'Kind')
    );
    const isParentOrPartner = isDirectParentOrPartner || isImpliedParent;
    const hasSex = person.fields.some(f => f.path === 'SEX');
    if (isParentOrPartner && !hasSex) {
      warnings.push({ level: 'warn', msg: person.label + ': Hat FAM-Beziehungen, aber kein Geschlechtsfeld (SEX) zugeordnet. HUSB/WIFE-Zuweisung im FAM-Record koennte falsch sein. Mutter- und Vater-Beziehungen koennen nur durch Angabe eines Geschlechts korrekt zugeordnet werden.' });
    }
  });

  if (sourceDefs.length === 0) {
    warnings.push({ level: 'info', msg: 'Keine Quellen konfiguriert. GEDCOM wird ohne SOUR-Records erstellt.' });
  }

  return warnings;
}
