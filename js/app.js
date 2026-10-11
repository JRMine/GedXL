/**
 * app.js — GedXL Hauptlogik (Schritt 1 + 2)
 */

// ---- State ----
let parsedFile = null;       // { sheetNames, getSheet }
let currentRows = [];        // Array<Array> — Rohdaten des gewählten Sheets
let classifications = [];    // Array<{type, suggested}>
let headers = [];            // Array<string> — aus HEADER-Zeile(n)
let varCounter = 1;          // Zähler für auto-generierte Variablennamen

// ---- DOM Refs ----
const stepUpload  = document.getElementById('step-upload');
const stepSheets  = document.getElementById('step-sheets');
const stepImport  = document.getElementById('step-import');
const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const sheetList   = document.getElementById('sheet-list');
const rowTableBody = document.getElementById('row-table-body');
const globalvarsList = document.getElementById('globalvars-list');
const columnsList = document.getElementById('columns-list');
const btnNext     = document.getElementById('btn-next');
const nextHint    = document.getElementById('next-hint');

// ---- Step helpers ----
function showStep(stepEl) {
  [stepUpload, stepSheets, stepImport].forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  stepEl.classList.remove('hidden');
  stepEl.classList.add('active');
}

// ---- Drag & Drop ----
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// ---- File handling ----
async function handleFile(file) {
  try {
    parsedFile = await parseFile(file);

    if (parsedFile.sheetNames.length === 1) {
      // Nur ein Sheet → direkt weiter
      loadSheet(parsedFile.sheetNames[0]);
    } else {
      // Mehrere Sheets → Auswahl anzeigen
      sheetList.innerHTML = '';
      parsedFile.sheetNames.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'sheet-btn';
        btn.textContent = name;
        btn.addEventListener('click', () => loadSheet(name));
        sheetList.appendChild(btn);
      });
      showStep(stepSheets);
    }
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

// ---- Load sheet ----
function loadSheet(sheetName) {
  currentRows = parsedFile.getSheet(sheetName);
  // Leere Endzeilen entfernen
  while (currentRows.length > 0) {
    const last = currentRows[currentRows.length - 1];
    if (last.every(c => c === null || c === undefined || String(c).trim() === '')) {
      currentRows.pop();
    } else break;
  }

  classifications = classifyAllRows(currentRows);
  varCounter = 1;
  headers = deriveHeaders();

  renderRowTable();
  renderGlobalVars();
  renderColumnStats();
  checkNextButton();
  showStep(stepImport);
}

// ---- Derive headers from HEADER rows ----
function deriveHeaders() {
  const headerRow = currentRows.find((_, i) => classifications[i]?.type === 'HEADER');
  if (!headerRow) return currentRows[0]?.map((_, i) => `Spalte ${i + 1}`) || [];
  return headerRow.map((v, i) => (v !== null && v !== undefined && String(v).trim() !== '') ? String(v).trim() : `Spalte ${i + 1}`);
}

// ---- Render row table ----
function renderRowTable() {
  rowTableBody.innerHTML = '';
  currentRows.forEach((row, i) => {
    const cls = classifications[i];
    const tr = document.createElement('tr');
    tr.className = `row-${cls.type}`;
    tr.dataset.rowIdx = i;

    // Row number
    const tdNum = document.createElement('td');
    tdNum.textContent = i + 1;
    tdNum.style.color = '#999';
    tdNum.style.fontSize = '11px';
    tr.appendChild(tdNum);

    // Type select
    const tdType = document.createElement('td');
    const sel = document.createElement('select');
    sel.className = `type-select type-${cls.type}`;
    ROW_TYPES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      if (t === cls.type) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => onTypeChange(i, sel.value, tr, sel));
    tdType.appendChild(sel);
    tr.appendChild(tdType);

    // Variable name (only for GLOBAL_VAR)
    const tdVar = document.createElement('td');
    const varInput = document.createElement('input');
    varInput.type = 'text';
    varInput.className = 'varname-input';
    varInput.placeholder = '{Variable}';
    varInput.disabled = cls.type !== 'GLOBAL_VAR';
    if (cls.type === 'GLOBAL_VAR') {
      varInput.value = `{Var${varCounter++}}`;
      // Auto-detect year
      const firstVal = row.find(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (firstVal && /^\d{4}$/.test(String(firstVal).trim())) {
        varInput.value = '{Jahr}';
      }
    }
    varInput.addEventListener('input', () => renderGlobalVars());
    tdVar.appendChild(varInput);
    tr.appendChild(tdVar);

    // Content preview
    const tdPreview = document.createElement('td');
    const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmpty.length === 0) {
      tdPreview.innerHTML = '<span class="cell-empty">(leer)</span>';
    } else {
      const span = document.createElement('span');
      span.className = 'cell-preview';
      span.title = row.map(c => c ?? '').join(' | ');
      span.textContent = nonEmpty.slice(0, 8).join(' · ');
      tdPreview.appendChild(span);
    }
    tr.appendChild(tdPreview);

    rowTableBody.appendChild(tr);
  });
}

