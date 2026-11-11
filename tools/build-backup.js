#!/usr/bin/env node
/* Bundles the front end (style.css, art.js, app.js, music.js) into the BACKUP_PAGE_HTML constant at the
   bottom of apps-script/Code.gs, so the Apps Script Web app can serve the page itself when GitHub Pages is down.
   Run after changing any front-end file:  node tools/build-backup.js */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const parts = { css: read("style.css"), art: read("art.js"), app: read("app.js"), music: read("music.js") };
for (const [k, v] of Object.entries(parts)) if (/<\/script/i.test(v)) throw new Error(k + " contains </script>, which would break the inline page");

const fonts = (read("index.html").match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/) || [""])[0];
const html = [
  fonts,
  "<style>" + parts.css + "</style>",
  '<div class="wrap"><div id="app"></div></div>',
  "<!--BOOT-->",
  "<script>" + parts.art + "</script>",
  "<script>" + parts.app + "</script>",
  "<script>" + parts.music + "</script>",
].join("\n");

const gsPath = path.join(root, "apps-script", "Code.gs");
const gs = fs.readFileSync(gsPath, "utf8");
const re = /(\/\* ==== BACKUP PAGE:[^\n]*\n)[\s\S]*?(\/\* ==== END BACKUP PAGE ==== \*\/)/;
if (!re.test(gs)) throw new Error("BACKUP PAGE markers not found in apps-script/Code.gs");
const literal = JSON.stringify(html).split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
fs.writeFileSync(gsPath, gs.replace(re, (_, a, b) => a + "const BACKUP_PAGE_HTML = " + literal + ";\n" + b));
console.log("Updated apps-script/Code.gs (" + Math.round(fs.statSync(gsPath).size / 1024) + " KB)");
