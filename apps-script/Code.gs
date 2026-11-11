/**
 * Family Secret Santa — backend (Google Apps Script, free).
 *
 * Stores the participant list and the draw, and sends each person their
 * personal code from YOUR Gmail account. Deploy it as a Web app
 * (Execute as: Me, Who has access: Anyone) — see README.md.
 */

// ⬇⬇⬇  CHANGE THIS before deploying. You type it in the app's "Organiser" page.
const ADMIN_PASSWORD = 'change-me-please';
// Shown as the sender name on the emails.
const FROM_NAME = 'Secret Santa';
// How many times one email address can ask for its code within 6 hours.
const MAX_SENDS_PER_EMAIL = 3;

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const STATE_KEY = 'state';

/* ---------------- entry points ---------------- */

function doGet() {
  return out({ ok: true, service: 'secret-santa' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return out({ ok: false, error: 'bad_request' }); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    return out(route(req));
  } catch (err) {
    return out({ ok: false, error: err.code || 'server_error', message: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/** Run this once from the editor to grant the Gmail permission and check things work. */
function testSetup() {
  MailApp.getRemainingDailyQuota();
  Logger.log('OK. Emails you can still send today: ' + MailApp.getRemainingDailyQuota());
}

function route(req) {
  switch (req.action) {
    case 'status':      return publicStatus();
    case 'requestCode': return requestCode(req.email);
    case 'reveal':      return reveal(req.code);
    case 'admin.get':   adminCheck(req.password); return adminView();
    case 'admin.save':  adminCheck(req.password); return adminSave(req);
    case 'admin.draw':  adminCheck(req.password); return adminDraw(req);
    case 'admin.emailAll': adminCheck(req.password); return adminEmailAll(req);
    case 'admin.reset': adminCheck(req.password); return adminReset();
    case 'admin.codes': adminCheck(req.password); return adminCodes();
    default: throw fail('bad_request');
  }
}

/* ---------------- public actions ---------------- */

function publicStatus() {
  const s = load();
  return { ok: true, status: s.status, eventName: s.eventName, budget: s.budget, when: s.when, count: s.people.length };
}

function requestCode(email) {
  const s = load();
  if (s.status !== 'drawn') throw fail('not_drawn');
  const em = normEmail(email);
  if (!em) throw fail('bad_email');
  const p = s.people.find(x => normEmail(x.email) === em);
  if (!p) throw fail('not_found');
  const cache = CacheService.getScriptCache(), key = 'sent:' + em;
  const n = Number(cache.get(key) || 0);
  if (n >= MAX_SENDS_PER_EMAIL) throw fail('too_many');
  sendCodeEmail(s, p);
  cache.put(key, String(n + 1), 6 * 3600);
  p.sentAt = new Date().toISOString();
  save(s);
  return { ok: true };
}

function reveal(code) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('revealFails') || 0);
  if (fails >= 60) throw fail('too_many');
  const s = load();
  if (s.status !== 'drawn') throw fail('not_drawn');
  const c = normCode(code);
  const p = c && s.people.find(x => normCode(x.code) === c);
  if (!p) { cache.put('revealFails', String(fails + 1), 600); throw fail('bad_code'); }
  const to = s.people.find(x => x.id === s.pairs[p.id]);
  return { ok: true, giver: p.name, to: to.name, budget: s.budget, when: s.when };
}

/* ---------------- organiser actions ---------------- */

function adminCheck(pw) {
  if (ADMIN_PASSWORD === 'change-me-please') throw fail('set_password');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('adminFails') || 0);
  if (fails >= 10) throw fail('too_many');
  if (String(pw || '') !== ADMIN_PASSWORD) { cache.put('adminFails', String(fails + 1), 900); throw fail('bad_password'); }
}

function adminView(extra) {
  const s = load();
  const v = {
    ok: true, status: s.status, eventName: s.eventName, budget: s.budget, when: s.when, appUrl: s.appUrl,
    drawnAt: s.drawnAt || null, checks: s.checks || null, quota: MailApp.getRemainingDailyQuota(),
    // Never send codes or who-has-whom to the browser: the organiser is playing too.
    people: s.people.map(p => ({ name: p.name, email: p.email, sentAt: p.sentAt || null }))
  };
  return Object.assign(v, extra || {});
}

function adminSave(req) {
  const s = load();
  if (s.status === 'drawn') throw fail('already_drawn');
  applySettings(s, req);
  const people = cleanPeople(req.people || []);
  s.people = people.map(p => ({ id: uid(), name: p.name, email: p.email }));
  save(s);
  return adminView();
}

function adminDraw(req) {
  const s = load();
  if (s.status === 'drawn') throw fail('already_drawn');
  applySettings(s, req);
  if (req.people) s.people = cleanPeople(req.people).map(p => ({ id: uid(), name: p.name, email: p.email }));
  cleanPeople(s.people); // validates
  if (!s.appUrl) throw fail('no_app_url');

  const ids = s.people.map(p => p.id);
  let pairs, v, tries = 0;
  do { pairs = drawLoop(ids); v = verify(ids, pairs); } while (!v.ok && ++tries < 20);
  if (!v.ok) throw fail('draw_failed');

  const used = {};
  s.people.forEach(p => { let c; do { c = makeCode(); } while (used[c]); used[c] = 1; p.code = c; delete p.sentAt; });
  s.pairs = pairs;
  s.checks = v.checks;
  s.status = 'drawn';
  s.drawnAt = new Date().toISOString();
  save(s);

  let sent = 0;
  if (req.notify) sent = emailAll(s);
  return adminView({ sent: sent });
}

function adminEmailAll() {
  const s = load();
  if (s.status !== 'drawn') throw fail('not_drawn');
  return adminView({ sent: emailAll(s) });
}

/** Names and codes only, for re-sending a code by hand. Never includes who has whom. */
function adminCodes() {
  const s = load();
  if (s.status !== 'drawn') throw fail('not_drawn');
  return { ok: true, codes: s.people.map(p => ({ name: p.name, code: p.code })) };
}

function adminReset() {
  const s = load();
  s.status = 'setup';
  s.people = s.people.map(p => ({ id: p.id, name: p.name, email: p.email }));
  delete s.pairs; delete s.checks; delete s.drawnAt;
  save(s);
  return adminView();
}

/* ---------------- email ---------------- */

function emailAll(s) {
  if (MailApp.getRemainingDailyQuota() < s.people.length) throw fail('quota');
  s.people.forEach(p => { sendCodeEmail(s, p); p.sentAt = new Date().toISOString(); });
  save(s);
  return s.people.length;
}

function sendCodeEmail(s, p) {
  const ev = s.eventName || 'Secret Santa';
  const link = s.appUrl + (s.appUrl.indexOf('?') >= 0 ? '&' : '?') + 'code=' + encodeURIComponent(p.code);
  const extra = [];
  if (s.budget) extra.push('Budget: ' + s.budget);
  if (s.when) extra.push('Gift exchange / Julklappsutdelning: ' + s.when);

  const text = [
    'Hi ' + p.name + '! / Hej ' + p.name + '!', '',
    'The names for ' + ev + ' have been drawn!', 'Namnen till ' + ev + ' är dragna!', '',
    'Your code / Din kod: ' + p.code, '',
    'Open this link to reveal who you are buying for:', 'Öppna länken för att se vem du ska köpa till:',
    link, '',
    'Keep it secret! / Håll det hemligt!'
  ].concat(extra.length ? [''].concat(extra) : []).concat(['', 'God Jul! Merry Christmas!']).join('\n');

  const h = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#0F2C24;color:#FBF7EE;border-radius:16px;text-align:center">' +
    '<div style="color:#F2C14E;letter-spacing:.14em;text-transform:uppercase;font-size:13px;font-weight:bold">Secret Santa</div>' +
    '<h1 style="margin:6px 0 14px;font-size:26px">' + h(ev) + '</h1>' +
    '<p style="margin:0 0 4px">Hi ' + h(p.name) + '! The names have been drawn.</p>' +
    '<p style="margin:0 0 18px;color:#BCD0C3;font-style:italic">Hej ' + h(p.name) + '! Namnen är dragna.</p>' +
    '<div style="font-size:13px;color:#BCD0C3">Your code · Din kod</div>' +
    '<div style="font-family:Menlo,Consolas,monospace;font-size:28px;letter-spacing:.16em;color:#F2C14E;margin:4px 0 20px">' + h(p.code) + '</div>' +
    '<a href="' + h(link) + '" style="display:inline-block;background:#D7263D;color:#FBF7EE;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px">Your Secret Santa · Din Secret Santa</a>' +
    (extra.length ? '<p style="margin:20px 0 0;color:#BCD0C3;font-size:14px">' + extra.map(h).join('<br>') + '</p>' : '') +
    '<p style="margin:20px 0 0">Keep it secret! · Håll det hemligt!<br>God Jul! 🎄</p></div>';

  MailApp.sendEmail({ to: p.email, subject: 'Your Secret Santa code / Din Secret Santa-kod', body: text, htmlBody: html, name: FROM_NAME });
}

/* ---------------- the draw: one shuffled loop ---------------- */

function drawLoop(ids) {
  const order = shuffle(ids), pairs = {};
  for (let i = 0; i < order.length; i++) pairs[order[i]] = order[(i + 1) % order.length];
  return pairs;
}

function verify(ids, pairs) {
  const n = ids.length, givers = Object.keys(pairs), recv = givers.map(g => pairs[g]), set = {};
  ids.forEach(i => set[i] = 1);
  const checks = [];
  const add = (ok, en, sv) => checks.push({ ok: !!ok, en: en, sv: sv });
  const uniq = a => a.filter((x, i) => a.indexOf(x) === i).length === a.length;
  add(n >= 3, n + ' people taking part (minimum 3)', n + ' personer är med (minst 3)');
  add(givers.length === n && givers.every(g => set[g]) && uniq(givers), 'Everyone gives exactly one gift', 'Alla ger exakt en julklapp');
  add(recv.length === n && recv.every(r => set[r]) && uniq(recv), 'Everyone receives exactly one gift', 'Alla får exakt en julklapp');
  add(givers.every(g => pairs[g] !== g), 'Nobody draws themselves', 'Ingen drar sig själv');
  add(givers.every(g => pairs[pairs[g]] !== g), 'No two people draw each other', 'Ingen drar varandra');
  let cur = ids[0]; const seen = {}; let k = 0;
  while (k < n && !seen[cur]) { seen[cur] = 1; cur = pairs[cur]; k++; }
  add(Object.keys(seen).length === n && cur === ids[0], 'One single chain through all ' + n + ' people', 'En enda kedja genom alla ' + n);
  return { ok: checks.every(c => c.ok), checks: checks };
}

/* ---------------- helpers ---------------- */

function load() {
  const raw = PropertiesService.getScriptProperties().getProperty(STATE_KEY);
  const s = raw ? JSON.parse(raw) : {};
  s.status = s.status || 'setup';
  s.people = s.people || [];
  s.eventName = s.eventName || 'Nordlander Family Secret Santa ' + new Date().getFullYear();
  s.budget = s.budget || '';
  s.when = s.when || '';
  s.appUrl = s.appUrl || '';
  return s;
}

function save(s) {
  PropertiesService.getScriptProperties().setProperty(STATE_KEY, JSON.stringify(s));
}

function applySettings(s, req) {
  ['eventName', 'budget', 'when', 'appUrl'].forEach(k => {
    if (typeof req[k] === 'string') s[k] = req[k].trim().slice(0, 300);
  });
  if (s.appUrl && !/^https?:\/\//i.test(s.appUrl)) throw fail('no_app_url');
}

function cleanPeople(list) {
  const people = list.map(p => ({ name: String(p.name || '').trim().slice(0, 80), email: String(p.email || '').trim().slice(0, 200) }))
    .filter(p => p.name || p.email);
  if (people.length < 3) throw fail('too_few');
  if (people.length > 60) throw fail('too_many_people');
  const names = {}, emails = {};
  people.forEach(p => {
    if (!p.name) throw fail('need_name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw fail('bad_email', p.name);
    const n = p.name.toLowerCase(), e = normEmail(p.email);
    if (names[n]) throw fail('dup_name', p.name);
    if (emails[e]) throw fail('dup_email', p.email);
    names[n] = emails[e] = 1;
  });
  return people;
}

function randBytes(n) {
  let hex = '';
  while (hex.length < n * 2) {
    // A v4 UUID is random except the version (index 12) and variant (index 16) digits; skip those.
    const u = Utilities.getUuid().replace(/-/g, '');
    hex += u.slice(0, 12) + u.slice(13, 16) + u.slice(17);
  }
  const out = [];
  for (let i = 0; i < n; i++) out.push(parseInt(hex.substr(i * 2, 2), 16));
  return out;
}
function randInt(n) {
  const lim = Math.floor(65536 / n) * n;
  for (;;) { const b = randBytes(2), v = b[0] * 256 + b[1]; if (v < lim) return v % n; }
}
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function makeCode() {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHA[randInt(ALPHA.length)];
  return s.slice(0, 4) + '-' + s.slice(4);
}
function uid() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function normCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function normEmail(s) { return String(s || '').trim().toLowerCase(); }
function fail(code, detail) { const e = new Error(code); e.code = code; if (detail) e.message = detail; return e; }
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
