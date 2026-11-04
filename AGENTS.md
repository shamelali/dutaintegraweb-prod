# Repository notes

Marketing site + lead-capture API for dutaintegra.my. Node >= 22, ES modules,
**zero runtime dependencies** — keep it that way unless there is a strong reason.

## Layout

| Path | What it is |
|---|---|
| `Web/` | Static HTML. `vercel.json` sets `outputDirectory: "Web"`, so this is what deploys. |
| `Web/assets/index-*.js` | The **built React bundle**, produced by `web-new/`. `Web/index.html` is a Vite build artifact, not hand-written. **Do not edit by hand — regenerate with `npm run build:web`.** |
| `server/` | The Node server: `handler.mjs` (routing + most endpoints), `portal.mjs` (client auth), `enquiries.mjs` (storage), `stats.mjs`, `digest.mjs`, `autonomous-ops.mjs`, `payments.mjs` (DutaOS HitPay/Billplz checkout + webhooks). Every `*-cloudflare.mjs` is a **parallel fork** of its namesake for Cloudflare Pages — which is what production deploys (see "The thing that trips people up") |
| `api/gateway.js` | Vercel serverless entrypoint. Just re-exports `handle` from `server/handler.mjs`. |
| `api/audit.js` | Separate self-contained audit tool, wired to its own rewrites |
| `vercel.json` | Deployment + the security headers production actually enforces |
| `web-new/` | React 19 + Vite + Tailwind 4 source, 7 routes. This **is** the canonical frontend; `npm run build:web` builds it into both `Web/` and `public/`. |
| `scripts/sync-web.mjs` | Copies `web-new/dist` into both `Web/` and `public/`, replacing only `index.html`, `assets/index-*.{js,css}`, and root public files. Leaves the standalone static pages alone. |

## Frontend: `web-new/` is canonical

**Resolved: React (`web-new/`) wins.** The other `Web/*.html` pages are
standalone static pages (tools, legal, landing pages) that are still served
directly and are *not* part of the React app. `Web/index.html` and
`Web/assets/index-*` are generated — never edit them directly.

`npm run build:web` runs `npm --prefix web-new ci && npm --prefix web-new run
build && node scripts/sync-web.mjs`, and `vercel.json` sets
`buildCommand: "npm run build:web"`. So Vercel now builds React from source on
every deploy instead of shipping whatever bundle happened to be committed.

React routes: `/`, `/services`, `/about`, `/pricing`, `/contact`, `/quiz`.

Production (`https://www.dutaintegra.my`):

| Path | Result |
|---|---|
| `/`, `/services`, `/about`, `/pricing`, `/contact`, `/quiz` | 200, serve the React app |
| `/audit.html`, `/cases.html`, other `.html` pages | 200, standalone static pages |

### The SPA fallback rewrite

Clean URLs previously 404'd because there was no SPA fallback. The last entry
in `vercel.json` `rewrites` is:

```json
{ "source": "/((?!api/|admin/|assets/|.*\\.).*)", "destination": "/index.html" }
```

Order matters — Vercel applies rewrites top to bottom, so `/api/*` and
`/admin/*` rules must stay *above* this one. The negative lookahead excludes
`api/`, `admin/`, `assets/`, and anything containing a dot, which is what keeps
every existing static page and asset resolving to itself. If you add a static
page under a path with no extension, add it to the lookahead or it will be
swallowed by the fallback.

### Fonts

`web-new/src/index.css` declares `--font-heading: "Syne"` and
`--font-sans: "Inter"`, and `web-new/index.html` loads both from Google Fonts.
The production CSP already allows `fonts.googleapis.com` (`style-src`) and
`fonts.gstatic.com` (`font-src`), so no CSP change is needed. `Web/audit.html`
loads Google Fonts separately and is the only static page that does.

## Where the site actually breaks in production

Verified against `https://www.dutaintegra.my`, not inferred from config.

**Clean URLs 404'd** before the SPA fallback existed, but on Cloudflare Pages
the fallback is *not* the whole story. Pages serves **Pretty URLs**: for any
path whose `.html` twin exists as a tracked static file, the clean URL resolves
to that static file, and `/* /index.html 200` only fires for paths with **no**
static twin. Probed on the apex (2026-11-02): `/billing` and a made-up path
return the 2 KB React shell, while `/pricing`, `/services`, `/about`,
`/contact`, `/quiz` each return the 17–19 KB **legacy static** page (its own
`<title>`, no `index-*.js`). So "clean URL serves React" holds only for React
routes that have no `public/<name>.html`. (The older "`/` … `/quiz` all 200 —
serve the React app" claim described the **Vercel** `vercel.json` rewrites;
Pages, which is what is actually live, behaves as above.)

| Path | Result (probed 2026-11-04) |
|---|---|
| `/`, `/billing`, any path with no static twin | 200 — React app (SPA fallback), on the apex *and* at origin |
| `/services`, `/about`, `/contact`, `/quiz`, `/pricing` | **apex**: 200 — **legacy static** HTML (17–20 KB, no `index-*.js`). **origin** (`dutaintegra.pages.dev`): 200 — React shell (2004 B, `index-CTWEBryY.js`) |
| `/audit.html`, `/calculator.html`, … (twins that still exist) | 200 — static HTML |
| `/services.html`, `/about.html`, `/contact.html`, `/quiz.html` | 200 — **the React shell**, not static HTML: the twins are gone and `/* /index.html 200` catches the `.html` spelling too. Confirmed under `wrangler pages dev public` (workerd, 2026-11-04): all five routes and all five `.html` variants return the same 2004 B shell. A link to `services.html` therefore lands on the React page, not on a 404 or a stale legacy file. |

**All five twins are already retired.** `git ls-files public/` lists no
`services.html` / `about.html` / `contact.html` / `quiz.html` / `pricing.html`, and
origin answers the React shell on every one of those routes. So the legacy pages a
visitor sees at `https://dutaintegra.my/pricing` are **not** an origin defect: they are
the Enterprise **`edge_cache_ttl=7200`** pin below, still re-caching the deleted object.
One consequence to keep in mind while doing conversion work on the React app: any change
to `/`, `/pricing`, `/services` etc. is *live at origin* but **invisible on the custom
domain** for those five paths until the edge TTL is lowered — only `/` currently reflects
the deployed bundle.

