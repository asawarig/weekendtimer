// Log your logoff: stores answers in this Google Sheet.
// Paste into Extensions → Apps Script, then Deploy → New deployment → Web app
// (Execute as: Me, Who has access: Anyone). See README.md.
// After changing this code: Deploy → Manage deployments → Edit → Version: New version → Deploy.

const SHEET_NAME = 'Answers';
const DAYS_SHOWN = 30;   // only answers from the last 30 days are shown
const MAX_ROWS = 3000;   // most recent answers returned to the site
const HEADERS = ['Submitted at', 'Stop minutes', 'Stop time', 'City', 'Occupation', 'Night shift', 'Answer ID'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else if (sheet.getRange(1, 7).getValue() === '') {
    sheet.getRange(1, 7).setValue('Answer ID');
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

// Site sends an answer: first just the time, then again with city and job.
// Both use the same answer ID, so the second one fills in the same row.
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const minutes = Number(data.minutes);
    const city = clean_(data.city);
    const job = clean_(data.job);
    const night = data.night === true;
    const id = /^[a-z0-9]{8,30}$/.test(String(data.id || '')) ? String(data.id) : '';
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
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
      const sheet = getSheet_();
      const last = sheet.getLastRow();
      let row = 0;
      if (id && last >= 2) {
        // Look for this answer among the most recent rows.
        const from = Math.max(2, last - 500 + 1);
        const ids = sheet.getRange(from, 7, last - from + 1, 1).getValues();
        for (let i = ids.length - 1; i >= 0; i--) {
          if (ids[i][0] === id) { row = from + i; break; }
        }
      }
      if (row) {
        sheet.getRange(row, 2, 1, 5).setValues([[minutes, label, city, job, night]]);
      } else {
        sheet.appendRow([new Date(), minutes, label, city, job, night, id]);
      }
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
  const values = sheet.getRange(start, 1, last - start + 1, 6).getValues();
  const since = Date.now() - DAYS_SHOWN * 864e5;
  const rows = values
    .filter(r => r[0] instanceof Date && r[0].getTime() >= since)
    .map(r => [r[1], r[3], r[4], r[5] === true]);
  return json_({ ok: true, rows });
}
