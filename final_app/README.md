# Novazova — Working Account App (Fixed)

## What was actually wrong
The signup form and the server code were both correct. The problem was **how the app
was being opened**. `fetch('/api/register')` only works when the page is loaded from
the Node server itself (`http://localhost:3000`). If `index.html` is opened by
double-clicking it, or through a different local server (like VS Code's "Live Server"
on port 5500), the request goes to the wrong place (or nowhere) and nothing ever
reaches the server — so nothing gets saved. No error was obviously visible, it just
silently failed.

**Fix applied:** `script.js` and `admin.html` now detect what origin the page was
loaded from. If it isn't port 3000, they automatically send API requests to
`http://localhost:3000` instead (with CORS enabled on the server side). As long as
the Node server is running somewhere, signups will reach it regardless of how you
opened the page.

## How to run it (Windows)
1. Install Node.js LTS from https://nodejs.org/ if you don't have it.
2. Double-click `START_APP.bat`.
3. It opens your browser at `http://localhost:3000` automatically. **Always use this
   URL** — don't open `index.html` directly.
4. Sign up through the form. The new user is written immediately to `data/users.csv`.
5. Open `http://localhost:3000/admin` to see a live table of everyone who has signed
   up — it polls the server and refreshes automatically every 5 seconds. Your
   browser will prompt for a **username and password** (see below).
6. On that admin page, click **Download CSV** to get `novazova_users.csv`, which
   opens directly in Excel.

## Email verification (OTP)
Signup and password reset now require a 6-digit code sent to the user's email —
there's no phone number field anymore, the whole app runs on email.

**Important: sends via Brevo, not Gmail SMTP.** Render's free tier blocks the
network ports regular email (SMTP) needs, so Gmail-based sending doesn't work
here. Brevo sends over regular HTTPS instead, which isn't blocked, and its free
tier covers 300 emails/day — plenty for a project like this.

**To make this actually send real emails, set these environment variables in
Render's Environment tab:**
- `BREVO_API_KEY` — your Brevo API key
- `BREVO_SENDER_EMAIL` — the email address you verified as your sender in Brevo

**How to set up Brevo (free, ~5 minutes):**
1. Go to brevo.com and create a free account
2. In Brevo, go to Settings → Senders & IP → add and verify a sender email
   (they'll email that address a confirmation link)
3. Go to Settings → API Keys → generate a new API key, copy it
4. Add `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` as environment variables on Render

**If you don't set these up (e.g. testing locally without setup):** the app
still works — it just prints the OTP code to the server console/logs instead of
emailing it, so you can test the whole flow without a Brevo account. Look for a
line like `[DEV MODE - no email credentials set] OTP for x@y.com: 123456` in the
terminal or Render's Logs tab.

## Admin login
The `/admin` page, the users API, and the CSV download are password-protected.

- Default username: `admin`
- Default password: `Nova03Zova24`

**Change this before deploying anywhere public.** Two ways:
- Edit the defaults directly in `server.js` (look for `ADMIN_USER` and
  `ADMIN_PASSWORD` near the top).
- Or, better for a deployed app: set `ADMIN_USER` and `ADMIN_PASSWORD` as
  environment variables on your host (e.g. in Render's dashboard under
  Environment). This keeps the password out of your code entirely, so it's safe
  even if your GitHub repo is public.

## How to run it (Mac/Linux)
```
npm start
```
then open `http://localhost:3000`.

## Data
- `data/users.csv` — id, name, email, age, created_at. This is your
  "spreadsheet" — open it directly in Excel/Google Sheets any time, or use the
  Download CSV button on `/admin`.
- `data/auth.json` — password hashes only (scrypt), kept separate from the CSV on
  purpose so passwords are never in the spreadsheet.

## Important
Don't publish `data/users.csv` or `data/auth.json` as public web files. This is a
demo/college-project server, not hardened for production — for that you'd want a
real database and authenticated admin access.
