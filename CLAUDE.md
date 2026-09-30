# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Artisbay Lite Inc. — a web platform for a Japanese used-vehicle export company. Customers browse stock, get shipping estimates, and enquire about vehicles. It also has a Capacitor-wrapped Android app and a PHP backend.

- **Frontend**: Next.js 15 (Pages Router), statically exported (`output: 'export'` in `next.config.mjs`) — there is no Node server in production, so nothing in `pages/` can rely on `getServerSideProps`, API routes, or server-only runtime behavior. Data comes from `fetch()` calls to the PHP backend at build/runtime.
- **Backend**: plain PHP under `server/` (mysqli, no framework), deployed as static files alongside the exported site.
- **Styling**: Tailwind CSS plus a large body of hand-written CSS under `styles/custom/**` (one subfolder per area: `admin`, `agents`, `forms`, `help`, `layout`, `pages`, `user`, `vehicle`, etc.), all imported globally from `pages/_app.js`.
- **Mobile**: Capacitor wraps the exported `out/` build for Android (`capacitor.config.ts`, `android/`).

## Commands

```bash
npm run dev          # next dev on :3000, API calls hit NEXT_PUBLIC_DEV_API (default http://localhost/artisbay-inc/server)
npm run dev:xampp    # same, pointed at a local XAMPP PHP server
npm run dev:php      # same, pointed at `php -S localhost:8080`
npm run dev:full     # starts `php -S localhost:8080` AND next dev together
npm run build        # next build (static export, output goes to out/ per next.config.mjs)
npm run lint         # next lint (NOTE: next.config.mjs sets eslint.ignoreDuringBuilds: true, so lint is NOT enforced by `build`)
```

There is no test suite in this repo.

Package manager: this repo has both `package-lock.json` (npm) and a newer `pnpm-lock.yaml` / `pnpm-workspace.yaml` — check which one is current before installing, and don't mix lockfiles in one change.

### Mobile build

```bash
npm run build
npx cap sync android
# then open android/ in Android Studio
```

## Architecture

### API base resolution

All frontend HTTP calls go through `components/utilities/apiBase.js`, which picks the backend base URL at runtime:
- Capacitor native shell → hardcoded `https://artisbay.com/eljawad-motors/server`
- Next dev mode → `NEXT_PUBLIC_DEV_API` (or its localhost default)
- Static production export → relative `/server`

It exports namespaced bases (`apiAuth`, `apiUsers`, `apiInventory`, `apiFinance`, `api`, `apiBaseUrl`) — use these instead of hardcoding `/server/...` paths.

### PHP backend layout (`server/`)

Organized by domain, not by HTTP verb: `auth/`, `users/`, `customers/`, `inventory/{cars,tires}/`, `finance/{deposits,invoices}/`, `orders/`, `reservations/`, `inquiries/`, `emails/`. Shared pieces live in `server/core/`:
- `db_connection.php` — mysqli connection (`$conn`), included by every endpoint.
- `headers.php` — CORS + JSON headers; validates request `Origin` against an allowlist (localhost:3000, artisbay.com, aurora-lumen.com, eljawad.com, aminedev24.github.io) and handles `OPTIONS` preflight.
- `csrf.php` — CSRF token issuance/validation. The frontend flow: `check_session.php` returns a `csrf` token which `userContext.js` stores via `setCsrfToken`; all non-GET requests must send it back as `X-CSRF-Token`.
- `db_migrations.php` — `ensure_columns()` helper for additive, idempotent schema migrations that work across MySQL/MariaDB versions lacking `ADD COLUMN IF NOT EXISTS` (checks `information_schema` instead). Prefer this over raw `ALTER TABLE` when adding columns.
- `mail_secrets.php` — gitignored real credentials; `mail_secrets.example.php` is the template. Never commit the real file.

Auth is cookie/session based (PHP session + CSRF token), not JWT — `credentials: 'include'` is required on every fetch.

### Admin panel

`pages/admin.js` is a self-contained SPA-style shell (`AdminPage.getLayout = (page) => page` skips the public site's `Layout`). It gates on `useUser()` (`user.role === 'admin'`) client-side, and switches between tab components (`components/admin/*.jsx`) via a `?tab=` query param rather than separate routes. Admin API calls go through `components/admin/adminApi.js`'s `adminApiFetch()`, which maps short endpoint keys (e.g. `'finance/invoices/sendInvoice.php'`) to full URLs — add new backend endpoints to its `ENDPOINT_MAP` rather than building URLs inline.

### Help / content pages

`pages/help/artisbayInc/[topic].js` is a single dynamic route that renders many different informational pages (`components/help/*.js`) driven by a `topics` data table (`slug → component name`) plus a `topicComponents` lookup. `getStaticPaths` enumerates every valid slug (`fallback: false`) since the site is statically exported — adding a new help topic means adding it to both the `topics` object and the `allTopics` array in `getStaticPaths`.

### Vehicle/stock data

Stock is merged client-side from multiple sources (Artisbay Lite's own inventory plus partner stock) in `components/dataFetch/fetchStock.js` and filtered/sorted in `components/misc/stockList.js` / `stockListV2.js`. Price fields fall back through `fob ?? final_value ?? price`, and "latest arrivals" sorting falls back to model year when `ship_date` is missing (partner cars often lack one) — keep that fallback chain when touching pricing or sorting logic.

### Forms

Larger forms (`invoiceForm`, `addCarsForm`, `usedTiresForm`, `cuttingCalculator`, `accountancyForm2`, `storeStock`) follow a consistent split: the page-level component in `components/forms/`, a `use<Thing>FormState.js` hook owning form state/submission, and separate `constants.js`/`sections.js`/`helpers.js` files for static config and field groups. Follow this split when extending an existing form rather than inlining new state into the top-level component.

### PDF generation

Invoices, sales agreements, and other documents are rendered with `@react-pdf/renderer` (`components/sales/*Pdf.js`, `pdfFonts.js`), separate from the HTML preview components (`*Preview.js`) that mirror the same layout for on-screen display — when changing a document's layout, both the PDF and preview versions usually need the matching edit.
