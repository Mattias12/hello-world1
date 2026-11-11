# 🎁 Nordlander Family Secret Santa 2026

A small, free Secret Santa app. Everyone enters their email address, gets an
email with a personal code and a link, then opens the page and sees who
they're buying for.

- **Front end:** static files hosted for free on **GitHub Pages**
  (`index.html`, `style.css`, `art.js`, `app.js`, `music.js`, `config.js`).
- **Back end:** one **Google Apps Script** file (`apps-script/Code.gs`).
  It's free, it stores the list and the draw, and it sends the emails
  **from your own Gmail** (up to about 100 a day on a normal Gmail account).

No paid services, no servers to run, no API keys.

## How it works

1. You (the organiser) open the page, click **Organiser**, enter your password,
   add everyone's name and email, and click **Draw names**. The draw is one
   random chain through everyone, so nobody gets themselves and no two
   people swap with each other.
2. Tick **Email everyone their code right away**, or just share the link and
   let people ask for their own code.
3. Each person enters their email and clicks **Email me my code**. They get an
   email with their code and a link back to the page with the code filled in.
4. They click **Your Secret Santa**, and the gift opens to show their match.

The app never shows who has whom, so you can play too. The draw is stored in
your Apps Script's *Script Properties*. Don't look there!

## Setup (about 10 minutes, one time)

### 1. Create the backend (Google Apps Script)

1. Go to <https://script.google.com> and sign in with the Gmail account the
   emails should come from. Click **New project** and name it "Secret Santa".
2. Delete what's in `Code.gs` and paste in the contents of
   [`apps-script/Code.gs`](apps-script/Code.gs).
3. At the top, change `ADMIN_PASSWORD` from `'change-me-please'` to your own
   password. Click **Save**.
4. Pick `testSetup` in the function menu above the code and click **Run**.
   Google asks for permission to send email as you. Click through it. You may
   see *"Google hasn't verified this app"*: click **Advanced → Go to Secret
   Santa (unsafe)**. That's expected, because it's your own script.
5. Click **Deploy → New deployment**. Under the gear icon pick **Web app**, then set:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**

   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

### 2. Connect the front end

Open [`config.js`](config.js) (you can edit it on github.com with the ✏️ button)
and paste the URL between the quotes:

```js
window.SECRET_SANTA_API = "https://script.google.com/macros/s/AKfy…/exec";
```

### 3. Turn on GitHub Pages

In the repository on GitHub, go to **Settings → Pages**. Under *Source*, pick
**Deploy from a branch**, branch **master**, folder **/ (root)**, then **Save**.
After a minute the site is live at
`https://<your-username>.github.io/<repo-name>/`.

> GitHub Pages is free for **public** repositories. A private repo needs a
> paid plan for Pages. That's fine to make public, since nothing secret lives in
> the repo: the password and the draw are only in your Apps Script.

### 4. Run the draw

Open the site, click **Organiser**, and enter your password. Add everyone,
check that **Link to this page** is the GitHub Pages address, and click **Draw
names and lock it in**.

## Changing the backend later

If you edit `Code.gs` in Apps Script, use **Deploy → Manage deployments → ✏️ →
Version: New version → Deploy**. That keeps the same URL, so `config.js` doesn't
need to change.

## Notes

- Emails can land in spam the first time. Tell people to check there.
- One email address can ask for its code up to 3 times in 6 hours.
- **Clear the draw** (Organiser page) starts over. Old codes stop working, and
  the list of people is kept.
- **Music:** a music-box "Jingle Bells" (public domain), played by the browser itself
  (`music.js`, no audio files). Browsers only allow sound after a tap, so it starts on
  the visitor's first tap. The round 🎵 button in the corner turns it on or off, and the
  page remembers that choice.
- The page is built for phones first. Every screen was checked at 320px and 375px widths.

## Backup page (if GitHub Pages is down)

Your Apps Script Web app URL (the one in `config.js`) also serves a full copy of the page when opened in a browser:

- `…/exec` is the main page (get a code, open your present)
- `…/exec?code=XXXX-XXXX` opens with the code filled in
- `…/exec?organiser` opens the organiser page

Google shows a small "created by a Google Apps Script user" banner above it. Code emails still link to the
GitHub Pages address saved as **Link to this page**.

Every function in `apps-script/Code.gs` except `doGet`, `doPost`, `apiCall` and `testSetup` ends in `_`.
That keeps them private: the page can't call them directly, only through the password checks in `route_`.
After changing any front-end file, run `node tools/build-backup.js` to rebuild the copy inside `Code.gs`.
