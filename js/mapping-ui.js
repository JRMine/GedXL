/**
 * mapping-ui.js — Mapping Dashboard UI
 */

// ---- DOM Refs (Mapping) — geladen lazy da erst bei Schritt 3 im DOM ----
let mappingLeft, mappingRight, previewCard, btnAddPerson, previewRowSelect;

function initMappingDomRefs() {
  mappingLeft       = document.getElementById('mapping-left');
  mappingRight      = document.getElementById('mapping-right');
  previewCard       = document.getElementById('preview-card');
  btnAddPerson      = document.getElementById('btn-add-person');
  previewRowSelect  = document.getElementById('preview-row-select');

  btnAddPerson.addEventListener('click', () => {
    const p = createPerson();
    p.label = `Person ${mappingPersons.length + 1}`;
    mappingPersons.push(p);
    activePersonId = p.id;
    renderPersonList();
    renderPreview();
  });

  document.getElementById('btn-to-export')?.addEventListener('click', () => {
    alert('Schritt 4 (Export) ist noch in Entwicklung.');
  });
}

let dragSourceData = null; // { colIdx, label } — currently dragged column
let activePersonId = null;

// ---- Init mapping step ----
function initMapping() {
  initMappingDomRefs();
  mappingPersons = [];
  const p = createPerson();
  p.label = 'Person';
  mappingPersons.push(p);
  activePersonId = p.id;

  renderColumnPalette();
  renderPersonList();
  renderPreview();
  populatePreviewRowSelect();
}

