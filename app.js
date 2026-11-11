/* Family Secret Santa — front end. Talks to the Google Apps Script backend in apps-script/Code.gs. */
(function () {
"use strict";

const API = String(window.SECRET_SANTA_API || "").trim();
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const urlCode = params.get("code") || "";
const PAGE_URL = location.origin + location.pathname;

let STATUS = null;          // public status from the server
let view = params.has("organiser") ? "organiser" : "main";
let admin = null;           // organiser view data
let adminPw = "";
let flash = null;           // {kind,en,sv,where}
let resetArmed = false;
let revealed = false;
let codes = null;           // organiser's "Show codes" list (names + codes only)
let matches = null;         // {name: match}, filled only after "Show who has whom" is confirmed
let matchArmed = false;

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bi = (en, sv) => `<span class="en">${en}</span><span class="sv" lang="sv">${sv}</span>`;
const bil = (en, sv) => `<span class="bil">${en} <span class="sv-inline" lang="sv"><span class="dot">· </span>${sv}</span></span>`;
const fmtCode = s => { const c = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8); return c.length > 4 ? c.slice(0, 4) + "-" + c.slice(4) : c; };
function setFlash(kind, en, sv, where) { flash = { kind, en, sv, where: where || "" }; }
function flashHTML(where) { return flash && flash.where === (where || "") ? `<div class="msg ${flash.kind}" role="status">${bi(esc(flash.en), esc(flash.sv))}</div>` : ""; }
class BiError extends Error { constructor(en, sv) { super(en); this.sv = sv; } }

const ERRORS = {
  not_drawn: ["The names haven't been drawn yet.", "Namnen är inte dragna än."],
  not_found: ["That email isn't on the list. Use the address the organiser has for you.", "Den e-postadressen finns inte på listan. Använd adressen som arrangören har."],
  bad_email: ["Check the email address{d}.", "Kontrollera e-postadressen{d}."],
  too_many: ["Too many tries. Wait a little while and try again.", "För många försök. Vänta en stund och försök igen."],
  bad_code: ["That code doesn't match. Check it against your email.", "Koden stämmer inte. Jämför med ditt mejl."],
  bad_password: ["That password doesn't match.", "Fel lösenord."],
  set_password: ["Set ADMIN_PASSWORD in the Apps Script (Code.gs) and deploy a new version first.", "Ändra ADMIN_PASSWORD i Apps Script (Code.gs) och publicera en ny version först."],
  already_drawn: ["The names are already drawn. Clear the draw first to change anything.", "Namnen är redan dragna. Rensa dragningen först för att ändra."],
  too_few: ["Add at least 3 people. With 2 they'd just swap.", "Lägg till minst 3 personer. Med 2 byter de bara med varandra."],
  too_many_people: ["That's more people than this app handles (60).", "Det är fler personer än appen klarar (60)."],
  need_name: ["Every person needs a name.", "Alla behöver ett namn."],
  dup_name: ["Two people are called {d}. Add a surname or initial.", "Två personer heter {d}. Lägg till efternamn eller initial."],
  dup_email: ["Two people share {d}. Each person needs their own email.", "Två personer har {d}. Alla behöver en egen e-postadress."],
  no_app_url: ["Fill in the link to this page.", "Fyll i länken till sidan."],
  draw_failed: ["The draw failed its checks. Nothing was saved; try again.", "Dragningen klarade inte kontrollen. Inget sparades; försök igen."],
  quota: ["Gmail's daily sending limit is used up. Try again tomorrow.", "Gmails dagliga gräns för utskick är nådd. Försök igen i morgon."],
};
function errFor(j) {
  const e = ERRORS[j.error];
  if (!e) return new BiError("Something went wrong" + (j.message ? ": " + j.message : "") + ". Try again.", "Något gick fel. Försök igen.");
  const d = j.message && j.message !== j.error ? j.message : "";
  const fill = (s, pre) => s.replace("{d}", d ? (pre ? pre + d : d) : "");
  if (j.error === "bad_email") return new BiError(fill(e[0], " for "), fill(e[1], " för "));
  return new BiError(fill(e[0]), fill(e[1]));
}

async function api(action, data) {
  if (!API) throw new BiError("This page isn't connected to its backend yet (config.js).", "Sidan är inte kopplad till sin backend än (config.js).");
  let res, j;
  try {
    // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight.
    res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action }, data || {})) });
  } catch (e) { throw new BiError("Couldn't reach the server. Check your connection and try again.", "Kunde inte nå servern. Kontrollera anslutningen och försök igen."); }
  try { j = await res.json(); } catch (e) { throw new BiError("The server sent a strange reply. Is the Apps Script deployed with access for “Anyone”?", "Servern svarade konstigt. Är Apps Script publicerat för “Alla”?"); }
  if (!j.ok) throw errFor(j);
  return j;
}
function busy(btn, en, sv) { const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = bil(en, sv); return () => { btn.disabled = false; btn.innerHTML = orig; }; }

