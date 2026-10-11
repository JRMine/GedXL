/**
 * app.js — GedXL Hauptlogik (Schritt 1 + 2)
 */

// ---- State ----
let parsedFile = null;
let currentRows = [];
let classifications = [];
let headers = [];
let varCounter = 1;
let ignoredColumns = new Set(); // Spalten-Indizes die ignoriert werden sollen

// ---- DOM Refs ----
const stepUpload   = document.getElementById('step-upload');
const stepSheets   = document.getElementById('step-sheets');
const stepImport   = document.getElementById('step-import');
const dropZone     = document.getElementById('drop-zone');
const fileInput    = document.getElementById('file-input');
const sheetList    = document.getElementById('sheet-list');
const rowTableBody = document.getElementById('row-table-body');
const globalvarsList = document.getElementById('globalvars-list');
const columnsList  = document.getElementById('columns-list');
const btnNext      = document.getElementById('btn-next');
const nextHint     = document.getElementById('next-hint');
const btnBack      = document.getElementById('btn-back');
const chkHideEmpty = document.getElementById('chk-hide-empty');
const navItems     = {
  1: document.getElementById('nav-1'),
  2: document.getElementById('nav-2'),
  3: document.getElementById('nav-3'),
  4: document.getElementById('nav-4'),
  5: document.getElementById('nav-5'),
};

// ---- Step / Nav helpers ----
let currentStep = 1;

function showStep(stepEl, stepNum) {
  [stepUpload, stepSheets, stepImport, document.getElementById('step-sources'), document.getElementById('step-mapping')].forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  stepEl.classList.remove('hidden');
  stepEl.classList.add('active');
  currentStep = stepNum;
  updateNav(stepNum);
  btnBack.style.display = stepNum > 1 ? 'inline-block' : 'none';
}

function updateNav(activeNum) {
  Object.entries(navItems).forEach(([num, el]) => {
    const n = parseInt(num);
    el.classList.remove('active', 'done', 'disabled');
    if (n === activeNum) el.classList.add('active');
    else if (n < activeNum) el.classList.add('done');
    else el.classList.add('disabled');
  });
}

// ---- Back button ----
btnBack.addEventListener('click', () => {
  if (currentStep === 4) {
    showStep(document.getElementById('step-sources'), 3);
  } else if (currentStep === 3) {
    showStep(stepImport, 2);
  } else if (currentStep === 2) {
    if (parsedFile && parsedFile.sheetNames.length > 1) showStep(stepSheets, 1);
    else showStep(stepUpload, 1);
  } else if (currentStep === 1 && document.getElementById('step-sheets').classList.contains('active')) {
    showStep(stepUpload, 1);
  }
});

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
      loadSheet(parsedFile.sheetNames[0]);
    } else {
      sheetList.innerHTML = '';
      parsedFile.sheetNames.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'sheet-btn';
        btn.textContent = name;
        btn.addEventListener('click', () => loadSheet(name));
        sheetList.appendChild(btn);
      });
      showStep(stepSheets, 1);
    }
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

// ---- Load sheet ----
function loadSheet(sheetName) {
  currentRows = parsedFile.getSheet(sheetName);
  while (currentRows.length > 0) {
    const last = currentRows[currentRows.length - 1];
    if (last.every(c => c === null || c === undefined || String(c).trim() === '')) currentRows.pop();
    else break;
  }
  classifications = classifyAllRows(currentRows);
  varCounter = 1;
  ignoredColumns = new Set();
  headers = deriveHeaders();
  renderRowTable();
  renderGlobalVars();
  renderColumnStats();
  checkNextButton();
  showStep(stepImport, 2);
}

// ---- Derive headers ----
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

    // Variable name(s) — for GLOBAL_VAR: one input per non-empty cell
    const tdVar = document.createElement('td');
    tdVar.className = 'td-varnames';
    if (cls.type === 'GLOBAL_VAR') {
      renderVarInputsForRow(tdVar, row, i);
    }
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

/**
 * Rendert pro nicht-leerer Zelle in einer GLOBAL_VAR-Zeile ein eigenes Eingabefeld.
 */
