/**
 * date-parser.js — Historische Datumsangaben → GEDCOM
 *
 * Unterstuetzt:
 *  - Liturgische Feiertage: Johannis, Michaelis, Martini, Ostern, Pfingsten, …
 *  - Qualifikatoren: um/circa/ca./etwa → ABT, vor → BEF, nach → AFT
 *  - Zeitraeume: zwischen X und Y → BET X AND Y
 *  - Normale Daten: 3.5.1782, 3. Mai 1782, Mai 1782, 1782
 *  - Doppeljahre: 1715/16 → 1715
 *  - Altstil-Hinweis: O.S. / N.S. → NOTE
 */

// ---- GEDCOM-Monatskuerzel ----
const GEDCOM_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

const GERMAN_MONTHS = {
  'januar':1,'jan':1,'jänner':1,
  'februar':2,'feb':2,
  'märz':3,'maerz':3,'mar':3,'mär':3,
  'april':4,'apr':4,
  'mai':5,'may':5,
  'juni':6,'jun':6,
  'juli':7,'jul':7,
  'august':8,'aug':8,
  'september':9,'sep':9,'sept':9,
  'oktober':10,'oct':10,'okt':10,
  'november':11,'nov':11,
  'dezember':12,'dec':12,'dez':12,
};

// ---- Feste Feiertage (Tag, Monat) ----
const FIXED_FEASTS = {
  // Apostel & Heilige
  'neujahr':         [1, 1],
  'dreikönige':      [6, 1], 'heilige drei könige': [6, 1], 'epiphanias': [6, 1],
  'mariä lichtmess': [2, 2], 'lichtmess': [2, 2],
  'josephi':         [19, 3], 'joseftag': [19, 3],
  'georgi':          [23, 4],
  'philippi jacobi': [1, 5], 'philippus jacobus': [1, 5],
  'johannis':        [24, 6], 'johannistag': [24, 6], 'johanni': [24, 6],
  'petri pauli':     [29, 6], 'petri':      [29, 6],
  'mariä heimsuchung': [2, 7], 'visitatio': [2, 7],
  'jakobi':          [25, 7], 'jakobstag': [25, 7],
  'bartholomäi':     [24, 8], 'bartholomaeus': [24, 8], 'bartholomaei': [24, 8],
  'mariä geburt':    [8, 9],  'mariä himmelfahrt': [15, 8],
  'michaelis':       [29, 9], 'michaelstag': [29, 9],
  'galli':           [16, 10],
  'allerheiligen':   [1, 11],
  'allerseelen':     [2, 11],
  'martini':         [11, 11], 'martinitag': [11, 11],
  'andreae':         [30, 11], 'andreastag': [30, 11],
  'nikolaus':        [6, 12],
  'luciae':          [13, 12],
  'thomae':          [21, 12], 'thomas': [21, 12],
  'weihnachten':     [25, 12], 'christtag': [25, 12], 'weihnacht': [25, 12],
  'silvester':       [31, 12],
};

// ---- Bewegliche Feste (relativ zu Ostern) ----
const MOVABLE_FEASTS = {
  'fastnacht':    -47, 'fasching': -47, 'karneval': -47,
  'aschermittwoch': -46,
  'invokavit':    -42,  // 1. Fastensonntag
  'reminiszere':  -35,  // 2. Fastensonntag
  'okuli':        -28,
  'laetare':      -21,
  'judika':       -14,
  'palmarum':     -7,   'palmsonntag': -7,
  'gründonnerstag': -3, 'gruendonnerstag': -3,
  'karfreitag':   -2,
  'ostern':        0,   'ostersonntag': 0, 'oster': 0,
  'quasimodogeniti': 7,
  'misericordias': 14,
  'jubilate':     21,
  'cantate':      28,
  'rogate':       35,
  'himmelfahrt':  39,   'christi himmelfahrt': 39,
  'exaudi':       42,
  'pfingsten':    49,   'pfingstsonntag': 49,
  'trinitatis':   56,   'dreifaltigkeitssonntag': 56,
  'fronleichnam': 60,
};

// ---- Ostern-Berechnung (Gaußsche Formel) ----
function calcEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return { day, month };
}

function addDaysToEaster(easterDay, easterMonth, easterYear, offset) {
  const d = new Date(easterYear, easterMonth - 1, easterDay + offset);
  return { day: d.getDate(), month: d.getMonth() + 1 };
}

// ---- Hilfsfunktionen ----
function gedMonth(m) { return GEDCOM_MONTHS[m - 1] || '???'; }
function gedDate(day, month, year) {
  if (day && month && year) return day + ' ' + gedMonth(month) + ' ' + year;
  if (month && year)        return gedMonth(month) + ' ' + year;
  if (year)                 return String(year);
  return null;
}

// ---- Feiertag auflösen → {day, month, approx} ----
function resolveFeasts(name, year) {
  const key = name.toLowerCase().trim();
  if (FIXED_FEASTS[key]) {
    const [day, month] = FIXED_FEASTS[key];
    return { day, month, approx: false };
  }
  if (MOVABLE_FEASTS.hasOwnProperty(key) && year) {
    const easter = calcEaster(year);
    const offset = MOVABLE_FEASTS[key];
    const result = addDaysToEaster(easter.day, easter.month, year, offset);
    return { day: result.day, month: result.month, approx: false };
  }
  return null;
}

// ---- Qualifikatoren ----
const QUALIFIERS = {
  'um':       'ABT', 'circa':  'ABT', 'ca.': 'ABT', 'ca':  'ABT',
  'etwa':     'ABT', 'gegen':  'ABT', 'ungefähr': 'ABT', 'ungefaehr': 'ABT',
  'vor':      'BEF',
  'nach':     'AFT',
  'zwischen': 'BET',
};