`public/pricing.html` + `Web/pricing.html` were deleted and deployed (`972ccd30` →
`a28c582b`), so the **origin** serves the new AI-operations landing at `/pricing` — proven
by `dutaintegra.pages.dev/pricing` (2004 B React shell) and by the custom domain's `/` and
`/pricing.html` (both the React shell). **But a browser still sees the deleted twin at the
bare custom-domain URL `https://dutaintegra.my/pricing` (17544 B) and no purge fixes it.**
The exact `dutaintegra.my/pricing` key is pinned by that **`edge_cache_ttl=7200`** zone
setting, which overrides the deployed `max-age=0`, so the stale object is re-cached for 2 h
after every eviction — its `age` header climbed straight through both a per-file purge and
`purge_everything` (+ `cache_reserve`), and the zone has no page/origin/cache rule pinning
it. The durable fix is therefore *not* a purge; it is setting **Edge Cache TTL to "Respect
origin"** (or 0) in the dashboard (Speed → Caching → Configuration), which the
`wrangler`/API token cannot do — it holds Cache Purge but its `PATCH /zones/*/settings/*`
returns `9109`/`10000`.

**Earlier claim, now retracted:** this file said the pin "self-heals once the object's 2 h
lifetime lapses — and it has", based on a 2026-11-02 probe. It does not. Re-probed
2026-11-04, `https://dutaintegra.my/pricing` again returns the 17544 B legacy page, with
`cf-cache-status: DYNAMIC`, `cache-control: public, max-age=0, must-revalidate` and
`age: 162858` (~1.9 days) — an object that cannot be that old under a 2 h edge TTL, which is
what the `edge_cache_ttl` override looks like from outside. `/* → max-age=0, must-revalidate`
in `public/_headers` is correct but is *currently overridden* until the TTL is lowered.
The other four twins are gone from the repo, so their legacy copies survive only in that
edge cache. **That parity has now been checked, for `/quiz` at least, and it holds:** the
retired `quiz.html` asked exactly three questions (team size → `teamSize`, annual IT spend →
`annualSpend`, biggest pain points → `painPoints`) and `web-new/src/pages/quiz.tsx` posts the
same three keys to the same lead endpoint, with `quizQ1..Q3` covering the same topics. So the
apex's stale legacy copy is a display defect that ends when the TTL is lowered — not a
content loss. Parity for `/services`, `/about` and `/contact` is still unchecked.

**The static pages' nav pointed at files that no longer exist (found 2026-11-04,
fixed in the working tree, NOT yet deployed).** `public/_redirects` ends in
`/* /index.html 200`, so an unmatched path does not 404 — Pages answers the React
shell and React Router's `path="*"` renders `NotFoundPage`. The visitor sees a
normal-looking page whose content is the site's not-found screen, and every
monitoring check still reports 200. That is how 195 links across 16 static pages
stayed broken: the nav and footer of every page linked
`quiz.html` / `services.html` / `about.html` / `pricing.html` / `contact.html`
after those twins were retired, and `audit.html` linked `/work` (×4) — a route
`web-new/src/App.tsx` has never had. Fixed by rewriting them to the React clean
URLs (`/quiz`, `/services`, `/about`, `/pricing`, `/contact`), `terms.html` →
`tos.html` (the legal page ships as `tos.html`), and `/work` → `/case-studies`.
`/ms/<x>` is not a defect: the first `_redirects` rule maps it to `/<x>`, so the
Malay prefix is alive exactly when the unprefixed path is.

**`audit.html` renders unstyled, and has never been otherwise.** Its only
stylesheet is `public/css/styles.css`, which is not on disk and has no git
history (`git log -- public/css/styles.css` is empty), while the page carries no
`<style>` block and no inline styles — every class it uses (`audit-form`,
`audit-features`, `brand-mark`, `nav-links`…) is defined nowhere in the repo.
The `<link>` cannot 404 either: `https://dutaintegra.my/css/styles.css` answers
**200 with the 2004 B index.html** as `text/css`, which the browser rejects
silently. This is the free-audit funnel, so the page that sells the audit looks
like raw HTML. Fixing it needs the stylesheet authored (or recovered), which is
design work, not a one-liner — `server/static-i18n.test.mjs` therefore tracks it
in `PAGES_MISSING_THEIR_STYLESHEET` so the hole is asserted rather than hidden,
and the test fails when someone adds the file without retiring the entry.

**`server/static-i18n.test.mjs` (2026-11-04) is the only guard over the hand-written
static tree.** It asserts, from `public/js/site.js` and the real pages: every
`data-i18n` key resolves with a non-empty `en` *and* `bm` (applyTranslations()
falls back to `entry.en`, so a half-filled entry only looks translated until you
toggle); no `data-i18n` on a void element (`<meta>` — `textContent` on it renders
nothing, seven such attributes were dead weight); the dictionary's `en` string
equals the page's own English for every keyed element — this caught three pages
whose copy was keyed to *another* page's string, so toggling to BM replaced
Ontrac's hero label with "Autonomous Ops" and its feed subtitle with the
Autonomous Ops sentence; every `<a>` href resolves to a real file under `public/`
or a route parsed out of `web-new/src/App.tsx`; and `Web/` and `public/` carry
byte-identical files except Pages-only `_headers`/`_redirects`. That last one was
already false: `public/robots.txt` had gained `Disallow: /workspace` etc. and
`public/sitemap.xml` a `/digital-assessment` URL that `Web/` never got — and
`scripts/sync-web.mjs` does not copy either, because they exist in neither
`web-new/public/` nor `dist/`, so both are hand-maintained twice.

**Lead capture was fully dead in production (found 2026-11-02), fixed in `main` and
now DEPLOYED (2026-11-02, `d5faaec6`).** Two independent bugs on `/api/send-email`, both proven with
`wrangler pages dev public` (workerd is the same runtime Pages uses):

1. **`crypto.randomUUID` detached → `Illegal invocation`.** The four `*-cloudflare.mjs`
write modules (enquiries, clients, cms, tickets) each did `const { randomUUID } = crypto;`
then called `randomUUID()`. Detaching the method drops its `this`, and workerd throws
`TypeError: Illegal invocation` — *before* any store call, so **every** Pages write 500'd.
A correctly-formed legacy POST cleared CSRF and still hit this. Fixed by calling
`crypto.randomUUID()` with its receiver. (The Node-path modules were always fine — they
`import { randomUUID } from "node:crypto"`, which is a standalone binding.)
2. **React sent no CSRF token → 403.** `validateCsrf` requires a `csrf_token` cookie *and*
an `x-csrf-token` header on any POST that carries `Origin`, and browsers send `Origin` on
every same-origin `fetch` POST. The React app did neither, so `/contact`, the proposal
funnel, hero WhatsApp signup and quiz leads all failed — `contact.tsx` masked it behind a
generic toast, `proposal-form.tsx` swallowed it with `.catch(() => undefined)`. Fixed by
porting the legacy `contact.html` double-submit into `web-new/src/lib/csrf.ts` (+ a unit
test) and using it at all four callers; the server's fail-closed gate was left intact.