// ---- Column palette (left side) ----
function renderColumnPalette() {
  mappingLeft.innerHTML = '';

  const title = document.createElement('h3');
  title.className = 'palette-title';
  title.textContent = 'Verfügbare Spalten';
  mappingLeft.appendChild(title);

  const hint = document.createElement('p');
  hint.className = 'palette-hint';
  hint.textContent = 'Spalten per Drag & Drop auf ein Feld ziehen.';
  mappingLeft.appendChild(hint);

  const gvars = collectGlobalVars();
  if (Object.keys(gvars).length > 0) {
    const gTitle = document.createElement('div');
    gTitle.className = 'palette-section-title';
    gTitle.textContent = '🔖 Globale Variablen';
    mappingLeft.appendChild(gTitle);
    Object.entries(gvars).forEach(([varName, value]) => {
      const chip = document.createElement('div');
      chip.className = 'col-chip var-chip';
      chip.draggable = true;
      chip.innerHTML = `<span class="chip-name">${escHtml(varName)}</span><span class="chip-val">${escHtml(value)}</span>`;
      chip.addEventListener('dragstart', (e) => { dragSourceData = { type: 'var', varName, label: varName }; chip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy'; });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      mappingLeft.appendChild(chip);
    });
  }

  const colTitle = document.createElement('div');
  colTitle.className = 'palette-section-title';
  colTitle.textContent = '📋 Tabellenspalten';
  mappingLeft.appendChild(colTitle);

  headers.forEach((colName, colIdx) => {
    if (ignoredColumns.has(colIdx)) return;
    const example = getColExample(colIdx);
    const chip = document.createElement('div');
    chip.className = 'col-chip';
    chip.draggable = true;
    chip.innerHTML = `<span class="chip-name">${escHtml(colName)}</span>${example ? `<span class="chip-val">${escHtml(example)}</span>` : ''}`;
    chip.addEventListener('dragstart', (e) => { dragSourceData = { type: 'col', colIdx, label: colName }; chip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy'; });
    chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    mappingLeft.appendChild(chip);
  });

  const staticTitle = document.createElement('div');
  staticTitle.className = 'palette-section-title';
  staticTitle.textContent = '✏️ Manuelle Eingabe';
  mappingLeft.appendChild(staticTitle);
  const staticChip = document.createElement('div');
  staticChip.className = 'col-chip static-chip';
  staticChip.draggable = true;
  staticChip.innerHTML = `<span class="chip-name">✏️ Fester Wert</span><span class="chip-val">für alle Zeilen gleich</span>`;
  staticChip.addEventListener('dragstart', (e) => { dragSourceData = { type: 'static', value: '', label: 'Fester Wert' }; staticChip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy'; });
  staticChip.addEventListener('dragend', () => staticChip.classList.remove('dragging'));
  mappingLeft.appendChild(staticChip);

  // ---- Sources section ----
  if (sourceDefs.length > 0) {
    const srcTitle = document.createElement('div');
    srcTitle.className = 'palette-section-title';
    srcTitle.textContent = '📚 Quellen';
    mappingLeft.appendChild(srcTitle);

    const srcHint = document.createElement('p');
    srcHint.className = 'palette-hint';
    srcHint.textContent = 'Auf Person oder Ereignis ziehen, um Zitation manuell hinzuzufügen.';
    mappingLeft.appendChild(srcHint);

    sourceDefs.forEach(src => {
      const chip = document.createElement('div');
      chip.className = 'col-chip src-chip';
      chip.draggable = true;

      // Build preview of citation fields
      const dataRow = getFirstDataRow();
      const citPreview = src.citationFields
        .map(f => previewSourceField(f, dataRow))
        .filter(Boolean).slice(0, 1).join('') || '';

      const modeLabel = src.mode === 'existing'
        ? `ID: ${src.existingId || '?'}`
        : src.sourceFields.find(f => f.tag === 'TITL') ? previewSourceField(src.sourceFields.find(f => f.tag === 'TITL'), dataRow) || src.name : src.name;

      chip.innerHTML = `<span class="chip-name">📚 ${escHtml(src.name)}</span><span class="chip-val">${escHtml(modeLabel)}</span>`;
      chip.addEventListener('dragstart', (e) => {
        dragSourceData = { type: 'source', sourceId: src.id, label: src.name };
        chip.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      mappingLeft.appendChild(chip);
    });
  }
}

function getColExample(colIdx) {
  const row = getFirstDataRow();
  const v = row[colIdx];
  return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
}

// ---- Source Settings Block ----
function renderSourceSettings() {  const container = document.getElementById('source-settings-block');
  if (!container) return;
  container.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'source-block-title';
  title.textContent = '📚 Quelleneinstellungen';
  container.appendChild(title);

  // Mode selector
  const modeWrap = document.createElement('div');
  modeWrap.className = 'source-mode-wrap';
  const modes = [
    { value: 'static', label: 'Feste Quelle + Seitenzahl aus Tabelle' },
    { value: 'sheet',  label: 'Aus Tabellenblatt „Quelle und Bearbeiter"' },
    { value: 'column', label: 'Quelle aus Spalte (je Zeile unterschiedlich)' },
    { value: 'existing', label: 'Vorhandene GEDCOM-Quell-ID' },
  ];
  modes.forEach(m => {
    const lbl = document.createElement('label');
    lbl.className = 'source-mode-option';
    lbl.innerHTML = `<input type="radio" name="source-mode" value="${m.value}" ${sourceSettings.mode === m.value ? 'checked' : ''} /> ${m.label}`;
    lbl.querySelector('input').addEventListener('change', () => {
      sourceSettings.mode = m.value;
      renderSourceSettings();
      renderPreview();
    });
    modeWrap.appendChild(lbl);
  });
  container.appendChild(modeWrap);

  // Mode-specific fields
  const detail = document.createElement('div');
  detail.className = 'source-detail';

  if (sourceSettings.mode === 'static') {
    detail.innerHTML = `
      <div class="source-field-row">
        <label>Titel / Bezeichnung<input class="source-input" id="src-title" value="${escHtml(sourceSettings.title)}" placeholder="z.B. Verzeichnis der Schüler des Gymnasiums Bautzen" /></label>
      </div>
      <div class="source-field-row">
        <label>Archiv / Fundstelle<input class="source-input" id="src-archive" value="${escHtml(sourceSettings.archive)}" placeholder="z.B. Archivverbund Bautzen, Stadtarchiv, 62564-200" /></label>
      </div>
      <div class="source-field-row">
        <label>Bearbeiter<input class="source-input" id="src-editor" value="${escHtml(sourceSettings.editor)}" placeholder="z.B. Matthes, Fiebiger" /></label>
      </div>
      <div class="source-field-row">
        <label>Seitenzahl aus Spalte
          ${colSelect('src-citation-col', sourceSettings.citationColIdx)}
        </label>
      </div>
    `;
    detail.querySelector('#src-title').addEventListener('input', e => { sourceSettings.title = e.target.value; });
    detail.querySelector('#src-archive').addEventListener('input', e => { sourceSettings.archive = e.target.value; });
    detail.querySelector('#src-editor').addEventListener('input', e => { sourceSettings.editor = e.target.value; });
    detail.querySelector('#src-citation-col').addEventListener('change', e => {
      sourceSettings.citationColIdx = e.target.value === '' ? null : parseInt(e.target.value);
    });

  } else if (sourceSettings.mode === 'sheet') {
    const sheetOptions = parsedFile ? parsedFile.sheetNames.map(n =>
      `<option value="${escHtml(n)}" ${sourceSettings.sheetName === n ? 'selected' : ''}>${escHtml(n)}</option>`
    ).join('') : '';
    detail.innerHTML = `
      <div class="source-field-row">
        <label>Tabellenblatt mit Quelldaten
          <select class="source-input" id="src-sheet"><option value="">-- bitte wählen --</option>${sheetOptions}</select>
        </label>
      </div>
      <p class="source-hint">Das Blatt muss die Felder „Quelle:" und „Bearbeiter:" enthalten.</p>
    `;
    detail.querySelector('#src-sheet').addEventListener('change', e => { sourceSettings.sheetName = e.target.value; });

  } else if (sourceSettings.mode === 'column') {
    detail.innerHTML = `
      <div class="source-field-row">
        <label>Quell-Titel aus Spalte ${colSelect('src-title-col', sourceSettings.titleColIdx)}</label>
      </div>
      <div class="source-field-row">
        <label>Seitenzahl aus Spalte ${colSelect('src-citation-col2', sourceSettings.citationColIdx)}</label>
      </div>
    `;
    detail.querySelector('#src-title-col').addEventListener('change', e => {
      sourceSettings.titleColIdx = e.target.value === '' ? null : parseInt(e.target.value);
    });
    detail.querySelector('#src-citation-col2').addEventListener('change', e => {
      sourceSettings.citationColIdx = e.target.value === '' ? null : parseInt(e.target.value);
    });

  } else if (sourceSettings.mode === 'existing') {
    detail.innerHTML = `
      <div class="source-field-row">
        <label>GEDCOM Quell-ID<input class="source-input" id="src-existing-id" value="${escHtml(sourceSettings.existingId)}" placeholder="z.B. @S1@" /></label>
      </div>
      <p class="source-hint">Die Quelle muss bereits in der Ziel-GEDCOM-Datei vorhanden sein.</p>
    `;
    detail.querySelector('#src-existing-id').addEventListener('input', e => { sourceSettings.existingId = e.target.value; });
  }

  container.appendChild(detail);
}

function colSelect(id, selectedIdx) {
  const opts = ['<option value="">-- keine --</option>'];
  headers.forEach((h, i) => {
    if (ignoredColumns.has(i)) return;
    opts.push(`<option value="${i}" ${selectedIdx === i ? 'selected' : ''}>${escHtml(h)}</option>`);
  });
  return `<select class="source-input source-col-sel" id="${id}">${opts.join('')}</select>`;
}

// ---- Person list (right side) ----
function renderPersonList() {
  mappingRight.innerHTML = '';

  mappingPersons.forEach(person => {
    const card = document.createElement('div');
    card.className = 'person-card' + (person.id === activePersonId ? ' active' : '');
    card.id = 'person-' + person.id;

    // Card header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'person-card-header';
    cardHeader.innerHTML = `
      <span class="person-icon">👤</span>
      <input class="person-label-input" value="${escHtml(person.label)}" placeholder="Personenbezeichnung" />
      <button class="btn-icon btn-remove-person" title="Person entfernen" data-pid="${person.id}">✕</button>
    `;
    cardHeader.querySelector('.person-label-input').addEventListener('input', e => {
      person.label = e.target.value;
      renderPersonList();
      renderPreview();
    });
    cardHeader.querySelector('.btn-remove-person').addEventListener('click', () => {
      if (mappingPersons.length === 1) { alert('Mindestens eine Person muss vorhanden sein.'); return; }
      // Remove any relatives pointing to this person
      mappingPersons.forEach(p => {
        p.relatives = p.relatives.filter(r => r.targetPersonId !== person.id);
      });
      mappingPersons = mappingPersons.filter(p => p.id !== person.id);
      if (activePersonId === person.id) activePersonId = mappingPersons[0].id;
      renderPersonList();
      renderPreview();
    });
    card.appendChild(cardHeader);

    // Person fields section
    const fieldsSection = document.createElement('div');
    fieldsSection.className = 'fields-section';
    fieldsSection.innerHTML = '<div class="fields-section-title">Personenfelder</div>';
    person.fields.forEach(field => fieldsSection.appendChild(renderField(field, person, null)));
    const addFieldBtn = createAddButton('+ Feld hinzufügen', GEDCOM_PERSON_FIELDS, (path) => {
      addPersonField(person, path); renderPersonList(); renderPreview();
    });
    fieldsSection.appendChild(addFieldBtn);
    card.appendChild(fieldsSection);

    // Events section
    const evSection = document.createElement('div');
    evSection.className = 'fields-section';
    evSection.innerHTML = '<div class="fields-section-title">Ereignisse</div>';
    person.events.forEach(ev => evSection.appendChild(renderEvent(ev, person)));
    const addEvBtn = createAddButton('+ Ereignis hinzufügen', GEDCOM_EVENT_TYPES.map(e => ({path: e.tag, label: e.label})), (tag) => {
      addEvent(person, tag); renderPersonList(); renderPreview();
    });
    evSection.appendChild(addEvBtn);
    card.appendChild(evSection);

    // Relatives section — links to other persons in this mapping
    const relSection = document.createElement('div');
    relSection.className = 'fields-section';
    relSection.innerHTML = '<div class="fields-section-title">Beziehungen zu anderen Personen</div>';

    const otherPersons = mappingPersons.filter(p => p.id !== person.id);

    if (otherPersons.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'rel-hint';
      hint.textContent = 'Fügen Sie eine weitere Person hinzu, um Beziehungen definieren zu können.';
      relSection.appendChild(hint);
    } else {
      const relList = document.createElement('div');
      relList.className = 'rel-list';
      person.relatives.forEach(rel => {
        const relItem = document.createElement('div');
        relItem.className = 'rel-item';
        const roleOptions = ['Vater','Mutter','Kind','Partner','Geschwister'].map(r =>
          `<option value="${r}" ${rel.role === r ? 'selected' : ''}>${r}</option>`
        ).join('');
        const personOptions = otherPersons.map(p =>
          `<option value="${p.id}" ${rel.targetPersonId === p.id ? 'selected' : ''}>${escHtml(p.label)}</option>`
        ).join('');
        relItem.innerHTML = `
          <span class="rel-desc">ist</span>
          <select class="rel-role-sel">${roleOptions}</select>
          <span class="rel-desc">von</span>
          <select class="rel-person-sel">${personOptions}</select>
          <button class="btn-icon" title="Beziehung entfernen">✕</button>
        `;
        relItem.querySelector('.rel-role-sel').addEventListener('change', e => { rel.role = e.target.value; renderPreview(); });
        relItem.querySelector('.rel-person-sel').addEventListener('change', e => { rel.targetPersonId = e.target.value; renderPreview(); });
        relItem.querySelector('.btn-icon').addEventListener('click', () => {
          person.relatives = person.relatives.filter(r => r.id !== rel.id);
          renderPersonList(); renderPreview();
        });
        relList.appendChild(relItem);
      });
      relSection.appendChild(relList);

      const addRelBtn = document.createElement('button');
      addRelBtn.className = 'btn-secondary btn-small';
      addRelBtn.textContent = '+ Beziehung hinzufügen';
      addRelBtn.addEventListener('click', () => {
        person.relatives.push({ id: newId(), role: 'Vater', targetPersonId: otherPersons[0].id });
        renderPersonList(); renderPreview();
      });
      relSection.appendChild(addRelBtn);
    }
    card.appendChild(relSection);

    mappingRight.appendChild(card);
  });

  mappingRight.appendChild(btnAddPerson);
}

function getColExample(colIdx) {
  const row = getFirstDataRow();
  const v = row[colIdx];
  return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
}

// ---- Person list (right side) ----
function renderPersonList() {
  mappingRight.innerHTML = '';

  mappingPersons.forEach(person => {
    const card = document.createElement('div');
    card.className = 'person-card' + (person.id === activePersonId ? ' active' : '');
    card.id = 'person-' + person.id;

    // Card header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'person-card-header';
    cardHeader.innerHTML = `
      <span class="person-icon">👤</span>
      <input class="person-label-input" value="${escHtml(person.label)}" placeholder="Personenbezeichnung" />
      <button class="btn-icon btn-remove-person" title="Person entfernen" data-pid="${person.id}">✕</button>
    `;
    cardHeader.querySelector('.person-label-input').addEventListener('input', e => {
      person.label = e.target.value;
      renderPreview();
    });
    cardHeader.querySelector('.btn-remove-person').addEventListener('click', () => {
      if (mappingPersons.length === 1) { alert('Mindestens eine Person muss vorhanden sein.'); return; }
      mappingPersons = mappingPersons.filter(p => p.id !== person.id);
      if (activePersonId === person.id) activePersonId = mappingPersons[0].id;
      renderPersonList();
      renderPreview();
    });
    card.appendChild(cardHeader);

    // Person fields section
    const fieldsSection = document.createElement('div');
    fieldsSection.className = 'fields-section';
    const fTitle = document.createElement('div');
    fTitle.className = 'fields-section-title';
    fTitle.textContent = 'Personenfelder';
    fieldsSection.appendChild(fTitle);

    // Render existing person fields
    person.fields.forEach(field => {
      fieldsSection.appendChild(renderField(field, person, null));
    });

    // Add field button
    const addFieldBtn = createAddButton('+ Feld hinzufügen', GEDCOM_PERSON_FIELDS, (path) => {
      addPersonField(person, path);
      renderPersonList();
      renderPreview();
    });
    fieldsSection.appendChild(addFieldBtn);
    card.appendChild(fieldsSection);

    // Events section
    const evSection = document.createElement('div');
    evSection.className = 'fields-section';
    const evTitle = document.createElement('div');
    evTitle.className = 'fields-section-title';
    evTitle.textContent = 'Ereignisse';
    evSection.appendChild(evTitle);

    person.events.forEach(ev => {
      evSection.appendChild(renderEvent(ev, person));
    });

    const addEvBtn = createAddButton('+ Ereignis hinzufügen', GEDCOM_EVENT_TYPES.map(e => ({path: e.tag, label: e.label})), (tag) => {
      addEvent(person, tag);
      renderPersonList();
      renderPreview();
    });
    evSection.appendChild(addEvBtn);
    card.appendChild(evSection);

    // Relatives section
    const relSection = document.createElement('div');
    relSection.className = 'fields-section';
    relSection.innerHTML = `<div class="fields-section-title">Verwandte</div>`;
    const relList = document.createElement('div');
    relList.className = 'rel-list';
    person.relatives.forEach(rel => {
      const relItem = document.createElement('div');
      relItem.className = 'rel-item';
      const roleOptions = ['Vater','Mutter','Kind','Partner'].map(r =>
        `<option value="${r}" ${rel.role===r?'selected':''}>${r}</option>`
      ).join('');
      relItem.innerHTML = `
        <select class="rel-role-sel">${roleOptions}</select>
        <input class="rel-name-input" value="${escHtml(rel.label||'')}" placeholder="Bezeichnung (z.B. Vater Beruf)" />
        <button class="btn-icon" title="Entfernen">✕</button>
      `;
      relItem.querySelector('.rel-role-sel').addEventListener('change', e => { rel.role = e.target.value; renderPreview(); });
      relItem.querySelector('.rel-name-input').addEventListener('input', e => { rel.label = e.target.value; renderPreview(); });
      relItem.querySelector('.btn-icon').addEventListener('click', () => {
        person.relatives = person.relatives.filter(r => r.id !== rel.id);
        renderPersonList(); renderPreview();
      });
      relList.appendChild(relItem);
    });
    relSection.appendChild(relList);
    const addRelBtn = document.createElement('button');
    addRelBtn.className = 'btn-secondary btn-small';
    addRelBtn.textContent = '+ Verwandten hinzufügen';
    addRelBtn.addEventListener('click', () => {
      person.relatives.push({ id: newId(), role: 'Vater', label: '' });
      renderPersonList(); renderPreview();
    });
    relSection.appendChild(addRelBtn);
    card.appendChild(relSection);

    mappingRight.appendChild(card);
  });

  mappingRight.appendChild(btnAddPerson);
}

// ---- Render a single field row ----
function renderField(field, person, ev) {
  const row = document.createElement('div');
  row.className = 'field-row';
  row.id = 'field-' + field.id;

  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = field.label;
  row.appendChild(label);

  const dropZoneEl = document.createElement('div');
  dropZoneEl.className = 'field-drop-zone' + (field.sources.length === 0 ? ' empty' : '');
  dropZoneEl.title = 'Spalte hier ablegen';

  // Existing source chips
  field.sources.forEach(src => {
    dropZoneEl.appendChild(renderSourceChip(src, field));
  });

  // Drop handling
  dropZoneEl.addEventListener('dragover', e => { e.preventDefault(); dropZoneEl.classList.add('drag-over'); });
  dropZoneEl.addEventListener('dragleave', () => dropZoneEl.classList.remove('drag-over'));
  dropZoneEl.addEventListener('drop', e => {
    e.preventDefault();
    dropZoneEl.classList.remove('drag-over');
    if (!dragSourceData) return;
    let src = { ...dragSourceData };
    if (src.type === 'static') {
      const val = prompt('Festen Wert eingeben (gilt für alle Zeilen):');
      if (val === null) return;
      src.value = val;
      src.label = val || '(leer)';
    }
    addSourceToField(field, src);
    renderPersonList();
    renderPreview();
  });

  // Empty hint
  if (field.sources.length === 0) {
    const hint = document.createElement('span');
    hint.className = 'drop-hint';
    hint.textContent = 'Spalte hierher ziehen';
    dropZoneEl.appendChild(hint);
  }

  row.appendChild(dropZoneEl);

  // Preview value
  const previewVal = document.createElement('div');
  previewVal.className = 'field-preview-val';
  const pv = previewFieldValue(field, getFirstDataRow(), collectGlobalVars());
  previewVal.textContent = pv || '';
  row.appendChild(previewVal);

  // Remove field button
  const rmBtn = document.createElement('button');
  rmBtn.className = 'btn-icon field-remove';
  rmBtn.title = 'Feld entfernen';
  rmBtn.textContent = '✕';
  rmBtn.addEventListener('click', () => {
    if (ev) ev.fields = ev.fields.filter(f => f.id !== field.id);
    else person.fields = person.fields.filter(f => f.id !== field.id);
    renderPersonList(); renderPreview();
  });
  row.appendChild(rmBtn);

  return row;
}

// ---- Render a source chip ----
function renderSourceChip(src, field) {
  const chip = document.createElement('div');
  chip.className = 'source-chip';
  if (src.type === 'static') chip.classList.add('source-static');
  if (src.type === 'var') chip.classList.add('source-var');

  const icon = src.type === 'col' ? '📋' : src.type === 'var' ? '🔖' : '✏️';
  const label = src.type === 'col' ? (headers[src.colIdx] || `Sp.${src.colIdx}`) :
                src.type === 'var' ? src.varName : `"${src.value}"`;

  chip.innerHTML = `${icon} ${escHtml(label)} <button class="chip-remove" title="Entfernen">×</button>`;
  chip.querySelector('.chip-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    removeSourceFromField(field, src.id);
    renderPersonList(); renderPreview();
  });
  return chip;
}

// ---- Render an event block ----
function renderEvent(ev, person) {
  const block = document.createElement('div');
  block.className = 'event-block';

  // Drop zone for source chips on the whole event
  block.addEventListener('dragover', e => { e.preventDefault(); block.classList.add('drag-over-event'); });
  block.addEventListener('dragleave', () => block.classList.remove('drag-over-event'));
  block.addEventListener('drop', e => {
    e.preventDefault();
    block.classList.remove('drag-over-event');
    if (!dragSourceData || dragSourceData.type !== 'source') return;
    const already = ev.citations.find(c => c.sourceId === dragSourceData.sourceId);
    if (!already) {
      ev.citations.push({ id: newId(), sourceId: dragSourceData.sourceId, overrides: {} });
      renderPersonList(); renderPreview();
    }
  });

  const header = document.createElement('div');
  header.className = 'event-header';
  header.innerHTML = `
    <span class="event-tag">${escHtml(ev.tag)}</span>
    <span class="event-label">${escHtml(ev.label)}</span>
    <button class="btn-icon btn-remove-event" title="Ereignis entfernen">✕</button>
  `;
  header.querySelector('.btn-remove-event').addEventListener('click', () => {
    person.events = person.events.filter(e => e.id !== ev.id);
    renderPersonList(); renderPreview();
  });
  block.appendChild(header);

  if (ev.tag === 'EVEN') {
    const typeRow = document.createElement('div');
    typeRow.className = 'event-type-row';
    typeRow.innerHTML = `<label>Ereignistyp: <input class="event-type-input" value="${escHtml(ev.customType)}" placeholder="z.B. Schuleintritt" /></label>`;
    typeRow.querySelector('input').addEventListener('input', e => { ev.customType = e.target.value; renderPreview(); });
    block.appendChild(typeRow);
  }

  ev.fields.forEach(field => block.appendChild(renderField(field, person, ev)));

  const addBtn = createAddButton('+ Feld', GEDCOM_EVENT_FIELDS.map(f => ({path: f.path, label: f.label})), (path) => {
    addEventField(ev, path); renderPersonList(); renderPreview();
  }, true);
  block.appendChild(addBtn);

  // ---- Citations block ----
  const citBlock = document.createElement('div');
  citBlock.className = 'event-citations-block';

  // Auto-citations from sourceDefs (attachTo.events)
  const autoCits = sourceDefs.filter(s => s.attachTo.events);
  // Manual citations added via drag
  const manualCits = ev.citations.filter(c => !autoCits.find(s => s.id === c.sourceId));

  if (autoCits.length > 0 || manualCits.length > 0) {
    const citTitle = document.createElement('div');
    citTitle.className = 'event-citations-title';
    citTitle.textContent = '📚 Zitationen';
    citBlock.appendChild(citTitle);
  }

  autoCits.forEach(src => {
    const manual = ev.citations.find(c => c.sourceId === src.id);
    citBlock.appendChild(renderCitationRow(src, ev, manual, true));
  });

  manualCits.forEach(cit => {
    const src = sourceDefs.find(s => s.id === cit.sourceId);
    if (src) citBlock.appendChild(renderCitationRow(src, ev, cit, false));
  });

  if (autoCits.length === 0 && manualCits.length === 0) {
    const dropHint = document.createElement('div');
    dropHint.className = 'event-drop-source-hint';
    dropHint.textContent = '📚 Quelle aus linker Palette hierher ziehen';
    citBlock.appendChild(dropHint);
  }

  block.appendChild(citBlock);
  return block;
}

// ---- Render one citation row ----
function renderCitationRow(src, ev, manualCit, isAuto) {
  const row = document.createElement('div');
  row.className = 'citation-row' + (isAuto ? ' citation-auto' : ' citation-manual');

  const badge = isAuto
    ? `<span class="cit-badge cit-auto" title="Wird automatisch angehängt (Quelleneinstellungen)">auto</span>`
    : `<span class="cit-badge cit-manual" title="Manuell hinzugefügt">manuell</span>`;

  row.innerHTML = `
    <div class="cit-header">
      ${badge}
      <span class="cit-name">📚 ${escHtml(src.name)}</span>
      ${!isAuto ? `<button class="btn-icon cit-remove" title="Zitation entfernen">✕</button>` : ''}
    </div>
  `;

  if (!isAuto) {
    row.querySelector('.cit-remove').addEventListener('click', () => {
      ev.citations = ev.citations.filter(c => c.id !== manualCit?.id);
      renderPersonList(); renderPreview();
    });
  }

  // Show citation fields preview
  const dataRow = getFirstDataRow();
  const gvars = collectGlobalVars();
  const fieldsList = document.createElement('div');
  fieldsList.className = 'cit-fields';
  src.citationFields.forEach(f => {
    const v = previewSourceField(f, dataRow);
    if (!v && !manualCit?.overrides?.[f.tag]) return;
    const fRow = document.createElement('div');
    fRow.className = 'cit-field-row';
    fRow.innerHTML = `<span class="cit-field-tag">${escHtml(f.tag)}</span><span class="cit-field-val">${escHtml(v || '–')}</span>`;
    fieldsList.appendChild(fRow);
  });
  row.appendChild(fieldsList);

  return row;
}

// ---- Generic "add" dropdown button (portal — rendered in body) ----
let activeDropdown = null;

function closeActiveDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
}

document.addEventListener('click', closeActiveDropdown);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActiveDropdown(); });

function createAddButton(text, options, onSelect, small = false) {
  const btn = document.createElement('button');
  btn.className = small ? 'btn-secondary btn-small add-btn' : 'btn-secondary add-btn';
  btn.textContent = text;
  btn.style.marginTop = '6px';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeActiveDropdown();

    const dropdown = document.createElement('div');
    dropdown.className = 'add-dropdown-portal';

    options.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'add-dropdown-item';
      item.textContent = opt.label;
      item.addEventListener('mousedown', (ev) => {
        ev.stopPropagation();
        closeActiveDropdown();
        onSelect(opt.path);
      });
      dropdown.appendChild(item);
    });

    document.body.appendChild(dropdown);
    activeDropdown = dropdown;

    // Position below the button
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = Math.min(options.length * 38, 280);

    dropdown.style.position = 'fixed';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.minWidth = Math.max(rect.width, 240) + 'px';

    if (spaceBelow >= dropH || spaceBelow >= 120) {
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.bottom = 'auto';
    } else {
      dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
      dropdown.style.top = 'auto';
    }
  });

  // Wrap in div for layout consistency
  const wrap = document.createElement('div');
  wrap.className = 'add-btn-wrap';
  wrap.appendChild(btn);
  return wrap;
}