// ---- Type change handler ----
function onTypeChange(rowIdx, newType, tr, sel) {
  classifications[rowIdx].type = newType;
  tr.className = `row-${newType}`;
  sel.className = `type-select type-${newType}`;

  // Enable/disable varname input
  const varInput = tr.querySelector('.varname-input');
  varInput.disabled = newType !== 'GLOBAL_VAR';
  if (newType === 'GLOBAL_VAR' && varInput.value.trim() === '') {
    const row = currentRows[rowIdx];
    const firstVal = row.find(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (firstVal && /^\d{4}$/.test(String(firstVal).trim())) {
      varInput.value = '{Jahr}';
    } else {
      varInput.value = `{Var${varCounter++}}`;
    }
  }

  // If changing to/from HEADER → re-derive headers and recompute columns
  if (newType === 'HEADER' || classifications[rowIdx].suggested === 'HEADER') {
    headers = deriveHeaders();
    renderColumnStats();
  }

  renderGlobalVars();
  checkNextButton();
}

// ---- Render global vars panel ----
function renderGlobalVars() {
  const items = [];
  currentRows.forEach((row, i) => {
    if (classifications[i]?.type !== 'GLOBAL_VAR') return;
    const tr = rowTableBody.children[i];
    const varInput = tr?.querySelector('.varname-input');
    const varName = varInput?.value?.trim() || `{Var?}`;
    const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    const value = nonEmpty.join(' · ') || '(leer)';
    items.push({ varName, value, rowNum: i + 1 });
  });

  if (items.length === 0) {
    globalvarsList.innerHTML = '<p class="empty-hint">Noch keine globalen Variablen definiert.</p>';
    return;
  }

  globalvarsList.innerHTML = '';
  items.forEach(({ varName, value, rowNum }) => {
    const div = document.createElement('div');
    div.className = 'globalvar-item';
    div.innerHTML = `<div class="globalvar-name">${escHtml(varName)}</div><div class="globalvar-value">Zeile ${rowNum}: ${escHtml(value)}</div>`;
    globalvarsList.appendChild(div);
  });
}

// ---- Render column stats ----
function renderColumnStats() {
  headers = deriveHeaders();
  const stats = computeColumnStats(currentRows, classifications, headers);

  if (stats.length === 0) {
    columnsList.innerHTML = '<p class="empty-hint">Wird nach Bestätigung der Header-Zeile angezeigt.</p>';
    return;
  }

  columnsList.innerHTML = '';
  stats.forEach(({ name, fillRate, examples }) => {
    const div = document.createElement('div');
    div.className = 'col-item';
    const barColor = fillRate >= 70 ? '#7ec8e3' : fillRate >= 30 ? '#ffcc80' : '#ef9a9a';
    div.innerHTML = `
      <div class="col-item-name" title="${escHtml(name)}">${escHtml(name)}</div>
      <div class="fill-bar-wrap">
        <div class="fill-bar"><div class="fill-bar-inner" style="width:${fillRate}%;background:${barColor}"></div></div>
        <span class="fill-pct">${fillRate}%</span>
      </div>
      <div class="col-example">${escHtml(examples.slice(0, 2).join(', ') || '–')}</div>
    `;
    columnsList.appendChild(div);
  });
}

// ---- Check if "Weiter" button can be enabled ----
function checkNextButton() {
  const hasHeader = classifications.some(c => c.type === 'HEADER');
  const hasData   = classifications.some(c => c.type === 'DATA');
  btnNext.disabled = !(hasHeader && hasData);
  nextHint.textContent = btnNext.disabled
    ? 'Bitte mindestens eine Header-Zeile und Datenzeilen bestätigen.'
    : `Bereit: ${classifications.filter(c => c.type === 'DATA').length} Datenzeilen erkannt.`;
}

// ---- Utility ----
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Next button (Schritt 3 kommt später) ----
btnNext.addEventListener('click', () => {
  alert('Schritt 3 (Mapping) ist noch in Entwicklung. Bis dahin: Alle Zeilen sind klassifiziert und bereit!');
});