The server `npm test` suite also carried a stale assertion that `Web/pricing.html` serves
200 — the twin was removed in `1f46ad1`, so the Node static server correctly 404s it; the
test now targets the still-present `audit.html`. After both fixes: `npm test` 291/291,
`npm --prefix web-new run test:web` 17/17, `tsc` clean, and `/api/send-email` returns
`200 {success:true}` under `wrangler pages dev`. **Deployed 2026-11-02 via `npm run cf:deploy`
(deployment `d5faaec6`, bundle `index-CTfBlD16.js`).** Verified on the apex: a tokenless
`POST /api/send-email` carrying `Origin` still returns **403** (the fail-closed gate is live and
rejects before any datastore write), and `/` + `/pricing` now serve the new React shell. The
happy-path `200 {success:true}` was proven locally under workerd; it was *not* re-probed against
production, because a valid-CSRF POST would write a real (fabricated) enquiry row into Supabase.

**Production now matches `main` (2026-10-30).** Until then it was 34 commits
behind: `https://dutaintegra.my/` served `assets/index-B54e6WfU.js`, the bundle
this repo had at `9b0d08e` (2026-10-26 00:20), and `/api/health` answered the
old three-key body `{ok, inboxConfigured, supabaseConfigured}`. A direct upload
(`npm run cf:deploy`) of `89a4b83` — deployment `ac108f20` — put `main`'s
`index-Djs7j6Hj.js` and the datastore-probe health body live. Verified on the
apex afterwards: `/` carries the new bundle, `/api/health` answers 200 with
`storageBackend: "supabase"` and `supabaseReachable: true`, and clean URLs
still resolve.

The mechanism, with `wrangler` logged in as the account that owns the zone:

| Cloudflare Pages project | Git | Domain | State |
|---|---|---|---|
| `dutaintegra` | **No** — direct `wrangler pages deploy` uploads | `dutaintegra.my`, `www.dutaintegra.my` | Production deploy `22b337fb` (2026-11-04, Source `2e267ba` = `main` tip) is live — apex `/` serves bundle `index-CTWEBryY.js`, which is exactly `HEAD:public/index.html`. It is one of **six** production uploads in the twelve hours before it (`794c2810`, `9a4baf45`, `1e696e61`, `a502c730`, `1f82b504`, `22b337fb`), so this project is being re-uploaded often; do not assume the deploy named in the history below is still current — re-check with `npx wrangler pages deployment list --project-name=dutaintegra` and `curl -s https://dutaintegra.my/ \| grep -o 'index-[A-Za-z0-9_-]*\.js'`. Only `npm run cf:deploy` — or the `deploy-pages` job in `.gitlab-ci.yml`, which until 2026-11-04 ran on **every** push to the `gitlab` remote with no test in front of it — changes it. See the CI section: pushing to GitHub ships nothing, pushing to GitLab used to ship everything. |
| `dutaintegraweb-main` | Yes — this repo, `main` | `dutaintegraweb-main.pages.dev` only | Builds on every push and **every build is `Failure`**. Not wired to the real domain. |

Pushing `main` to **GitHub** still does not ship, and neither problem is git: the
project that owns the domain has no git integration (production changes when
someone runs `npm run cf:deploy`, or when the GitLab pipeline's manual deploy job
is clicked), while the project that *does* watch `main` fails its builds and its
hostname is not the one anyone visits. Pushing `main` to the **`gitlab` remote** did
ship, untested, until the pipeline gained a gate — see the CI section.

**Deploying `main` before `5a90c04` would have taken the whole API down.**
`server/paths.mjs` resolved `PROJECT_ROOT` at module
scope with `fileURLToPath(import.meta.url)`, and Pages concatenates every module
reachable from `functions/` — including `paths.mjs`, pulled in by
`testimonials.mjs` — into one bundle in which `import.meta.url` is `undefined`.
The TypeError was thrown while the worker was being instantiated, before any
handler ran, so it killed all of `/api/*` at once while the static site kept
serving and looked healthy. Reproduced with `wrangler pages dev public` (worker
refused to boot) and fixed by resolving the root lazily; `server/paths.test.mjs`
now imports a copy of the module with `import.meta.url` stripped, because that is
the only way to exercise the bundled shape without workerd. Re-check with:

```bash
wrangler pages dev public --port 8791 --ip 127.0.0.1   # must print "Ready", not "failed to start"
```

Two loose ends worth remembering:

- `public/` carries the current bundle — as of this commit that is
  `index-CNfIbn5X.js` + `index-C9szhQXu.css` in **both** trees, while the apex still
  serves the previous `index-CTWEBryY.js`. `npm run build:web` syncs it
  along with `Web/` via `scripts/sync-web.mjs`. The Pages
  project deploys whatever is in `public/` at upload time, so re-check it
  before `npm run cf:deploy`.
- Uploads record the uploading shell's `CF_PAGES_COMMIT_SHA` as their Source,
  so the column is provenance from the deployer, not proof a commit exists
  here. The deployment history shows `c460733` as a Preview (2026-10-29) and
  `4d12ba5` as a Production upload whose build is marked `Failure`; neither
  hash exists in this repo. Do not assume this tree is the only source of
  deployed state.

Note also that `www.dutaintegra.my` 301-redirects to the apex, so the `www` host
used throughout this file is not the canonical origin.

**Fonts.** Both frontends now load the fonts they declare.

- `Web/audit.html` is the only static page that requests Google Fonts
  (`fonts.googleapis.com` + `fonts.gstatic.com`). The CSP used to block both, so
  it rendered in fallback fonts. Fixed in `c82e2a4`.
- The React app declares `--font-sans: "Inter"` and `--font-heading: "Syne"` and
  **now loads both** via `<link>` tags in `web-new/index.html`. Previously it
  shipped no `@font-face`, no import, and no `.woff`, so it rendered in fallback
  fonts. The existing CSP already allowed both origins, so no policy change was
  needed.

## The thing that trips people up

**Production is the Cloudflare fork, not the Vercel path.** Established on
2026-10-29 by probing the live site: `/api/auth/me` and `/api/auth/logout` —
routes that exist only in `server/handler-cloudflare.mjs` — answer 401 and 200,
while `/api/portal/me` and `/api/portal/logout` return 404. Static assets carry
`server: cloudflare` with `etag`/`cf-cache-status` and no `x-vercel-*`. The
wiring is `functions/api/[[path]].js` and `functions/admin/[[path]].js`, both of
which import `handler-cloudflare.mjs` and copy Pages env into `process.env`
before calling it, over the `public/` directory with `_headers` and `_redirects`.

Consequences:

1. **`handler.mjs` is the local and Vercel entrypoint, and it is not what users
   hit.** Everything below about `vercel.json` describes a deployment that is
   not live. The two forks have also diverged in substance, not just plumbing:
   `portal.mjs` hand-rolls cookie sessions against `portal_sessions`, while
   `portal-cloudflare.mjs` uses Supabase Auth and puts an access token in the
   `di_session` cookie. A fix to one does not fix the other.