/* ---------- views ---------- */
function headerHTML() {
  const s = (admin || STATUS || {});
  const chips = [s.budget && `Budget: ${esc(s.budget)}`, s.when && esc(s.when)].filter(Boolean).map(c => `<span class="chip">${c}</span>`).join("");
  return `<header>${sceneSVG()}<span class="eyebrow">Secret Santa</span><h1>${esc(s.eventName || "Nordlander Family Secret Santa 2026")}</h1>${chips ? `<div class="meta">${chips}</div>` : ""}${lightsSVG()}</header>`;
}
const organiserLink = () => `<div class="foot"><button class="link" data-act="organiser">${bil("Organiser", "Arrangör")}</button></div>`;

function render() {
  let body;
  if (!API) body = notConfiguredHTML();
  else if (view === "organiser") body = admin ? adminHTML() : unlockHTML();
  else if (!STATUS) body = flash ? `<section class="panel">${flashHTML()}<button class="ghost" data-act="retry">${bil("Try again", "Försök igen")}</button></section>` : `<section class="panel"><p class="muted">${bi("Loading…", "Laddar…")}</p></section>`;
  else body = STATUS.status === "drawn" ? mainHTML() : waitingHTML();
  app.innerHTML = headerHTML() + body;
}

function notConfiguredHTML() {
  return `<section class="panel festive"><h2>${bi("Almost there", "Nästan klart")}</h2>
  <p>${bi("This page needs its free Google Apps Script backend. Follow the steps in README.md, then paste the Web app URL into config.js.",
          "Sidan behöver sin gratis Google Apps Script-backend. Följ stegen i README.md och klistra sedan in webbappens URL i config.js.")}</p></section>`;
}

function waitingHTML() {
  return `<section class="panel festive"><div class="waiting">${giftSVG()}<div style="display:flex;flex-direction:column;gap:10px">
  <h2>${bi("The names haven't been drawn yet", "Namnen är inte dragna än")}</h2>
  <p>${bi("Once everyone's in, the organiser will draw the names. Then come back here, enter your email, and you'll get a personal code that opens your present.",
          "När alla är med drar arrangören namnen. Kom sedan tillbaka hit, skriv in din e-post, så får du en personlig kod som öppnar ditt paket.")}</p></div></div></section>
  ${organiserLink()}`;
}

function mainHTML() {
  const codeFirst = !!urlCode;
  const ask = `<section class="panel${codeFirst ? "" : " festive"}" id="askPanel"><h2>${bi(codeFirst ? "Lost your code?" : "1. Get your code", codeFirst ? "Tappat bort koden?" : "1. Hämta din kod")}</h2>
  <p>${bi("Enter your email address and we'll send you your personal code and a link back here.", "Skriv in din e-postadress så skickar vi din personliga kod och en länk tillbaka hit.")}</p>
  <form id="askForm" style="display:flex;flex-direction:column;gap:14px">
    <label for="email">${bil("Your email", "Din e-post")}<input id="email" type="email" autocomplete="email" inputmode="email" enterkeyhint="send" autocapitalize="off" spellcheck="false" required placeholder="you@example.com"></label>
    <button class="${codeFirst ? "ghost" : "primary"} big" type="submit" id="askBtn">${bil("Email me my code", "Mejla min kod")}</button>
  </form>${flashHTML("ask")}</section>`;
  const rev = `<section class="panel${codeFirst ? " festive" : ""}" id="revealPanel"><h2>${bi(codeFirst ? "Who are you buying for?" : "2. Open your present", codeFirst ? "Vem ska du köpa till?" : "2. Öppna ditt paket")}</h2>
  <p>${bi("Enter the code from your email.", "Skriv in koden från ditt mejl.")}</p>
  <form id="revealForm" style="display:flex;flex-direction:column;gap:14px">
    <label for="code">${bil("Your code", "Din kod")}<input id="code" class="code-input" autocomplete="one-time-code" enterkeyhint="go" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" maxlength="12" required value="${esc(fmtCode(urlCode))}"></label>
    <button class="primary big" type="submit" id="revealBtn">${bil("Your Secret Santa", "Din Secret Santa")}</button>
  </form>${flashHTML("reveal")}<div id="tagOut" aria-live="polite"></div></section>`;
  return (codeFirst ? rev + ask : ask + rev) + organiserLink();
}

