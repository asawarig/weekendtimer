// Builds the social share cards in log-your-logoff/s/: one image (1200x630) and one small page per result, so a
// post on X or LinkedIn shows the right picture. Each page has the Open Graph / Twitter card tags
// and sends visitors straight on to the site.
//
// Run from the repo root with a local server on port 8765 (python3 -m http.server 8765):
//   node tools/make-share-cards.js
// Needs Playwright (npm i playwright) and a Chromium build.
const { chromium } = require('playwright');
const fs = require('fs');

const SITE = 'https://fun.plumhq.com/log-your-logoff/';
const cards = [];
for (let n = 5; n <= 95; n += 5) {
  cards.push({ key: `early-${n}`, s1: 'I plan to log off before', big: `${n}%`, s2: 'of India today', hour: 5.5, title: `I plan to log off before ${n}% of India today` });
  cards.push({ key: `late-${n}`, s1: 'I plan to log off after', big: `${n}%`, s2: 'of India today', hour: 9, title: `I plan to log off after ${n}% of India today` });
}
cards.push({ key: 'early', s1: 'I plan to log off', big: 'before most', s2: 'of India today', hour: 5.5, title: 'I plan to log off before most of India today' });
cards.push({ key: 'late', s1: 'I plan to log off', big: 'after most', s2: 'of India today', hour: 9, title: 'I plan to log off after most of India today' });
cards.push({ key: 'even', s1: 'I plan to log off', big: 'right on time', s2: 'with the rest of India', hour: 7, title: 'I plan to log off right when India does' });
cards.push({ key: 'night', s1: 'I plan to log off', big: 'after a night shift', s2: "while India's waking up", hour: 6, title: 'I plan to log off after a night shift' });

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const page = c => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(c.title)} | Log your logoff</title>
<meta name="description" content="When are you logging off? Add yours and see when the rest of India logs off.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Log your logoff by Plum">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="When are you logging off? Add yours and see when the rest of India logs off.">
<meta property="og:url" content="${SITE}s/${c.key}.html">
<meta property="og:image" content="${SITE}s/${c.key}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.title)}">
<meta name="twitter:image" content="${SITE}s/${c.key}.jpg">
<meta http-equiv="refresh" content="0; url=../">
</head>
<body><script>location.replace('../');</script><a href="../">Log your logoff</a></body>
</html>
`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const c of cards) {
    const q = new URLSearchParams({ s1: c.s1, big: c.big, s2: c.s2, hour: c.hour });
    await p.goto(`http://localhost:8765/tools/share-card.html?${q}`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({ path: `log-your-logoff/s/${c.key}.jpg`, type: 'jpeg', quality: 85 });
    fs.writeFileSync(`log-your-logoff/s/${c.key}.html`, page(c));
  }
  await b.close();
  console.log(`Built ${cards.length} share cards in s/`);
})();