2. **The schema guard used to watch the wrong entrypoint.**
   `server/schema.test.mjs` computed "live sources" by walking imports from
   `handler.mjs` alone, so it could not see the deployed path — and one of its
   tests asserted that the fork stayed unreachable, which made the blind spot
   look deliberate. It now walks both roots (`sourcesReachableFrom`, checked per
   entrypoint). Re-running the walk from `handler-cloudflare.mjs` had found
   tables the deployed code names that no migration declares and the live
   database does not have (anon-key REST probe, 2026-10-29: `404`, where
   `workspace_proposals` answers `200`). Those are gone, so
   `FORK_PENDING_TABLES` is empty and stays that way: adding a name files a bug
   rather than fixing one, and a name that gains a migration fails the
   stale-list test until it is dropped.
3. **The two deployment trees are separate outputs.** `Web/` is what Vercel
   would serve; Pages serves `public/`. `npm run build:web` writes both in one
   pass (`scripts/sync-web.mjs`); both carry `index-CNfIbn5X.js` since this commit,
   while production serves the older `index-CTWEBryY.js` until the next upload.
   `server/static-i18n.test.mjs`
   byte-compares the two trees (excluding `_headers`/`_redirects`) precisely because
   a half-synced pair ships the old app to one host. Re-check both sides before deploying:
   `grep -o 'index-[A-Za-z0-9_-]*\.js' public/index.html` and
   `curl -s https://dutaintegra.my/ | grep -o 'index-[A-Za-z0-9_-]*\.js'`.

## The Cloudflare fork's data layer

`server/supabase-client.mjs` hand-rolls two clients (**zero runtime
dependencies**, so nothing here is supabase-js) and neither behaves the way
supabase-js does:

- `supabaseAdmin.from(table)` is **flat, not chainable**. `select`, `insert`,
  `update(updates, match)`, `delete(match)`, `eq`, `order` and `limit` each fire
  immediately and resolve to the parsed body, not `{ data, error }`. Each method
  builds its path from the table name alone, so a filter combined with an order
  and a select cannot be expressed through it at all — which is why
  `portal-cloudflare.mjs` has `sbRest()` and `handler-cloudflare.mjs` has
  `cfSbFetch()`, both calling `/rest/v1/<table>?…` directly.
- `createSupabaseClient(token)` resolves a caller via `client.auth.getUser()`.
  Until 2026-10-29 `auth` was nested *inside* `from()` and `AUTH_BASE` was never
  destructured into that scope, so both paths threw, `verifyUser` swallowed it
  and returned `null` for **every** token. The whole logged-in portal —
  `/api/portal/me`, tickets, digests, proposals — answered `401 Session
  expired` whatever the client sent. Fixed, with tests.

The third consequence of writing against supabase-js by mistake:
`ops-tasks-cloudflare.mjs` had `from("ops_tasks").select("…").order("created_at")`,
which is `promise.order` — a `TypeError` on the first statement of every
handler, visible in the test log as
`supabaseAdmin.from(...).select(...).order is not a function`. That is why its
missing tables went unnoticed for as long as the module existed: the query never
reaches PostgREST to fail loudly.

- `/api/portal/proposals`, `/api/portal/proposals/:id` and
  `/api/portal/projects` are served from `workspace_proposals` /
  `workspace_projects` as of 2026-10-29. Before that they named Phase 3 tables
  that exist nowhere, in a shape the UI could not have rendered:
  `web-new/src/pages/portal-proposals.tsx`'s `Proposal` type (`summary`, `scope`,
  `amount_myr`) *is* the `workspace_proposals` row. Do not create a `proposals`
  table to satisfy old code — the Phase 4 names are the contract, and the Vercel
  fork already served them.
- `clients.id = auth.users.id` by construction in this fork
  (`portal-cloudflare.mjs` seeds the row from the signup response), so
  `workspace_proposals.client_id` is a valid FK for it and `client_id=eq.<uid>`
  doubles as the ownership check. The Vercel fork has to match proposal leads by
  email instead; the two forks disagree about what a client is. That divergence is
  why the Node entrypoint's portal list endpoints are not ports of this fork's:
  `handlePortalProposals` (`server/portal.mjs:400`) answers **`200 {proposals:[]}`**
  unconditionally — an empty list, not an error — with the email-match left as a
  comment, and `/api/portal/projects` is not routed in `handler.mjs` at all (404).
  Nothing in either frontend calls `/api/portal/projects`; only
  `handler-cloudflare.test.mjs:240` does. Do not "fix parity" by routing the fork
  handler through Node: it keys on `user.id` from `getAccessToken`/`verifyUser`,
  which the Node cookie-session path (`portal_sessions`, keyed on a hashed token →
  `clientId`) never produces.
- **`ops-tasks-cloudflare.mjs` is deleted** (2026-10-29). It exposed
  `/api/ops/tasks*`, `/api/ops/task-stats` and `/api/ops/audit-log` with **no
  auth check at all**; those routes reached the data layer directly and answered
  `500` to an unauthenticated `GET`, which is what made the hole look harmless —
  the `500` came from a missing table, not from protection. Commit `4061ff3` put
  a `requireAdminSession` gate in front of them; deleting the module finishes
  the job, because nothing in either frontend, in `automations/`, or in the test
  suite ever called them, and `workspace_tasks` / `workspace_approvals` at
  `/api/workspace/*` already model the same thing. If the feature is wanted
  again, recover it from `32f2d4d` and port it to `sbRest()` — do not ship a
  migration for `ops_tasks`, `ops_audit_log` and `profiles` before that port,
  or the gate has to be rebuilt from scratch.

- Locally, `server/index.mjs` serves both `Web/` and the API.
- On Vercel, **`vercel.json` serves `Web/` directly** and never runs the
  static logic in `handler.mjs`. Only `/api/*`, `/admin/*` reach
  `api/gateway.js`.

Two consequences worth remembering:

1. Security headers for the static site live in `vercel.json`, **not** in
   `handler.mjs`. Editing one does not affect the other. They are intentionally
   kept in sync via `SECURITY_HEADERS` in `handler.mjs`; if you change a policy,
   change both. The live equivalent for Pages is `public/_headers`.
2. Vercel runs `buildCommand: "npm run build:web"` before uploading, so the
   committed `Web/index.html` + `Web/assets/index-*` are **build outputs**. They
   are committed anyway so the repo works without a build step; regenerate them
   with `npm run build:web` rather than editing them.

## Workflow

