![RolePilot — A home for every opportunity](assets/rolepilot-cover.png)

# RolePilot

A focused workspace for your next career move. Track job applications, see approaching deadlines, record follow-ups, and keep a complete export of your data.

**Built by Jason Edwards** · React · TypeScript · Vite · Firebase (optional)

## Start the included app immediately

The ZIP includes a prebuilt `dist/` folder. On Linux or macOS, with Python 3 installed:

```bash
cd rolepilot
bash start.sh
```

Open **http://127.0.0.1:4173** and choose **Use this browser**. No API key, account, Node installation, or paid plan is needed for local mode. Keep the terminal running. Press Ctrl+C to stop it. Use `bash start.sh 8085` if that port is occupied.

On Windows, run `start.bat`, or use:

```bash
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Serve the app over HTTP; do not double-click `dist/index.html`. Browser data belongs to the current origin, so keep using the same hostname and port. `localhost` and `127.0.0.1` have separate browser storage.

## Develop from source

Install Node.js 22.13 or newer and npm. Then:

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. Build a fresh production copy with:

```bash
npm test
npm run build
npm run preview
```

`npm run build` replaces `dist/`. The 18 regression tests cover date rules, URL comparison, duplicates, CSV round trips, formula escaping, history restoration, stale edits, and browser persistence.

## Features

- Searchable, sortable application table on desktop and cards on mobile.
- Saved, Applied, Assessment, Interview, Offer, Rejected, and Withdrawn statuses.
- Overview counts, a reminder view, and an activity timeline.
- Optional posting URL, salary range, location, dates, and multiline notes.
- Adjustable 0–30 day warning window; the default is 3 days.
- Due-today, overdue, and approaching reminders based on the local calendar date.
- Quick follow-up completion with optional scheduling of the next reminder.
- Duplicate warnings based on posting URLs and company/title similarity.
- CSV import review, explicit conflict choices, export, and activity-history recovery.
- Revision checks to prevent an old editor from overwriting a newer change.
- No preloaded applications, invented details, or automatically assigned application dates.

Reminders are displayed inside the app; they do not send email, browser push notifications, or background alerts. Application deadlines appear for Saved entries. Follow-up reminders remain active through Offer and are suppressed for Rejected and Withdrawn entries without deleting their dates.

## Storage modes

### Browser-only

Choose **Use this browser** on the opening screen. Data is stored in this browser’s local storage and survives refreshes. It does not sync to another device, browser profile, hostname, or port. Anyone using the same browser profile can open this workspace. Export a CSV before clearing browser data or moving devices. Local mode is an explicit choice, never a fallback for a cloud error.

### Google sign-in and Firebase sync

Use your own Firebase project:

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and register a web app.
2. Enable **Google** under Firebase Authentication’s sign-in providers.
3. Add the hostname where you run the app to Authentication’s authorized domains. Include the local hostname you use during development.
4. Create a Cloud Firestore database.
5. Copy the included `firestore.rules` into Firestore’s Rules editor and publish them. Each authenticated user is restricted to their own `/users/{uid}/applications/` and settings paths.
6. In the app, choose **Connect Google & cloud sync** and paste the web configuration as JSON. Alternatively, copy `.env.example` to `.env.local`, fill in its four values, and restart the development server or rebuild.
7. Click **Continue with Google**.

Saving a web config does not enable authentication, authorize domains, create the database, or deploy security rules. These are separate Firebase setup steps. The app includes Google authentication, Firestore transactions, real-time listeners, and explicit cloud errors. It does not silently save cloud failures locally.

Web config values identify your Firebase project and are shipped to the browser. Never put a service-account private key into the app or repository. `.env.local` is ignored by Git. The security rules protect the records; hiding the web config does not replace them.

To move browser-only records to your cloud workspace, export them, connect/sign in, and import the CSV. The app does not silently combine workspaces.

Cloud integration is included and builds successfully. A live Google/Firebase account was not configured or exercised for this delivery. Test it in your project with two accounts before sharing: each account must see only its own records and must be denied access to the other account’s document path.

Official implementation references: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), and [Firestore access rules](https://firebase.google.com/docs/firestore/security/rules-conditions).

## CSV backups

The columns are:

```text
id,company,jobTitle,status,postingUrl,salaryRange,location,applicationDate,deadline,followUpDate,notes,activityHistory,csvEncoding
```

- Only company and jobTitle are needed for an external CSV; missing status defaults to Saved.
- Dates use `YYYY-MM-DD`. Blank dates stay blank.
- `activityHistory` is one properly quoted JSON array. Events retain stable IDs.
- `csvEncoding=acc-v1` marks this app’s reversible spreadsheet-formula protection. Potential formula text, tab/return prefixes, and leading apostrophes are prefixed with an apostrophe on export and decoded only for a marked app backup.
- A matching record ID defaults to Skip. Choose **Update existing** explicitly to restore fields and preserve the union of history. Choose **Save as new copy** for a separate entry.
- Importing the same event ID twice never duplicates it. Conflicting content under the same event ID is rejected for review.
- Invalid rows remain visible with explanations. Imports are limited to 500 rows and 5 MB per file. If some rows fail, successful rows are marked and can be left alone while you review the failures.
- Export includes all applications, regardless of the active search/filter.

## Add it to GitHub

Run these commands from the extracted source directory after signing in to GitHub CLI. `--public` creates a public repository; change it to `--private` if preferred.

```bash
git init
git add .
git commit -m "Initial release of RolePilot"
git branch -M main
gh repo create rolepilot --public --source=. --remote=origin --push
```

The included `.gitignore` excludes dependencies, build output, environment files, and local test output. A GitHub Actions workflow runs tests and builds on pushes and pull requests. It does not publish your site automatically.

## Hosting

Build with `npm ci && npm run build`, then publish `dist/` to a static host. The Vite configuration uses relative asset paths, which also support a repository subdirectory on GitHub Pages. With Firebase, authorize the deployed hostname and deploy the included rules. A public frontend still requires each visitor to sign in to view their own cloud records.

For Firebase Hosting, `firebase.json` is included. After installing Firebase CLI and selecting your own project:

```bash
firebase login
firebase use --add
npm run build
firebase deploy --only firestore:rules,hosting
```

The separately hosted ChatGPT preview uses its own account authentication and database. This downloadable project is independent: it contains no ChatGPT hosting credentials or project identity. Export/import CSV to move records between the two.

## Project structure

```text
src/App.tsx                  Workspace choice and Firebase setup
src/components/Tracker.tsx   Dashboard, forms, reminders, and import review
src/lib/domain.ts            Validation, dates, duplicates, and history
src/lib/client-store.ts      Browser storage and shared mutation rules
src/lib/firebase-store.ts    Google sign-in and Firestore adapter
src/lib/csv.ts               CSV import/export and reversible escaping
src/styles.css              Responsive visual design
firestore.rules             Per-user database permissions and validation
tests/                      Regression tests
.github/workflows/checks.yml Automated test and production-build checks
```

## Quick acceptance check

Add an application with only company and role. Refresh; it should still be there, with the application date blank. Add the same company/role again; review the warning. Set a follow-up to today, mark it complete, and check Activity. Export a CSV, re-import it, and confirm an existing ID is skipped unless you explicitly update it. Test the same flow in your Firebase workspace once configured.