function unlockHTML() {
  return `<section class="panel festive"><h2>${bi("Organiser", "Arrangör")}</h2>
  <p class="muted">${bi("Enter the organiser password (the ADMIN_PASSWORD in your Apps Script).", "Ange arrangörens lösenord (ADMIN_PASSWORD i ditt Apps Script).")}</p>
  <form id="unlockForm" style="display:flex;flex-direction:column;gap:14px">
  <label for="apw">${bil("Password", "Lösenord")}<input id="apw" type="password" autocomplete="current-password" required></label>
  <div class="actions"><button class="primary" type="submit" id="unlockBtn">${bil("Unlock", "Lås upp")}</button><button class="link" type="button" data-act="back">${bil("Back", "Tillbaka")}</button></div></form>
  ${flashHTML()}</section>`;
}

function personRow(p) {
  return `<div class="person" data-row><input aria-label="Name / Namn" class="nm" placeholder="Name / Namn" value="${esc(p.name || "")}">
  <input aria-label="Email / E-post" class="em" type="email" inputmode="email" autocomplete="off" placeholder="Email / E-post" value="${esc(p.email || "")}">
  <button class="x" title="Remove / Ta bort" aria-label="Remove person" data-act="rm">×</button></div>`;
}

function adminHTML() { return admin.status === "drawn" ? adminDrawnHTML() : adminSetupHTML(); }

function adminSetupHTML() {
  const people = admin.people.length ? admin.people : [{}, {}, {}, {}];
  return `<section class="panel festive"><h2>${bi("Set up the draw", "Ställ in dragningen")}</h2>
  <p class="muted">${bi("Add every adult taking part, including yourself. The draw makes one random chain through everyone, so each person gives one present and gets one, and nobody draws the person who drew them.",
    "Lägg till alla vuxna som är med, även dig själv. Dragningen gör en slumpmässig kedja genom alla, så att var och en ger en julklapp och får en, och ingen drar den som drog dem.")}</p>
  <div class="row2"><label for="evName">${bil("Event name", "Namn")}<input id="evName" value="${esc(admin.eventName || "")}"></label>
  <label for="evBudget">Budget<input id="evBudget" placeholder="e.g. 400 kr" value="${esc(admin.budget || "")}"></label></div>
  <div class="row2"><label for="evWhen">${bil("Gift exchange", "Julklappsutdelning")}<input id="evWhen" placeholder="Christmas Eve / Julafton" value="${esc(admin.when || "")}"></label>
  <label for="evUrl">${bil("Link to this page", "Länk till sidan")}<input id="evUrl" value="${esc(admin.appUrl || PAGE_URL)}"></label></div></section>
  <section class="panel"><h2>${bi("Who's taking part", "Vilka är med")}</h2>
  <div class="people" id="people">${people.map(personRow).join("")}</div>
  <div class="actions"><button class="ghost small" data-act="addPerson">+ ${bil("Add person", "Lägg till person")}</button>
  <button class="ghost small" data-act="saveSetup" id="saveBtn">${bil("Save list", "Spara listan")}</button></div></section>
  <section class="panel"><h2>${bi("Draw the names", "Dra namnen")}</h2>
  <p class="muted">${bi("The server draws the names. Nobody, including you, sees who has whom in this app.", "Servern drar namnen. Ingen, inte ens du, ser vem som har vem i appen.")}</p>
  <label class="check"><input type="checkbox" id="notify" checked>
  ${bil("Email everyone their code right away", "Mejla allas koder direkt")}</label>
  ${flashHTML()}
  <button class="primary big" data-act="draw" id="drawBtn">${bil("Draw names and lock it in", "Dra namnen och lås")}</button>
  <div class="foot"><button class="link" data-act="lock">${bil("Lock and go back", "Lås och gå tillbaka")}</button></div></section>`;
}