```bash
npm test            # 339 passing (2026-11-04 — 7 of them are
                    # server/static-i18n.test.mjs); node:test, no deps, throwaway DATA_DIR
npm run test:web    # 58 tests in 10 files (2026-11-04), Vitest + Testing Library (needs web-new/node_modules)
npm start           # loads .env via --env-file-if-exists
npm run build:web   # build web-new/ into Web/ (the deploy artifact)
npm run lint:web    # oxlint over web-new/ (needs web-new/node_modules)
npm run verify      # tests + build + web tests + lint — run this before pushing
```

`npm start`/`dev` pass `--env-file-if-exists=.env`, so a missing `.env` is fine.
There is no `dotenv` and shouldn't be.

`npm run verify` is the whole gate in one command: it runs `build:web` before
`test:web` and `lint:web` because both need `web-new/node_modules`, which the
build installs.

**A `test:web` run can fail without running a single test, and that is not a code
defect.** Under memory pressure — e.g. another repo's Vitest in parallel, or the
~8 `npm exec` MCP servers this workspace keeps alive — the forks pool dies with
`Unhandled Error: [vitest-pool]: Failed to start forks worker` and
`Caused by: Timeout waiting for worker to respond`, once per test file, with
summary lines `Test Files no tests / Tests no tests`. Exit code is 1, so nothing
is silently green; but it reads like a suite failure. It is startup, not
assertions: `--maxWorkers=1` and `--no-file-parallelism` do not fix it, and one
jsdom environment costs ~20 s on a quiet machine (Vitest's own hint measured 8
environments / 176 s). Free a few hundred MB plus swap in use is the tell. Wait
for the other job, or run the files you changed individually
(`npx vitest run src/components/lead-leakage-check.test.tsx`). `tsc -p
tsconfig.vitest.json --noEmit` still runs and is the cheap half of the gate.

**`build:web` and `cf:build` prefix the install with `npm_config_allow_scripts=`
for a reason.** npm 11 forwards a developer's `allow-scripts` setting from
`~/.npmrc` into the child process as `npm_config_allow_scripts`, and rejects that
key outright for a `--prefix` install (`EALLOWSCRIPTS: --allow-scripts is not
allowed in project-scoped installs`). So `npm --prefix web-new ci` succeeds when
typed directly and fails when nested inside `npm run`, which is the shape
`build:web` needs. Clearing the variable for the child is what makes the gate run
on a machine whose owner allows scripts globally for other projects. Do not
"tidy" the assignment away; the failure it prevents is invisible from the outer
command's help text.

Frontend tests live next to what they cover (`src/**/*.test.tsx`) and run under
Vitest with `environment: "jsdom"` — configured in `web-new/vite.config.ts`, so
one config serves the build and the tests. `tsconfig.app.json` excludes them and
`tsconfig.vitest.json` type-checks them with Node types; the browser build never
sees Node's globals.

**Scroll reveal is armed by an inline script, not by CSS.** `Web/index.html` and
`public/index.html` add `js-reveal` to `<html>` before the stylesheet paints,
and `web-new/src/index.css` hides `.reveal` only under that class. A client that
does not run the bundle — a crawler, a print, a failed script load — sees every
section, instead of 35 blocks of `opacity: 0`. Re-adding a bare
`.reveal { opacity: 0 }` fails `src/hooks/use-scroll-reveal.test.tsx`.

## CI

Both files run the same six jobs, and neither is weaker than the other (as of
2026-11-04 `ci.yml` was brought back in step — it had drifted in two ways, described
under the table):

| Job (GitHub / GitLab) | What it does |
|---|---|
| `test` / `server-tests` | `npm test` - `node --test` over `server/**/*.test.mjs`. Needs no install (root has zero deps). |
| `env-docs` | `node scripts/validate-env.mjs` - `.env.example` versus every `process.env.*` read in `server/` and `api/`. The cheap half of `npm run verify`. |
| `frontend` / `frontend-tests` | `npm ci`, Vitest unit tests, `oxlint`, and `tsc -b && vite build` in `web-new/`; uploads `dist/`. |
| `secret-scan` | `scripts/scan-secrets.mjs` over the working tree and the full git history. |
| `artifact-drift` | Runs `npm run build:web`, then fails if a deploy tree no longer matches source. Checks **both** `Web/` and `public/` on either host, and publishes `public/` as the artifact the deploy job uploads. |
| `deploy-pages` | Uploads that artifact to the `dutaintegra` Pages project. Manual on GitLab (`when: manual`), opt-in on GitHub (`vars.CF_PAGES_DEPLOY_ENABLED == 'true'`). |

Two GitHub-only defects fixed alongside the mirror. Its `artifact-drift` had only
ever looked at `Web/`, so a `public/` — the tree production actually serves — could
drift and stay green; and its deploy condition read
`secrets.CLOUDFLARE_API_TOKEN != ''`, which is not a context available to
`jobs.<job_id>.if`, so the guard it appeared to have was never the one being
evaluated. A job that ships to a live origin should not rest on a condition the
runtime cannot see. The durable GitHub equivalent of GitLab's manual click is a
required reviewer on the `production` environment (Settings → Environments); the
variable only makes the job absent by default.

**There is a third workflow file, and it was a second path to the same origin.**
`.github/workflows/pages-deploy.yml` (added by `bb14165`, 2026-11-02) was not
mentioned anywhere in this file, and its `deploy` job was gated on nothing but
`github.ref == 'refs/heads/main'` — so together with `ci.yml`'s `deploy-pages` it meant
one push could upload `public/` to `dutaintegra` twice, which is the shape of the "six
production uploads in twelve hours" recorded above. It never did, by accident: its
`verify` job ran `npm --prefix web-new run test:web` and `run lint:web`, and those
script names exist only at the repository root (`web-new/` defines `test` and `lint`),
so the job died on the first frontend step and `deploy` had `needs: verify`. It is now
a `workflow_dispatch` companion with the same root scripts, the same both-trees drift
check, `CF_PAGES_DEPLOY_ENABLED` as its deploy condition, and an artifact instead of a
second rebuild — a gate that passes by crashing is not a gate.

Neither pipeline runs `npm run test:email`; it needs live mail credentials, so it
stays a manual command.

The `frontend` job exists because its absence is what let 70 TypeScript errors
accumulate in `web-new` unnoticed — CI previously only tested `server/`, so the
frontend could rot while CI stayed green. `artifact-drift` guards the other half
of the same failure: a committed `Web/` bundle that had drifted from `web-new/`
source. If it fails, run `npm run build:web` and commit the result.

`secret-scan` uses patterns plus a liveness check. A pattern hit is only a
warning; the job fails only when a credential is confirmed live against the API
of the provider that issued it. That keeps a red X meaningful — a revoked token
or a docs example never breaks the build, and `--strict` is available if you
want pattern hits to fail too. Findings are always redacted, because printing a
secret to warn about the secret would leak it again into the CI log.