function renderVarInputsForRow(container, row, rowIdx) {
  container.innerHTML = '';
  row.forEach((cell, colIdx) => {
    if (cell === null || cell === undefined || String(cell).trim() === '') return;
    const val = String(cell).trim();
    const wrap = document.createElement('div');
    wrap.className = 'varname-wrap';

    const lbl = document.createElement('span');
    lbl.className = 'varname-col-lbl';
    const colName = headers[colIdx] || `Sp.${colIdx + 1}`;
    lbl.textContent = `Sp. „${colName}":`;
    lbl.title = `Spaltenname: ${colName}`;

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'varname-input';
    inp.dataset.colIdx = colIdx;
    // Auto-name: year → {Jahr}, otherwise {ColName}
    if (/^\d{4}$/.test(val)) {
      inp.value = '{Jahr}';
    } else {
      const colName = headers[colIdx] || `Var${varCounter++}`;
      inp.value = `{${colName.replace(/[{}]/g, '')}}`;
    }
    inp.addEventListener('input', () => renderGlobalVars());

    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    container.appendChild(wrap);
  });
}

// ---- Type change handler ----
function onTypeChange(rowIdx, newType, tr, sel) {
  classifications[rowIdx].type = newType;
  tr.className = `row-${newType}`;
  sel.className = `type-select type-${newType}`;

  const tdVar = tr.querySelectorAll('td')[2];
  tdVar.innerHTML = '';
  if (newType === 'GLOBAL_VAR') {
    renderVarInputsForRow(tdVar, currentRows[rowIdx], rowIdx);
  }

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
    const inputs = tr?.querySelectorAll('.varname-input') || [];
    inputs.forEach(inp => {
      const colIdx = parseInt(inp.dataset.colIdx);
      const cell = row[colIdx];
      const value = cell !== null && cell !== undefined ? String(cell).trim() : '?';
      items.push({ varName: inp.value || `{Var?}`, value, rowNum: i + 1 });
    });
  });

  if (items.length === 0) {
    globalvarsList.innerHTML = '<p class="empty-hint">Noch keine globalen Variablen definiert.</p>';
    return;
  }
  globalvarsList.innerHTML = '';
  items.forEach(({ varName, value, rowNum }) => {
    const div = document.createElement('div');
    div.className = 'globalvar-item';
    div.innerHTML = `<div class="globalvar-name">${escHtml(varName)}</div><div class="globalvar-value">Zeile ${rowNum}: „${escHtml(value)}"</div>`;
    globalvarsList.appendChild(div);
  });
}

// ---- Render column stats ----
function renderColumnStats() {
  headers = deriveHeaders();
  const stats = computeColumnStats(currentRows, classifications, headers);
  const hideEmpty = chkHideEmpty.checked;

  if (stats.length === 0) {
    columnsList.innerHTML = '<p class="empty-hint">Wird nach Bestätigung der Header-Zeile angezeigt.</p>';
    return;
  }

  columnsList.innerHTML = '';
  stats.forEach(({ name, fillRate, examples }, colIdx) => {
    if (hideEmpty && fillRate === 0) {
      ignoredColumns.add(colIdx);
      return;
    }
    const div = document.createElement('div');
    div.className = 'col-item';
    const isIgnored = ignoredColumns.has(colIdx);
    const barColor = fillRate >= 70 ? '#7ec8e3' : fillRate >= 30 ? '#ffcc80' : '#ef9a9a';

    div.innerHTML = `
      <div class="col-item-header">
        <div class="col-item-name" title="${escHtml(name)}">${escHtml(name)}</div>
        <label class="col-ignore-label" title="Diese Spalte beim Export ignorieren">
          <input type="checkbox" class="col-ignore-chk" data-col="${colIdx}" ${isIgnored ? 'checked' : ''} />
          ignorieren
        </label>
      </div>
      <div class="fill-bar-wrap">
        <div class="fill-bar"><div class="fill-bar-inner" style="width:${fillRate}%;background:${barColor}"></div></div>
        <span class="fill-pct">${fillRate}%</span>
      </div>
      <div class="col-example">${escHtml(examples.slice(0, 2).join(', ') || '–')}</div>
    `;

    div.querySelector('.col-ignore-chk').addEventListener('change', (e) => {
      if (e.target.checked) ignoredColumns.add(colIdx);
      else ignoredColumns.delete(colIdx);
    });

    columnsList.appendChild(div);
  });
}

chkHideEmpty.addEventListener('change', () => {
  renderColumnStats();
});

// ---- Check next button ----
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

// ---- Next button (Import-Check → Quelleneinstellungen) ----
btnNext.addEventListener('click', () => {
  initSources();
  showStep(document.getElementById('step-sources'), 3);
});

// ---- Sources → Mapping ----
document.getElementById('btn-sources-next').addEventListener('click', () => {
  initMapping();
  showStep(document.getElementById('step-mapping'), 4);
});
