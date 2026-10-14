# Log-off O'Clock

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
| `supabase.sql` | Database table and security rules |

## Connecting the crowd database (Supabase, free)

Until this is done the site runs in **preview mode** with made-up sample answers and a banner saying so.

1. Create a free project at https://supabase.com.
2. In the project, open **SQL Editor**, paste the contents of `supabase.sql` and run it.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Put them in `config.js` and push. The banner disappears and real answers start collecting.

The anon key is designed to be public. The security rules only allow adding and reading answers,
never editing or deleting them. Only answers whose city and job are in `data.js` are displayed.