History is scanned as well as the working tree, because a secret that was
committed and later deleted is still recoverable from any clone. That needs
`fetch-depth: 0`, which the job sets.

Dependabot (`.github/dependabot.yml`) watches `web-new/` npm packages weekly and
the workflow actions monthly. Minor and patch bumps are grouped into one PR;
majors arrive separately so they get read properly.

**GitHub Actions cannot run jobs for this account, and the cause is now
named.** Every CI job — 20+ runs across all of `shamelali`'s repos — ends
`failed` with `runner_name: ""`, zero steps and no log archive (`log not found`).
The check-run annotations say why:

> The job was not started because your account is locked due to a billing issue.

`actions/permissions` still reports `enabled: true, allowed_actions: all`,
`ci.yml` parses, and every job it defined then was `runs-on: ubuntu-latest`, so this is not a
repo or workflow defect — it is an account-level hold, and it is fixed at
`github.com/account`, not in code. Until it is cleared, CI tells you nothing:
a red X is not evidence of broken code, and `npm run verify` locally is the only
real gate. `gh api repos/<repo>/check-runs/<id>/annotations` is how to read the
reason again without a dashboard.

While diagnosing it, one further fact about the queue: `actions/runners` for this
repo returns an empty list, which is *expected* — that endpoint lists
self-hosted runners only, and these jobs ask for GitHub-hosted ones. An empty
list there is not the fault.

**The workaround is `.gitlab-ci.yml`, and the remote was already in use.** `git
remote -v` lists `gitlab → https://gitlab.com/shamelali/dutaintegra.git`, whose
`main` sits on `2e267ba` — the same commit as local `main`, so this repo is
already being pushed to GitLab. Until 2026-11-04 that pipeline was two jobs,
`build` (install, vite build, `sync-web.mjs`) and `deploy-pages`, with **no test
of any kind**: every push to main uploaded `public/` to the live `dutaintegra.my`
origin unchecked. That is the mechanical explanation for the six production
uploads in twelve hours recorded above — they were CI, not someone typing
`npm run cf:deploy`, which is why the deploy history never corresponded to a gate.
`0c0dfd2` added the job on 2026-11-03 and `dd0bd71` fixed its install
(`NODE_ENV=production` had been suppressing devDependencies); neither added a test.

The rewritten file runs the same gate GitLab can reach (`server-tests`,
`frontend-tests`, `env-docs`, `secret-scan`, `artifact-drift`) and keeps the
deploy, but as `when: manual` on the default branch, `needs: artifact-drift` with
its `public/` artifact, and present in the pipeline only when
`CLOUDFLARE_API_TOKEN` is defined. Pushing therefore cannot change production by
itself, and the bytes uploaded are the bytes that were just rebuilt and checked
rather than a second, unverified build. Set `CLOUDFLARE_API_TOKEN` (plus
`CLOUDFLARE_ACCOUNT_ID`) as masked, protected variables under Settings → CI/CD →
Variables. The job also passes `--commit-hash $CI_COMMIT_SHA`, because a bare
`wrangler pages deploy` records the uploading *machine*'s
`CF_PAGES_COMMIT_SHA` as the Pages Source — the provenance column this file has
been warning about all along.

Verified by running the job scripts in a clean worktree of `2e267ba`
(`git worktree add --detach /tmp/ci-wt HEAD`), the closest local stand-in for a
runner: `npm run build:web` exited 0 with `git status --porcelain -- Web/ public/`
empty, so `artifact-drift` passes on the first push — including the `public/` half
GitHub's version never looked at; `npm test` 291/291; web tests 17/17; `oxlint` 0
errors; `validate-env` and `scan-secrets` both exit 0. `scan-secrets --verify` was
**not** run locally, because its liveness check sends each candidate to the
provider that issued it — that half is for the runner.

Two things do not move with the pipeline: Dependabot (`.github/dependabot.yml`)
has no free-tier GitLab equivalent, so keep Dependabot on GitHub — it opens PRs and
needs no runner — or adopt Renovate; and `automations/` runs on OpenHands cron, not
on either CI.

## Automations

`automations/` holds OpenHands automations, run on cron. See
`automations/README.md`. These are deliberately LLM-free scripts — a scheduled
health probe is deterministic, so an agent-driven run would burn tokens for no
benefit.

Deployed:

| Automation | ID | Schedule |
|---|---|---|
| DI uptime + deploy-integrity watch | `1aebf583-b3f9-44d3-af7f-227398cedf4a` | `*/15 * * * *` UTC |
| Lead pipeline watch | (not deployed) | intended `*/15 * * * *` UTC |

`lead-pipeline-watch` is available in `automations/lead-pipeline-watch/` but not
deployed; its auth now uses `x-admin-token` (was a broken Bearer header).
See `automations/README.md`.

Deploying a change means rebuilding the tarball and re-uploading, which creates
a *new* automation — the tarball is snapshotted at upload time, so editing
`automations/uptime-watch/main.py` in the repo changes nothing until redeployed.
Uploads are capped at 1 MB.

Alerting needs a secret named `ALERT_WEBHOOK_URL` (a Slack incoming webhook
works). It is fetched at runtime, so adding it later requires no redeploy. Until
it exists the watch still runs and records history; it just reports silently.

## Conventions

**Rate limiting.** `rateLimit(key, now, limit, windowMs)` is module-level state
keyed by string. Credential endpoints get their own budget via
`loginRateLimit()` — do not let a login route fall back to the marketing budget.
Because the counters are process-global, **tests must pass an explicit
`x-forwarded-for` per case** or they consume each other's budget; use the
`nextIp()` helper.

**Tokens.** `ADMIN_TOKEN` and `DIGEST_TOKEN` both **fail closed**: unset means
the route is refused, never open. Compare secrets with `constantTimeEqual()`,
never `===`. In the Cloudflare fork, read `process.env` **inside** the comparison
— `functions/api/[[path]].js` copies the Pages bindings in per request, so a
module-scope capture is `undefined` for the life of the worker. That is exactly
how `portal-cloudflare.mjs` had disabled its own `x-admin-token` path.

**CSP.** The policy is deliberately origin-by-origin and derived from what the
pages actually load. Before adding an origin, check whether the page uses it as
a `<script src>` or a `<link rel="stylesheet">` — `cdn.jsdelivr.net` is a style
and font origin only, and granting it `script-src` would be needless risk.
`server/handler.test.mjs` asserts the policy against the real pages and against
`vercel.json`; a policy that blocks the site's own assets fails the suite.

**Headers over plain HTTP.** `SECURITY_HEADERS` omits HSTS on purpose. Sending
it from a local HTTP server pins browsers to HTTPS on localhost.