// ---- Einzelnes Datum parsen ----
function parseSingleDate(str, year) {
  str = str.trim();

  // Feiertag direkt?
  const feast = resolveFeasts(str, year);
  if (feast) return gedDate(feast.day, feast.month, year);

  // "Feiertag Jahr"
  const feastYear = str.match(/^(.+?)\s+(\d{3,4})$/);
  if (feastYear) {
    const y = parseInt(feastYear[2]);
    const f = resolveFeasts(feastYear[1].trim(), y);
    if (f) return gedDate(f.day, f.month, y);
  }

  // "Doppeljahr 1715/16"
  const doubleYear = str.match(/^(\d{3,4})\/(\d{1,4})$/);
  if (doubleYear) {
    const y1 = parseInt(doubleYear[1]);
    return gedDate(null, null, y1);
  }

  // Numerisches Datum: 3.5.1782 / 03.05.1782 / 3/5/1782
  const numDate = str.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{3,4})$/);
  if (numDate) {
    return gedDate(parseInt(numDate[1]), parseInt(numDate[2]), parseInt(numDate[3]));
  }

  // "3. Mai 1782" / "Mai 1782"
  const textDate = str.match(/^(?:(\d{1,2})\.?\s+)?([a-zA-Z\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]+\.?)\s+(\d{3,4})$/);
  if (textDate) {
    const mon = GERMAN_MONTHS[textDate[2].toLowerCase().replace(/\.$/, '')];
    if (mon) return gedDate(textDate[1] ? parseInt(textDate[1]) : null, mon, parseInt(textDate[3]));
  }

  // Nur Jahr
  const onlyYear = str.match(/^\d{3,4}$/);
  if (onlyYear) return gedDate(null, null, parseInt(str));

  return null;
}

// ---- Jahrzahl aus einem Text extrahieren (Hilfsfunktion) ----
function extractYear(str) {
  const m = str.match(/\b(\d{3,4})\b/);
  return m ? parseInt(m[1]) : null;
}

/**
 * Hauptfunktion: parseHistoricalDate(inputString)
 * Gibt {gedcom, note} zurück oder null wenn nicht erkannt.
 *
 * Beispiele:
 *   "um Johannis 1782"         → { gedcom: "ABT 24 JUN 1782" }
 *   "vor Michaelis 1800"       → { gedcom: "BEF 29 SEP 1800" }
 *   "zwischen Ostern und Pfingsten 1801" → { gedcom: "BET 12 APR 1801 AND 31 MAY 1801" }
 *   "3. Mai 1782"              → { gedcom: "3 MAY 1782" }
 *   "1715/16"                  → { gedcom: "1715", note: "Doppeljahr: 1715/16" }
 *   "O.S. 15.3.1700"           → { gedcom: "15 MAR 1700", note: "Altstil (O.S.)" }
 */
function parseHistoricalDate(input) {
  if (!input || String(input).trim() === '') return null;
  let str = String(input).trim();
  const note = [];

  // Altstil / Neustil
  const osMatch = str.match(/(?:^|\s)(O\.S\.|O\.St\.|alt(?:en)?\s*stil(?:s)?)/i);
  const nsMatch = str.match(/(?:^|\s)(N\.S\.|N\.St\.|neu(?:en)?\s*stil(?:s)?)/i);
  if (osMatch) { note.push('Altstil (O.S.)'); str = str.replace(osMatch[0], '').trim().replace(/^[,;\s]+/, '').trim(); }
  if (nsMatch) { note.push('Neustil (N.S.)'); str = str.replace(nsMatch[0], '').trim().replace(/^[,;\s]+/, '').trim(); }

  // Doppeljahr
  const doubleYear = str.match(/\b(\d{3,4})\/(\d{1,4})\b/);
  if (doubleYear) note.push('Doppeljahr: ' + doubleYear[0]);

  // Zwischen X und Y
  const betMatch = str.match(/^zwischen\s+(.+?)\s+und\s+(.+)$/i);
  if (betMatch) {
    const y = extractYear(betMatch[1]) || extractYear(betMatch[2]);
    const d1 = parseSingleDate(betMatch[1].trim(), y);
    const d2 = parseSingleDate(betMatch[2].trim(), y);
    if (d1 && d2) return { gedcom: 'BET ' + d1 + ' AND ' + d2, note: note.join('; ') || null };
    if (d1)       return { gedcom: 'AFT ' + d1, note: note.join('; ') || null };
    if (d2)       return { gedcom: 'BEF ' + d2, note: note.join('; ') || null };
  }

  // Qualifikator am Anfang
  let qualifier = null;
  for (const [kw, gedQ] of Object.entries(QUALIFIERS)) {
    if (str.toLowerCase().startsWith(kw + ' ') || str.toLowerCase().startsWith(kw + '\t')) {
      qualifier = gedQ;
      str = str.slice(kw.length).trim();
      break;
    }
  }

  const year = extractYear(str);
  const base = parseSingleDate(str, year);
  if (!base) return null;

  const gedcom = qualifier ? qualifier + ' ' + base : base;
  return { gedcom, note: note.join('; ') || null };
}

// ---- Batchverarbeitung einer ganzen Spalte ----
function normalizeDateColumn(values) {
  return values.map(v => {
    if (!v || String(v).trim() === '') return { original: v, gedcom: null, note: null };
    const result = parseHistoricalDate(String(v));
    return {
      original: v,
      gedcom: result ? result.gedcom : null,
      note:   result ? result.note   : 'Nicht erkannt — als NOTE gespeichert',
      unrecognized: !result,
    };
  });
}
