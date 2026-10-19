// Webflow Cloud sets `base` and `build.assetsPrefix` from the environment's mount path
// (e.g. /fun/log-your-logoff) and adds the Cloudflare adapter at build time, so neither is set here.
import { defineConfig } from 'astro/config';

export default defineConfig({});
