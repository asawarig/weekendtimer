# Log your logoff: Webflow Cloud app (Astro)

The same site as `log-your-logoff/`, packaged as an Astro app so it can run on Webflow Cloud at
**plumhq.com/fun/log-your-logoff**.

The Astro app sits at the top level of the repo (`package.json`, `astro.config.mjs`, `webflow.json`, `src/`, `public/`).

- `src/pages/index.astro`: the page. Asset URLs start with `import.meta.env.BASE_URL`, which Webflow Cloud
  sets to the environment's mount path.
- `public/`: scripts, styles, images and the share cards. Copied from `log-your-logoff/` by
  `npm run sync` (also run automatically by `npm run build`).
- `webflow.json`: tells Webflow Cloud this is an Astro app. Base path and the Cloudflare adapter are added
  by Webflow Cloud at build time, so `astro.config.mjs` stays empty.

## Connect it in Webflow

1. In the Webflow site, open **Webflow Cloud** and create a project from the GitHub repo
   `asawarig/weekendtimer` (Webflow needs access to the repo). No directory setting is needed.
2. Create an environment on branch `main` with mount path **`/fun/log-your-logoff`**.
3. Deploy, then publish the Webflow site. The page is live at plumhq.com/fun/log-your-logoff.

## Run locally

    npm install
    npm run dev          # http://localhost:4321/
    npx astro build --base /fun/log-your-logoff   # build as Webflow Cloud would
