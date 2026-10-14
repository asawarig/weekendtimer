# Log your logoff

A crowd-sourced clock, drawn in crayon. Visitors:

1. Drag a clock to the time they'll stop working today (with AM/PM).
2. Pick their city in India (popular cities as buttons, or search the full list).
3. Pick their occupation from a searchable list.

Then they see the **crowd clock**: everyone's answers as crayon dots around the dial, the
average log-off time as a red hand, how they compare with everyone, their city and their job,
and leaderboards of the cities that log off latest and the jobs that log off earliest.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `style.css` | Crayon styling |
| `app.js` | Clock, steps, dropdowns, results |
| `data.js` | City and occupation lists |
| `config.js` | Database connection settings |
| `apps-script.gs` | Google Sheet script that saves and serves answers |

## Connecting the crowd database (Google Sheet, free)

Until this is done the site runs in **preview mode** with made-up sample answers and a banner saying so.

1. Create a new Google Sheet (any name, e.g. "Log your logoff answers").
2. In the sheet, open **Extensions → Apps Script**. Delete what's there, paste in `apps-script.gs`, and click **Save**.
3. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, then **Authorize access** and allow it with your Google account.
   (Google may warn the app isn't verified: click **Advanced → Go to … (unsafe)**. It's your own script.)
5. Copy the **Web app URL** (ends in `/exec`), put it in `config.js` as `sheetUrl`, and push.

Answers appear as rows in an **Answers** tab. Only answers whose city and job are in `data.js` are shown on the site.
If you change the script later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.