**Storage backend resolution lives in `server/store.mjs`, and nowhere else.**
Every store (clients, enquiries, tickets, sessions, digest, cms, portal,
handler) asks the resolver which backend owns the request. Do not re-add a
local `supabaseConfigured()`. The rules:

| `SUPABASE_URL` | `SUPABASE_SERVICE_ROLE_KEY` | Result |
|---|---|---|
| set | set | Supabase |
| either set, other unset | — | `StorageConfigError`, **in every environment including dev** |
| both unset, `NODE_ENV=production` | — | `StorageConfigError` |
| both unset, elsewhere | — | JSONL in `data/`, warned once per process |

Use `usingSupabase()` when a call site must fail loudly (it throws), and
`supabaseReady()` in route guards that should answer 503 instead of 500.
Supabase write failures propagate — no write may quietly land in a file.

**Portal sessions live in `server/sessions.mjs`, never in process memory.** The
table is `portal_sessions`, keyed on `token_hash` (SHA-256 of the cookie value —
the live token is never stored, so a datastore leak hands out no sessions). A
`Map` in `portal.mjs` cannot work here: Vercel runs the handler in short-lived
processes, so every cold start would sign every client out, and clearing a cookie
is not revocation. Expired rows are pruned on login rather than by a cron,
because this deployment has no cron.

`/api/health` proves the datastore rather than describing the config: with
Supabase selected it writes, reads back and deletes a sentinel row in
`health_probe`, caches that for 60s, and answers **503** when the round-trip
fails, when the pair is half-configured, or when the JSONL fallback is active on
a serverless platform. `?fresh=1` bypasses the cache. It never echoes provider
error bodies, because those name tables and columns. The uptime automation reads
`datastore.backend` and pages persistence separately from outages — see
`automations/README.md`.

The schema is versioned under `supabase/migrations/`; `server/schema.test.mjs`
fails if code references a table or column no migration declares, if a table
ships without RLS, or if a `create policy` omits a `to <role>` clause (which
grants access to role `public`, and `anon` inherits it). It walks both
entrypoints — `handler.mjs` and `handler-cloudflare.mjs` — because production
runs the second; checking only the first is what let five undeclared tables sit
in the deployed tree. Read
`supabase/README.md` before adding a column.

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. It must stay
server-side — never Vite-prefixed (`VITE_*`), never in a client bundle, never in
a response body or log line.

**Store paths live in `server/paths.mjs` (`dataFile()`), and `npm test` never
touches `data/`.** Every JSONL path resolves through `DATA_DIR`, and
`scripts/test-server.mjs` — which is what `npm test` now runs — starts the suite
with `DATA_DIR` pointed at a temporary directory. This matters because each store
module used to build `join(PROJECT_ROOT, "data", ...)` itself, so every test run
appended synthetic rows into the developer's real local files (1,288 fake
`Test Client` accounts at the time it was found). If you add a store, use
`dataFile("name.jsonl")`; `server/paths.test.mjs` fails the build if a module
rebuilds the path by hand instead.

## DutaOS payments (HitPay + Billplz)

`server/payments.mjs` (added 2026-10-31) implements the DutaOS billing
checkout. **Production runs it as of 2026-11-01.**
`handler-cloudflare.mjs` routes `/api/companies`, `/api/companies/:id`,
`/api/billing/checkout`, `/api/billing/payments` and both
`/api/payments/webhook/*` paths at the *same* Node handlers
`server/index.mjs` uses, reached through the fork's `runNodeHandler` adapter —
deliberately not a `payments-cloudflare.mjs`, because a second copy of the
billing logic is how this repo keeps diverging its two entrypoints. `npm run
cf:deploy` shipped that on 2026-11-01 (deployment `2e5b805f`, bundle
`index-Cl8HJZXr.js`). Verified against `https://dutaintegra.my` after the
upload: `/api/companies` and `/api/billing/payments` now answer **401** (they
were **404** before the port), `/api/payments/webhook/hitpay` answers **405** to
a `GET` and **401** to an unsigned `POST`, and `/api/health` answers 200 with
`payments.providersConfigured: {hitpay: false, billplz: false}` — the routes are
live but **no provider keys are set in the Pages production environment**, so
checkout fails closed ("not configured") until `HITPAY_*`/`BILLPLZ_*` are added
in the Cloudflare dashboard. That is the intended safe state: nothing can charge
without explicit keys. The `/billing` SPA (`web-new/src/pages/billing.tsx`) now
shows an inline checkout error rather than replacing the whole page.

**Re-probed 2026-11-04: that safe state has moved.** `/api/health` on the apex now
answers `payments.providersConfigured: {hitpay: true, billplz: false}`, so `HITPAY_*`
has been added to the Pages production environment and **HitPay checkout can charge
today**. `billplz` is still unset, and the deployed build does not report herepay at
all. All three `/api/payments/webhook/*` routes answer **405** to a `GET`; an
unsigned `POST` answers **401** for hitpay and billplz but **500** for herepay —
the deployed `payments.mjs` computes the checksum before checking for a key, so
`createHmac(undefined)` throws. The working tree fixes that (401, with the payer and
payload guards described below) and it ships only on the next `npm run cf:deploy`.

An earlier version of this paragraph claimed the Pages deploy carried
`handler.mjs` because `functions/api/[[path]].js` copies Pages env into
`process.env`. That was wrong: the file's only import is `handleApi` from
`server/handler-cloudflare.mjs`, so nothing in `handler.mjs` is reachable from
production. Any fix in `payments.mjs` now reaches both entrypoints without a
port — provided it goes through `runNodeHandler` and never assumes a real
`req.socket`, `res.writeHead` streaming, or a writable filesystem.

`/api/health` in the fork is also no longer a hand-rolled duplicate: it calls
`healthReport()` from `server/health.mjs`, so production will finally answer
with `datastore.probe` and `payments.providersConfigured`, and 503 when the
round-trip fails. `health.mjs` counts `CF_PAGES` as serverless too, so a jsonl
fallback on Pages is no longer reported durable.