function adminDrawnHTML() {
  const when = t => t ? esc(new Date(t).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })) : "";
  const checks = (admin.checks || []).map(c => `<li class="${c.ok ? "" : "bad"}">${esc(c.en)} <span class="sv-inline" lang="sv">· ${esc(c.sv)}</span></li>`).join("");
  const rows = admin.people.map(p => `<li class="sentrow"><span class="name">${esc(p.name)}</span>${p.sentAt ? `<span class="ok-t">✓ ${when(p.sentAt)}</span>` : `<span class="muted not-sent">${bil("Not sent", "Ej skickad")}</span>`}<span class="email">${esc(p.email)}</span></li>`).join("");
  return `<section class="panel festive"><h2>${bi("Names are drawn", "Namnen är dragna")}</h2>${flashHTML()}<ul class="checks">${checks}</ul>
    <p class="muted" style="font-size:14px">${bil("Drawn", "Dragen")} ${when(admin.drawnAt)}</p>
    <p>${bi("Share this link with everyone. They enter their email and get their code:", "Dela länken med alla. De skriver in sin e-post och får sin kod:")}</p>
    <div class="mailtext" style="font-size:15px">${esc(admin.appUrl)}</div></section>
  <section class="panel"><h2>${bi("Codes emailed", "Skickade koder")}</h2>
    <ul class="sentlist">${rows}</ul>
    <p class="muted" style="font-size:14px">${bi(`Gmail can still send ${admin.quota} emails today.`, `Gmail kan skicka ${admin.quota} mejl till i dag.`)}</p>
    <div class="actions"><button class="ghost small" data-act="emailAll" id="emailAllBtn">${bil("Email everyone their code", "Mejla allas koder")}</button></div></section>
  <section class="panel"><h2>${bi("Event details", "Detaljer")}</h2>
    <p class="muted">${bi("Change the name, budget or date any time. The draw and everyone's codes stay the same.", "Ändra namn, budget eller datum när som helst. Dragningen och allas koder påverkas inte.")}</p>
    <label for="dName">${bil("Event name", "Namn")}<input id="dName" value="${esc(admin.eventName || "")}"></label>
    <div class="row2"><label for="dBudget">Budget<input id="dBudget" value="${esc(admin.budget || "")}"></label>
    <label for="dWhen">${bil("Gift exchange", "Julklappsutdelning")}<input id="dWhen" value="${esc(admin.when || "")}"></label></div>
    <div class="actions"><button class="ghost small" data-act="saveDetails" id="saveDetailsBtn">${bil("Save details", "Spara detaljer")}</button></div></section>
  <section class="panel"><h2>${bi("Everyone's codes", "Allas koder")}</h2>
    <p class="muted">${bi("Names and codes. Who has whom stays hidden unless you ask for it. Careful: entering someone else's code on the page also shows their match.", "Namn och koder. Vem som har vem visas bara om du ber om det. Obs: skriver man in någon annans kod på sidan visas också vem de har.")}</p>
    ${codes ? `<ul class="sentlist">${codes.map(c => `<li class="sentrow"><span class="name">${esc(c.name)}${matches ? ` <span class="arrow-to">→ ${esc(matches[c.name] || "?")}</span>` : ""}</span><span class="codebadge">${esc(c.code)}</span></li>`).join("")}</ul>
    <div class="actions"><button class="ghost small" data-act="hideCodes">${bil("Hide codes", "Dölj koderna")}</button>
    ${matches ? `<button class="ghost small" data-act="hideMatches">${bil("Hide who has whom", "Dölj vem som har vem")}</button>`
      : `<button class="${matchArmed ? "danger" : "ghost"} small" data-act="showMatches" id="showMatchesBtn">${matchArmed ? bil("Tap again: this spoils your own match", "Tryck igen: du ser vem du själv har") : bil("Show who has whom", "Visa vem som har vem")}</button>${matchArmed ? `<button class="link" data-act="cancelMatches">${bil("Cancel", "Avbryt")}</button>` : ""}`}</div>`
    : `<div class="actions"><button class="ghost small" data-act="showCodes" id="showCodesBtn">${bil("Show codes", "Visa koderna")}</button></div>`}</section>
  <section class="panel"><h2>${bi("Start over", "Börja om")}</h2>
    <p class="muted">${bi("Clears this draw for everyone. Codes already sent stop working. The list of people is kept.", "Rensar dragningen för alla. Skickade koder slutar fungera. Listan med personer sparas.")}</p>
    <div class="actions"><button class="danger small" data-act="reset" id="resetBtn">${resetArmed ? bil("Tap again to clear", "Tryck igen för att rensa") : bil("Clear the draw", "Rensa dragningen")}</button>${resetArmed ? `<button class="link" data-act="cancelReset">${bil("Cancel", "Avbryt")}</button>` : ""}</div></section>
  <div class="foot"><button class="link" data-act="lock">${bil("Lock and go back", "Lås och gå tillbaka")}</button></div>`;
}

