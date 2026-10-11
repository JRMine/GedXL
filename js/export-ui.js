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

  // ---- Filename input ----
  const filenameDiv = document.createElement('div');
  filenameDiv.className = 'export-filename-row';
  filenameDiv.innerHTML =
    '<label class="export-filename-label">Dateiname:' +
    '<input id="export-filename" class="export-filename-input" value="export.ged" />' +
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
      const ged = generateGEDCOM();
      const filename = document.getElementById('export-filename').value || 'export.ged';
      downloadGEDCOM(ged, filename);
      showExportPreview(ged, container);
    } catch (e) {
      alert('Fehler beim Erstellen der GEDCOM-Datei:\n' + e.message);
      console.error(e);
    }
  });
  btnDiv.appendChild(exportBtn);

  // Preview button
  const previewBtn = document.createElement('button');
  previewBtn.className = 'btn-secondary btn-large';
  previewBtn.textContent = 'Vorschau anzeigen';
  previewBtn.style.marginLeft = '10px';
  previewBtn.addEventListener('click', () => {
    try {
      const ged = generateGEDCOM();
      showExportPreview(ged, container);
    } catch (e) {
      alert('Fehler:\n' + e.message);
      console.error(e);
    }
  });
  btnDiv.appendChild(previewBtn);
  container.appendChild(btnDiv);
}

function showExportPreview(gedContent, container) {
  let pre = container.querySelector('.export-preview');
  if (!pre) {
    pre = document.createElement('pre');
    pre.className = 'export-preview';
    container.appendChild(pre);
  }
  // Show first 100 lines
  const lines = gedContent.split('\n');
  const preview = lines.slice(0, 100).join('\n');
  pre.textContent = preview + (lines.length > 100 ? '\n\n... (' + (lines.length - 100) + ' weitere Zeilen)' : '');
}