Five routes, all company-scoped via the `dutaos_session` cookie (`getCompanyIdFromReq`
in `server/auth.mjs`):

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/billing/checkout` | cookie | Creates a pending payment, returns the provider's checkout URL |
| GET | `/api/billing/payments` | cookie | Lists the authenticated company's payments (newest first) |
| POST | `/api/payments/webhook/hitpay` | HMAC-SHA256 sig | Flips payment to paid/failed, upgrades subscription on paid |
| POST | `/api/payments/webhook/billplz` | HMAC-SHA256 sig | Same, against the `x-signature` header |
| POST | `/api/payments/webhook/herepay` | checksum | Same, against Herepay's field checksum |

**HerePay fails closed instead of self-contradicting.** Until 2026-11-04
`createCheckout` built `metadata = { companyId, plan, orderId }` and then read
`metadata.bankPrefix` / `metadata.customerName` back out of that same object, so the
always-`undefined` values threw `Herepay requires bank_prefix` after a payment row had
already been created as pending. It now takes a fourth argument, `customer`, threaded from
the request body (`handler` → `readJsonBodyLocal` does no key filtering, so
`{ provider, plan, customer }` arrives intact), checks the three `HEREPAY_*` keys first,
and only then refuses unless the caller supplied `name`/`email`/`phone` and the
`bankPrefix` the payer picked. The error is a 400 before any provider call, and
`payments.test.mjs` asserts all three paths: unconfigured, configured-but-no-payer
(`fetch` call count stays 0), and a complete payer — which checks the form body's
`name`/`email`/`bank_prefix`/`amount` and the `checksum` against the mock's HTML
`<form action>`, since HerePay returns a form, not JSON.

What is still missing is the caller: `web-new/src/pages/billing.tsx` POSTs only
`{ provider, plan }`, so HerePay checkout cannot succeed from the UI even with keys set,
and nothing anywhere collects a bank choice. Wiring it needs the company's contact details
read from `companies.mjs` plus Herepay's bank-prefix list. `HEREPAY_*` is unset in the
Pages environment, so the provider stays hidden — the fail-closed default.

The callback had the same problem in reverse: it computed the checksum before
checking that a key exists, so with `HEREPAY_PRIVATE_KEY` unset — production's
state today — `createHmac(undefined)` threw and
`/api/payments/webhook/herepay` answered **500** instead of the **401** hitpay
and billplz answer. `herepayVerifyChecksum` now refuses a missing key or a
non-string `checksum` before touching HMAC, `processHerepayWebhook` rejects a
parsed body that is not an object, and `updatePaymentStatusByOrderId` returns
early when the provider names no order (the id used to degrade into
`metadata ilike '%null%'`, which could flip an unrelated row) and
percent-encodes it, the way every other `sbFetch` call in the file already did.
`status_code` maps `00` → paid, `29` → pending, anything else → failed, and the
success body is the literal text `OK` because that is what HerePay parses.

All three webhook routes are rate-limited at 60 requests/minute per source IP
(`x-forwarded-for`) via `auth.mjs:rateLimit` — see `webhookRateLimit` in
`payments.mjs`. Signatures are verified with `timingSafeEqual`. A provider
is only offered at checkout when its keys are set; unset means hidden, not
an error — the same fail-closed rule as `ADMIN_TOKEN`.

`payments` lives in `supabase/migrations/202610310004_payments.sql` with
RLS enabled and no public policies (service-role writes only). `companies.mjs`
exposes `updateCompanySubscription(companyId, patch)` — a server-only setter
that bypasses the `UPDATABLE_FIELDS` whitelist; do not route subscription
changes through the normal `updateCompany`, or the tier/status fields are
silently dropped.

`/api/health` reports `payments.providersConfigured.{hitpay,billplz,herepay}` so the
uptime automation can page when a key disappears; the flag is not part of
the health `ok` calculation.

## Ask Duta (public assistant on `/ask`)

`server/ask-duta.mjs` + `POST /api/ask-duta` answer anonymous visitors about Duta
Integra itself. It is **not** the DutaOS chatbar: `/api/ai/chat` calls
`requireCompany()` (`server/ai.mjs`) and grounds on the signed-in client's own
compliance rows, so it 401s for a marketing visitor — which is why this is a
separate endpoint and not a reuse of it.

Answer order, first hit wins: curated facts → the model, *only* if one is
configured → an explicit hand-off. The response is
`{ answer, answered, topic, source: "rule"|"model"|"handoff", lang }`, and a miss
is returned as a miss (`answered:false`), never improvised. `server/knowledge/duta-integra.mjs`
is the only DATA block; facts we do not have are stored as `null` with a comment
(`ssmNumber`, `taxNumber`, `refundPolicy`), because `privacy.html` still carries
the unfilled `(Company No. [INSERT])` placeholder.

| Consequence | Why it matters |
|---|---|
| **No secret is required for it to answer.** `llmConfigured()` is `LLM_BASE_URL && LLM_API_KEY`, and it deliberately does not count Ollama on localhost: that host is unreachable on workerd, so treating it as configured would make every question wait out a timeout the rule path had already skipped. Setting both later upgrades the answers with no redeploy. | Unlike payments, which is dead until a provider key exists, Ask Duta degrades to a declared hand-off rather than an error — nothing here is waiting on a credential. |
| **One handler, both forks.** `handler.mjs` calls it directly; `handler-cloudflare.mjs` reaches it through `runNodeHandler`. There is deliberately no `ask-duta-cloudflare.mjs` — a second copy is how this repo diverges its entrypoints. | Production runs the second fork. |
| **No migration, no table.** `ai_actions.company_id` is `not null references companies(id)`, so an anonymous turn cannot be logged there, and a new table means a hand-applied schema change. v1 writes nothing to the datastore; leads reuse `/api/send-email` (CSRF, validation, notification and the `leads` table come free). `"ask-duta"` is in `WEBSITE_LEAD_SOURCES` or `normaliseLeadSource()` silently rewrites the attribution to `contact-form`. | RLS is not the gate here — writes go through the service-role key. |
| **Rate limit is per-IP and per-isolate.** `rateLimit("ask-duta:"+ip, …, 10, 60_000)`; the counters are a module-level `Map`, so a cold isolate resets them. It blunts a browser flood; it is not a paywall. Tests must use a fresh `nextIp()` per case. | Same trap as every other rate-limited route. |

Two guard tests exist because both defects were found in this feature, not
before it: BM answers must not carry English prose (the matcher is a *word-start
prefix*, so `"siap"` matched inside `"siapa"` and `"berapa"` inside `"berapa
lama"`, and one English-only display string leaks into every Malay answer), and
every `DI_FACTS` figure must still appear on the pricing page. `/ask` is in
`public/sitemap.xml`, whose five retired `.html` twins were still being
advertised to crawlers — now pointed at the React routes and pinned by a test.

## Environment variables

`.env.example` documents every variable the code reads. There is a test-adjacent
check worth repeating after adding one: extract `process.env.*` references from
`server/` and `api/`, and diff against the names in `.env.example`. They should
match exactly — no undocumented variables, no phantom ones.

## Unverified claims

`ENTERPRISE_AUDIT_REPORT.md` was written against `77f65a0` and has been partly
corrected since, but its per-endpoint tables and OWASP ASVS percentages still
reflect an older structure (they reference `/api/enrol` and `/api/contact`,
which no longer exist). Treat the body as historical and the remediation section
at the top as current.
