/**
 * export-ui.js - Export Step UI
 */

function initExport() {
  const container = document.getElementById('step-export-content');
  if (!container) return;
  container.innerHTML = '';

  // ---- Validation ----
  const warnings = validateBeforeExport();
  if (warnings.length > 0) {
    const wrapDiv = document.createElement('div');
    wrapDiv.className = 'export-warnings';
    warnings.forEach(w => {
      const item = document.createElement('div');
      item.className = 'export-warning-item export-warning-' + w.level;
      const icons = { error: '&#10060;', warn: '&#9888;', info: '&#8505;' };
      item.innerHTML = '<span class="warn-icon">' + (icons[w.level] || '') + '</span> ' + escHtml(w.msg);
      wrapDiv.appendChild(item);
    });
    container.appendChild(wrapDiv);
  }

  const hasErrors = warnings.some(w => w.level === 'error');

  // ---- Stats ----
  const dataCount = currentRows.filter((_, i) => classifications[i]?.type === 'DATA').length;
  const statsDiv = document.createElement('div');
  statsDiv.className = 'export-stats';
  statsDiv.innerHTML =
    '<div class="stat-item"><span class="stat-num">' + dataCount + '</span><span class="stat-label">Datensaetze</span></div>' +
    '<div class="stat-item"><span class="stat-num">' + mappingPersons.length + '</span><span class="stat-label">Personen pro Zeile</span></div>' +
    '<div class="stat-item"><span class="stat-num">' + (dataCount * mappingPersons.length) + '</span><span class="stat-label">INDI-Records gesamt</span></div>' +
    '<div class="stat-item"><span class="stat-num">' + sourceDefs.filter(s => s.mode !== 'existing').length + '</span><span class="stat-label">Quellen (SOUR)</span></div>';
  container.appendChild(statsDiv);

  // ---- HEAD Editor ----
  const headSection = document.createElement('div');
  headSection.className = 'export-head-section';
  headSection.innerHTML = '<h3 class="export-section-title">GEDCOM-Header bearbeiten</h3>';

  const headFields = [
    { id: 'head-file-desc',    label: 'Dateibeschreibung (FILE)',     placeholder: 'z.B. Schuelerliste Bautzen 1700-1750', tag: 'FILE' },
    { id: 'head-submitter',    label: 'Bearbeiter / Einreicher (SUBM.NAME)', placeholder: 'z.B. Jasmin Riegler', tag: 'SUBM' },
    { id: 'head-lang',         label: 'Sprache (LANG)',               placeholder: 'German', tag: 'LANG', defaultVal: 'German' },
    { id: 'head-note',         label: 'Notiz zum Header (NOTE)',      placeholder: 'Optionale Anmerkung zur Datei', tag: 'NOTE' },
  ];

  const grid = document.createElement('div');
  grid.className = 'export-head-grid';
  headFields.forEach(f => {
    const row = document.createElement('div');
    row.className = 'export-head-row';
    row.innerHTML =
      '<label class="export-head-label" for="' + f.id + '">' + escHtml(f.label) + '</label>' +
      '<input id="' + f.id + '" class="export-head-input" placeholder="' + escHtml(f.placeholder) + '" value="' + escHtml(f.defaultVal || '') + '" />';
    grid.appendChild(row);
  });

  // GEDCOM Version selector
  const verRow = document.createElement('div');
  verRow.className = 'export-head-row';
  verRow.innerHTML =
    '<label class="export-head-label" for="head-gedcom-ver">GEDCOM-Version</label>' +
    '<select id="head-gedcom-ver" class="export-head-select">' +
    '<option value="5.5.1" selected>5.5.1 (Standard, breite Kompatibilitaet)</option>' +
    '<option value="7.0">7.0 (modern, Unicode-nativ)</option>' +
    '</select>';
  grid.appendChild(verRow);

  headSection.appendChild(grid);

  // Live-Vorschau des Headers
  const headPreviewTitle = document.createElement('div');
  headPreviewTitle.className = 'export-head-preview-title';
  headPreviewTitle.textContent = 'Header-Vorschau:';
  headSection.appendChild(headPreviewTitle);

  const headPre = document.createElement('pre');
  headPre.className = 'export-head-preview';
  headPre.id = 'head-preview';
  headSection.appendChild(headPre);
  container.appendChild(headSection);

  // Update preview on change
  function updateHeadPreview() {
    headPre.textContent = buildHeadPreview();
  }
  grid.querySelectorAll('input, select').forEach(el => el.addEventListener('input', updateHeadPreview));
  updateHeadPreview();

  // ---- Filename input ----
  const filenameDiv = document.createElement('div');
  filenameDiv.className = 'export-filename-row';
  const suggestedName = (typeof uploadedFileName !== 'undefined' && uploadedFileName ? uploadedFileName : 'export') + '.ged';
  filenameDiv.innerHTML =
    '<label class="export-filename-label">Dateiname:' +
    '<input id="export-filename" class="export-filename-input" value="' + escHtml(suggestedName) + '" />' +
    '</label>';
  container.appendChild(filenameDiv);

  // ---- Export button ----
  const btnDiv = document.createElement('div');
  btnDiv.className = 'export-btn-row';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn-primary btn-large';
  exportBtn.textContent = 'GEDCOM herunterladen';
  exportBtn.disabled = hasErrors;
  exportBtn.addEventListener('click', () => {
    try {
      const ged = generateGEDCOM(getHeadConfig());
      const filename = document.getElementById('export-filename').value || 'export.ged';
      downloadGEDCOM(ged, filename);
      showExportPreview(ged, container);
    } catch (e) {
      alert('Fehler beim Erstellen der GEDCOM-Datei:\n' + e.message);
      console.error(e);
    }
  });
  btnDiv.appendChild(exportBtn);

  const previewBtn = document.createElement('button');
  previewBtn.className = 'btn-secondary btn-large';
  previewBtn.textContent = 'Vorschau anzeigen';
  previewBtn.style.marginLeft = '10px';
  previewBtn.addEventListener('click', () => {
    try {
      const ged = generateGEDCOM(getHeadConfig());
      showExportPreview(ged, container);
    } catch (e) {
      alert('Fehler:\n' + e.message);
      console.error(e);
    }
  });
  btnDiv.appendChild(previewBtn);

  const saveProfileBtn = document.createElement('button');
  saveProfileBtn.className = 'btn-secondary btn-large';
  saveProfileBtn.textContent = '&#128190; Mapping-Profil speichern';
  saveProfileBtn.style.marginLeft = '10px';
  saveProfileBtn.addEventListener('click', () => {
    saveProfile();
  });
  btnDiv.appendChild(saveProfileBtn);

  container.appendChild(btnDiv);
}