// ---- Preview card ----
function renderPreview() {
  if (!previewCard) return;
  const dataRow = getPreviewRow();
  const gvars = collectGlobalVars();

  previewCard.innerHTML = '';

  mappingPersons.forEach(person => {
    const section = document.createElement('div');
    section.className = 'preview-person';

    const title = document.createElement('div');
    title.className = 'preview-person-title';

    // Build display name from NAME fields
    const givn = person.fields.find(f => f.path === 'NAME.GIVN');
    const surn = person.fields.find(f => f.path === 'NAME.SURN');
    const nameStr = [
      givn ? previewFieldValue(givn, dataRow, gvars) : '',
      surn ? previewFieldValue(surn, dataRow, gvars) : ''
    ].filter(Boolean).join(' ') || person.label;
    title.textContent = '👤 ' + nameStr;
    section.appendChild(title);

    // Person fields
    person.fields.forEach(field => {
      const pv = previewFieldValue(field, dataRow, gvars);
      if (!pv) return;
      const row = document.createElement('div');
      row.className = 'preview-row';
      row.innerHTML = `<span class="preview-key">${escHtml(field.label)}</span><span class="preview-val">${escHtml(pv)}</span>`;
      section.appendChild(row);
    });

    // Events
    person.events.forEach(ev => {
      const evBlock = document.createElement('div');
      evBlock.className = 'preview-event';
      const evLabel = ev.tag === 'EVEN' && ev.customType ? ev.customType : ev.label;
      evBlock.innerHTML = `<div class="preview-event-title">📅 ${escHtml(evLabel)}</div>`;
      ev.fields.forEach(field => {
        const pv = previewFieldValue(field, dataRow, gvars);
        if (!pv) return;
        const row = document.createElement('div');
        row.className = 'preview-row';
        row.innerHTML = `<span class="preview-key">${escHtml(field.label)}</span><span class="preview-val">${escHtml(pv)}</span>`;
        evBlock.appendChild(row);
      });
      section.appendChild(evBlock);
    });

    // Relatives
    if (person.relatives.length > 0) {
      const relBlock = document.createElement('div');
      relBlock.className = 'preview-event';
      relBlock.innerHTML = '<div class="preview-event-title">👪 Verwandte</div>';
      person.relatives.forEach(rel => {
        const row = document.createElement('div');
        row.className = 'preview-row';
        row.innerHTML = `<span class="preview-key">${escHtml(rel.role)}</span><span class="preview-val">${escHtml(rel.label || '(definiert)')}</span>`;
        relBlock.appendChild(row);
      });
      section.appendChild(relBlock);
    }

    previewCard.appendChild(section);
  });

  if (previewCard.children.length === 0) {
    previewCard.innerHTML = '<p class="empty-hint">Noch keine Felder zugeordnet.</p>';
  }
}

function getPreviewRow() {
  const sel = document.getElementById('preview-row-select');
  const idx = sel ? parseInt(sel.value) : -1;
  if (idx >= 0 && currentRows[idx]) return currentRows[idx];
  return getFirstDataRow();
}

function populatePreviewRowSelect() {
  const sel = document.getElementById('preview-row-select');
  if (!sel) return;
  sel.innerHTML = '';
  classifications.forEach((cls, i) => {
    if (cls.type !== 'DATA') return;
    const opt = document.createElement('option');
    opt.value = i;
    const row = currentRows[i];
    const preview = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').slice(0, 2).join(', ');
    opt.textContent = `Zeile ${i + 1}: ${preview || '(leer)'}`;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', renderPreview);
}
