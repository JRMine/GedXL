/**
 * export.js - GEDCOM 5.5.1 Generator
 *
 * Reads: mappingPersons, sourceDefs, currentRows, classifications, headers, ignoredColumns
 * Produces: a .ged file string and triggers browser download
 */

// ---- GEDCOM line builder ----
function gedLine(level, tag, value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return level + ' ' + tag + ' ' + String(value).trim();
}

// ---- Resolve a field value for a given data row ----
function resolveField(field, dataRow, gvars) {
  return previewFieldValue(field, dataRow, gvars) || null;
}

// ---- Normalize a date string to GEDCOM date format (best-effort) ----
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  // Already looks like a GEDCOM date (e.g. "15 JAN 1702")
  if (/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/.test(s)) return s;

  // Try DD.MM.YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/);
  if (dmy) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const m = parseInt(dmy[2]) - 1;
    if (m >= 0 && m < 12) return dmy[1] + ' ' + months[m] + ' ' + dmy[3];
  }

  // Only year
  if (/^\d{4}$/.test(s)) return s;

  // YYYY-MM-DD (ISO)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const m = parseInt(iso[2]) - 1;
    if (m >= 0 && m < 12) return iso[3] + ' ' + months[m] + ' ' + iso[1];
  }

  // Can't normalize — return as NOTE value with marker
  return '__RAW__' + s;
}

// ---- Build citation lines for a source ----
function buildCitationLines(src, level, dataRow, gvars) {
  const lines = [];
  // Use _gedId set during SOUR generation, or existingId
  const sourceRef = src.mode === 'existing' ? src.existingId : src._gedId;
  if (!sourceRef) return lines;
  lines.push(level + ' SOUR ' + sourceRef);
  src.citationFields.forEach(f => {
    const v = previewSourceField(f, dataRow);
    if (!v) return;
    lines.push((level + 1) + ' ' + f.tag + ' ' + v);
  });
  return lines;
}

// ---- Collect citations for a given context (person or event) ----
function collectCitations(manualCitations, attachFilter, dataRow, gvars) {
  const lines = [];
  // Auto-attach sources
  sourceDefs.forEach(src => {
    if (src.attachTo[attachFilter]) {
      buildCitationLines(src, 1, dataRow, gvars).forEach(l => lines.push(l));
    }
  });
  // Manual extra citations (not already auto-attached)
  manualCitations.forEach(cit => {
    const src = sourceDefs.find(s => s.id === cit.sourceId);
    if (!src || src.attachTo[attachFilter]) return; // already included
    buildCitationLines(src, 1, dataRow, gvars).forEach(l => lines.push(l));
  });
  return lines;
}

// ---- Generate GEDCOM for all DATA rows ----
function generateGEDCOM(headConfig) {
  headConfig = headConfig || {};
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
  lines.push('0 HEAD');
  lines.push('1 SOUR GedXL');
  lines.push('2 VERS 1.0');
  lines.push('2 NAME GedXL Excel/CSV zu GEDCOM Konverter');
  if (headConfig.fileDesc) lines.push('1 FILE ' + headConfig.fileDesc);
  lines.push('1 GEDC');
  lines.push('2 VERS ' + (headConfig.gedcomVer || '5.5.1'));
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  if (headConfig.lang) lines.push('1 LANG ' + headConfig.lang);
  lines.push('1 DATE ' + gedcomToday());
  if (headConfig.submitter) {
    lines.push('1 SUBM @SUBM1@');
  }
  if (headConfig.note) lines.push('1 NOTE ' + headConfig.note);
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
        const v = resolveField(field, row, gvars);
        if (!v) return;
        if (field.path.includes('.')) {
          const [tag, sub] = field.path.split('.');
          lines.push('1 ' + tag);
          lines.push('2 ' + sub + ' ' + v);
        } else {
          lines.push('1 ' + field.path + ' ' + v);
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
            const norm = normalizeDate(v);
            if (norm && norm.startsWith('__RAW__')) {
              lines.push('2 DATE');
              lines.push('3 NOTE Originalwert: ' + norm.slice(7));
            } else if (norm) {
              lines.push('2 DATE ' + norm);
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

  // ---- TRLR ----
  lines.push('0 TRLR');

  return lines.filter(l => l !== null).join('\n');
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

    // SEX-Warnung wenn Person in FAM-Beziehung steckt
    const inFam = person.relatives.some(r => FAM_ROLES.includes(r.role)) ||
      mappingPersons.some(other => other.relatives.some(r => FAM_ROLES.includes(r.role) && r.targetPersonId === person.id));
    const hasSex = person.fields.some(f => f.path === 'SEX');
    if (inFam && !hasSex) {
      warnings.push({ level: 'warn', msg: person.label + ': Hat FAM-Beziehungen, aber kein Geschlechtsfeld (SEX) zugeordnet. HUSB/WIFE-Zuweisung im FAM-Record koennte falsch sein. Mutter- und Vater-Beziehungen koennen nur durch Angabe eines Geschlechts korrekt zugeordnet werden.' });
    }
  });

  if (sourceDefs.length === 0) {
    warnings.push({ level: 'info', msg: 'Keine Quellen konfiguriert. GEDCOM wird ohne SOUR-Records erstellt.' });
  }

  return warnings;
}