function getHeadConfig() {
  return {
    fileDesc:    (document.getElementById('head-file-desc')   ?.value || '').trim(),
    submitter:   (document.getElementById('head-submitter')   ?.value || '').trim(),
    lang:        (document.getElementById('head-lang')        ?.value || 'German').trim(),
    note:        (document.getElementById('head-note')        ?.value || '').trim(),
    gedcomVer:   (document.getElementById('head-gedcom-ver')  ?.value || '5.5.1'),
  };
}

function buildHeadPreview() {
  const cfg = getHeadConfig();
  const lines = ['0 HEAD'];
  lines.push('1 SOUR GedXL');
  lines.push('2 VERS 1.0');
  lines.push('2 NAME GedXL Excel/CSV zu GEDCOM Konverter');
  if (cfg.fileDesc) lines.push('1 FILE ' + cfg.fileDesc);
  lines.push('1 GEDC');
  lines.push('2 VERS ' + cfg.gedcomVer);
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  if (cfg.lang) lines.push('1 LANG ' + cfg.lang);
  lines.push('1 DATE ' + gedcomToday());
  if (cfg.submitter) {
    lines.push('1 SUBM @SUBM1@');
  }
  if (cfg.note) lines.push('1 NOTE ' + cfg.note);
  return lines.join('\n');
}

function showExportPreview(gedContent, container) {
  let pre = container.querySelector('.export-preview');
  if (!pre) {
    pre = document.createElement('pre');
    pre.className = 'export-preview';
    container.appendChild(pre);
  }
  const lines = gedContent.split('\n');
  const preview = lines.slice(0, 100).join('\n');
  pre.textContent = preview + (lines.length > 100 ? '\n\n... (' + (lines.length - 100) + ' weitere Zeilen)' : '');
}