/* ---------- actions ---------- */
async function loadStatus() {
  flash = null; render();
  try { STATUS = await api("status"); }
  catch (e) { setFlash("err", e.message, e.sv || ""); }
  render();
}

async function doAsk(btn) {
  const email = document.getElementById("email").value.trim();
  const done = busy(btn, "Sending…", "Skickar…");
  try {
    await api("requestCode", { email });
    setFlash("ok", `Sent! Check ${email} (and the spam folder) for your code.`, `Skickat! Titta i ${email} (och skräpposten) efter din kod.`, "ask");
  } catch (e) { setFlash("err", e.message, e.sv || "", "ask"); }
  done(); rerenderKeeping();
}

async function doReveal(btn) {
  const raw = document.getElementById("code").value;
  const out = document.getElementById("tagOut");
  const done = busy(btn, "Checking…", "Kontrollerar…");
  let r;
  try { r = await api("reveal", { code: raw }); }
  catch (e) { setFlash("err", e.message, e.sv || "", "reveal"); done(); rerenderKeeping(); return; }
  if (flash) { flash = null; document.querySelectorAll("#revealPanel .msg").forEach(m => m.remove()); }
  done(); revealed = true;
  const tagHTML = () => {
    const letters = Array.from(r.to).map((ch, i) => `<span style="animation-delay:${(0.35 + i * 0.06).toFixed(2)}s">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("");
    return `<div class="tagwrap"><div class="tag"><span class="lbl">${bil("You're buying for", "Du köper till")}</span>
      <span class="who" aria-label="${esc(r.to)}">${letters}</span>${HOLLY}
      <span class="from">${bil("From", "Från")} ${esc(r.giver)}${r.budget ? ` · ${esc(r.budget)}` : ""}</span></div></div>
      <p class="after muted">${bi("Close this page when you're done. Keep it secret!", "Stäng sidan när du är klar. Håll det hemligt!")}</p>`;
  };
  if (REDUCED) { out.innerHTML = tagHTML(); return; }
  out.innerHTML = `<div class="stage">${giftSVG("shake")}<span class="hint">${bil("Shaking the present…", "Skakar på paketet…")}</span></div>`;
  try { out.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
  const box = out.querySelector(".giftbox");
  setTimeout(() => { box.classList.remove("shake"); box.classList.add("open"); const h = out.querySelector(".hint"); if (h) h.remove(); celebrate(box); }, 950);
  setTimeout(() => { out.innerHTML = tagHTML(); const t = out.querySelector(".tag"); setTimeout(() => celebrate(t), 500); }, 1550);
}

/* re-render the main view without losing what was typed */
function rerenderKeeping() {
  const e = document.getElementById("email"), c = document.getElementById("code");
  const ev = e ? e.value : "", cv = c ? c.value : "";
  render();
  const e2 = document.getElementById("email"), c2 = document.getElementById("code");
  if (e2) e2.value = ev; if (c2) c2.value = cv;
}

async function doUnlock(btn) {
  const pw = document.getElementById("apw").value;
  const done = busy(btn, "Unlocking…", "Låser upp…");
  try { admin = await api("admin.get", { password: pw }); adminPw = pw; flash = null; }
  catch (e) { admin = null; setFlash("err", e.message, e.sv || ""); }
  done(); render();
}

function readSetup() {
  const people = Array.from(document.querySelectorAll("[data-row]")).map(r => ({ name: r.querySelector(".nm").value.trim(), email: r.querySelector(".em").value.trim() }));
  const g = id => document.getElementById(id).value.trim();
  return { people, eventName: g("evName"), budget: g("evBudget"), when: g("evWhen"), appUrl: g("evUrl") };
}

async function adminCall(btn, action, data, en, sv, okMsg) {
  const done = busy(btn, en, sv);
  try {
    admin = await api(action, Object.assign({ password: adminPw }, data || {}));
    flash = okMsg ? okMsg(admin) : null;
    if (STATUS) STATUS = Object.assign(STATUS, { status: admin.status, eventName: admin.eventName, budget: admin.budget, when: admin.when });
  } catch (e) {
    setFlash("err", e.message, e.sv || "");
    if (data && data.people) admin = Object.assign({}, admin, data); // keep what was typed
  }
  done(); resetArmed = false; render();
}

app.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act; ev.preventDefault();
  if (act === "organiser") { view = "organiser"; flash = null; render(); }
  else if (act === "back" || act === "lock") { view = "main"; admin = null; adminPw = ""; codes = null; matches = null; matchArmed = false; flash = null; resetArmed = false; loadStatus(); }
  else if (act === "retry") loadStatus();
  else if (act === "addPerson") { document.getElementById("people").insertAdjacentHTML("beforeend", personRow({})); document.querySelector("#people [data-row]:last-child .nm").focus(); }
  else if (act === "rm") el.closest("[data-row]").remove();
  else if (act === "saveDetails") {
    const g = id => document.getElementById(id).value.trim();
    adminCall(el, "admin.details", { eventName: g("dName"), budget: g("dBudget"), when: g("dWhen") }, "Saving…", "Sparar…",
      () => ({ kind: "ok", en: "Details saved. The draw is unchanged.", sv: "Detaljerna är sparade. Dragningen är oförändrad.", where: "" }));
  }
  else if (act === "saveSetup") adminCall(el, "admin.save", readSetup(), "Saving…", "Sparar…", () => ({ kind: "ok", en: "List saved.", sv: "Listan är sparad.", where: "" }));
  else if (act === "draw") {
    const notify = document.getElementById("notify").checked;
    adminCall(el, "admin.draw", Object.assign(readSetup(), { notify }), "Drawing…", "Drar…",
      a => a.sent ? { kind: "ok", en: `Names drawn and ${a.sent} emails sent!`, sv: `Namnen är dragna och ${a.sent} mejl skickade!`, where: "" }
                  : { kind: "ok", en: "Names drawn! Share the link so everyone can get their code.", sv: "Namnen är dragna! Dela länken så att alla kan hämta sin kod.", where: "" });
  }
  else if (act === "emailAll") adminCall(el, "admin.emailAll", null, "Sending…", "Skickar…", a => ({ kind: "ok", en: `${a.sent} emails sent.`, sv: `${a.sent} mejl skickade.`, where: "" }));
  else if (act === "reset") { if (!resetArmed) { resetArmed = true; render(); return; } codes = null; matches = null; matchArmed = false; adminCall(el, "admin.reset", null, "Clearing…", "Rensar…", () => ({ kind: "ok", en: "Draw cleared.", sv: "Dragningen är rensad.", where: "" })); }
  else if (act === "cancelReset") { resetArmed = false; render(); }
  else if (act === "showCodes") {
    const done = busy(el, "Loading…", "Laddar…");
    api("admin.codes", { password: adminPw })
      .then(r => { codes = r.codes; flash = null; })
      .catch(e => setFlash("err", e.message, e.sv || ""))
      .then(() => { done(); render(); });
  }
  else if (act === "hideCodes") { codes = null; matches = null; matchArmed = false; render(); }
  else if (act === "cancelMatches") { matchArmed = false; render(); }
  else if (act === "hideMatches") { matches = null; matchArmed = false; render(); }
  else if (act === "showMatches") {
    if (!matchArmed) { matchArmed = true; render(); return; }
    // Look each code up exactly as the reveal page does; the backend needs no change.
    const done = busy(el, "Loading…", "Laddar…");
    Promise.all(codes.map(c => api("reveal", { code: c.code }).then(r => [c.name, r.to])))
      .then(list => { matches = Object.fromEntries(list); flash = null; })
      .catch(e => setFlash("err", e.message, e.sv || ""))
      .then(() => { done(); matchArmed = false; render(); });
  }
});
app.addEventListener("submit", ev => {
  ev.preventDefault();
  if (ev.target.id === "askForm") doAsk(document.getElementById("askBtn"));
  if (ev.target.id === "revealForm") doReveal(document.getElementById("revealBtn"));
  if (ev.target.id === "unlockForm") doUnlock(document.getElementById("unlockBtn"));
});
app.addEventListener("input", ev => {
  if (ev.target.id === "code") { const v = fmtCode(ev.target.value); if (v !== ev.target.value) ev.target.value = v; }
});

startSnow();
render();
if (API) loadStatus();

})();
