// Log your logoff: stores answers in this Google Sheet.
// Paste into Extensions → Apps Script, then Deploy → New deployment → Web app
// (Execute as: Me, Who has access: Anyone). See README.md.

const SHEET_NAME = 'Answers';
const DAYS_SHOWN = 30;   // only answers from the last 30 days are shown
const MAX_ROWS = 3000;   // most recent answers returned to the site

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Submitted at', 'Stop minutes', 'Stop time', 'City', 'Occupation']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(s) {
  return String(s || '').trim().slice(0, 40);
}

// Site sends an answer.
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const minutes = Number(data.minutes);
    const city = clean_(data.city);
    const job = clean_(data.job);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439 || !city || !job) {
      return json_({ ok: false, error: 'invalid answer' });
    }
    // Stop spreadsheet formulas sneaking in.
    if (/^[=+\-@]/.test(city) || /^[=+\-@]/.test(job)) {
      return json_({ ok: false, error: 'invalid answer' });
    }
    const h = Math.floor(minutes / 60), m = minutes % 60;
    const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      getSheet_().appendRow([new Date(), minutes, label, city, job]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'could not save' });
  }
}

// Site asks for everyone's answers.
function doGet() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return json_({ ok: true, rows: [] });
  const start = Math.max(2, last - MAX_ROWS + 1);
  const values = sheet.getRange(start, 1, last - start + 1, 5).getValues();
  const since = Date.now() - DAYS_SHOWN * 864e5;
  const rows = values
    .filter(r => r[0] instanceof Date && r[0].getTime() >= since)
    .map(r => [r[1], r[3], r[4]]);
  return json_({ ok: true, rows });
}
