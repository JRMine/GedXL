/**
 * profile.js - Mapping-Profil speichern und laden
 *
 * Speichert: mappingPersons + sourceDefs
 * Format: JSON mit Versionskennung
 */

const PROFILE_VERSION = 1;

function saveProfile() {
  const profile = {
    _gedxl: 'mapping-profile',
    _version: PROFILE_VERSION,
    _saved: new Date().toISOString(),
    sourceDefs: sourceDefs,
    mappingPersons: mappingPersons,
  };
  const json = JSON.stringify(profile, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const baseName = (typeof uploadedFileName !== 'undefined' && uploadedFileName)
    ? uploadedFileName + '_profil'
    : 'gedxl_profil';
  a.download = baseName + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadProfileFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const profile = JSON.parse(e.target.result);
        if (profile._gedxl !== 'mapping-profile') {
          reject(new Error('Keine gueltige GedXL-Profildatei.'));
          return;
        }
        resolve(profile);
      } catch (err) {
        reject(new Error('Datei konnte nicht gelesen werden: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
    reader.readAsText(file);
  });
}

function applyProfile(profile) {
  if (profile.sourceDefs) {
    sourceDefs = profile.sourceDefs;
  }
  if (profile.mappingPersons) {
    mappingPersons = profile.mappingPersons;
    // Sicherstellen dass activePersonId gueltig ist
    if (mappingPersons.length > 0) {
      activePersonId = mappingPersons[0].id;
    }
    // mappingIdCounter hochsetzen damit keine ID-Kollisionen entstehen
    let maxNum = 0;
    const allIds = [];
    mappingPersons.forEach(p => {
      allIds.push(p.id);
      p.fields.forEach(f => allIds.push(f.id));
      p.events.forEach(ev => {
        allIds.push(ev.id);
        ev.fields.forEach(f => allIds.push(f.id));
        ev.citations.forEach(c => allIds.push(c.id));
      });
      p.relatives.forEach(r => allIds.push(r.id));
      p.citations.forEach(c => allIds.push(c.id));
    });
    sourceDefs.forEach(s => allIds.push(s.id));
    allIds.forEach(id => {
      const m = String(id).match(/id_(\d+)/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    });
    mappingIdCounter = maxNum + 1;
  }
}
