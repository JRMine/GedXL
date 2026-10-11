/**
 * project-settings.js - Projekteinstellungen (Schritt 2)
 * Speichert GEDCOM-Version, Sprache, Metadaten global als projectConfig.
 */

let projectConfig = {
  gedcomVer:  '5.5.1',
  charSet:    'UTF-8',
  lang:       'German',
  fileDesc:   '',
  submitter:  '',
  note:       '',
  filename:   '',
};

function initProjectSettings() {
  // Felder mit gespeichertem config befuellen
  const fields = {
    'proj-gedcom-ver': 'gedcomVer',
    'proj-char':       'charSet',
    'proj-lang':       'lang',
    'proj-file-desc':  'fileDesc',
    'proj-submitter':  'submitter',
    'proj-note':       'note',
    'proj-filename':   'filename',
  };
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (projectConfig[key]) el.value = projectConfig[key];
    el.addEventListener('input', () => {
      projectConfig[key] = el.value;
      updateProjectPreview();
    });
    el.addEventListener('change', () => {
      projectConfig[key] = el.value;
      updateProjectPreview();
      // CHAR-Zeile nur bei 5.5.1 anzeigen
      if (id === 'proj-gedcom-ver') toggleCharRow();
    });
  });

  // Dateiname aus Upload-Name vorbelegen falls leer
  const filenameEl = document.getElementById('proj-filename');
  if (filenameEl && !filenameEl.value && typeof uploadedFileName !== 'undefined' && uploadedFileName) {
    filenameEl.value = uploadedFileName + '.ged';
    projectConfig.filename = filenameEl.value;
  }

  toggleCharRow();
  updateProjectPreview();

  document.getElementById('btn-project-next').addEventListener('click', () => {
    saveProjectConfig();
    const roleMap = window._pendingRoleMap || {};
    if (typeof loadSheets === 'function') {
      loadSheets(roleMap);
    }
  });
}

function toggleCharRow() {
  const charRow = document.getElementById('proj-char-row');
  if (!charRow) return;
  const ver = document.getElementById('proj-gedcom-ver')?.value || '5.5.1';
  charRow.style.display = ver === '7.0' ? 'none' : '';
}

function saveProjectConfig() {
  const fields = {
    'proj-gedcom-ver': 'gedcomVer',
    'proj-char':       'charSet',
    'proj-lang':       'lang',
    'proj-file-desc':  'fileDesc',
    'proj-submitter':  'submitter',
    'proj-note':       'note',
    'proj-filename':   'filename',
  };
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) projectConfig[key] = el.value;
  });
}

function getProjectHeadConfig() {
  return {
    gedcomVer: projectConfig.gedcomVer || '5.5.1',
    charSet:   projectConfig.charSet   || 'UTF-8',
    lang:      projectConfig.lang      || 'German',
    fileDesc:  projectConfig.fileDesc  || '',
    submitter: projectConfig.submitter || '',
    note:      projectConfig.note      || '',
    filename:  projectConfig.filename  || 'export.ged',
  };
}

function updateProjectPreview() {
  const pre = document.getElementById('proj-head-preview');
  if (!pre) return;
  const cfg = getProjectHeadConfig();
  const lines = ['0 HEAD'];
  lines.push('1 SOUR GedXL');
  lines.push('2 VERS 1.0');
  lines.push('2 NAME GedXL Konverter');
  if (cfg.fileDesc) lines.push('1 FILE ' + cfg.fileDesc);
  lines.push('1 GEDC');
  lines.push('2 VERS ' + (cfg.gedcomVer === '7.0' ? '7.0.0' : cfg.gedcomVer));
  if (cfg.gedcomVer !== '7.0') {
    lines.push('2 FORM LINEAGE-LINKED');
    lines.push('1 CHAR ' + cfg.charSet);
  }
  if (cfg.lang) lines.push('1 LANG ' + cfg.lang);
  lines.push('1 DATE ' + gedcomToday());
  if (cfg.submitter) lines.push('1 SUBM @SUBM1@');
  if (cfg.note) lines.push('1 NOTE ' + cfg.note);

  // GEDCOM 7 Hinweis
  const hintEl = document.getElementById('proj-gedcom-hint');
  if (hintEl) {
    hintEl.textContent = cfg.gedcomVer === '7.0'
      ? 'GEDCOM 7: UTF-8 immer, kein CHAR-Tag, NOTE als eigene Records, SEX X/U unterstuetzt.'
      : 'GEDCOM 5.5.1: Breite Unterstuetzung in allen Programmen (GRAMPS, Ahnenblatt, Ancestry…).';
  }

  pre.textContent = lines.join('\n');
}
