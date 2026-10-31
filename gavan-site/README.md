# GAVAN SITE

**Build Better. Manage Smarter.** A construction site management app for GAVAN GROUP. It is a mobile-first web app (installable PWA) with a management dashboard, and it keeps all data in a backend database with file storage.

It connects directors, admins, project managers, PMC, site engineers, supervisors, architects, structural engineers, contractors, purchase and accounts in one place.

---

## 1. Quick start

Requirements: **Node.js 22.5 or newer**. The database uses Node's built-in SQLite, so no separate database server or native build is needed.

```bash
cd gavan-site
npm install
npm start                 # http://localhost:3000
npm test                  # end-to-end tests of the 9 acceptance workflows
```

On first start the server creates:

* The company, the **7 live projects** (Moksh Villa, Gavan Arena Park, Gavan Homes, and the four Shivaay Industrial Parks: Mamakwada, Ahu, Anklash and Umarsadi), default folders, QC checklists and the initial reporting structure.
* Two live logins, **`director`** and **`anushka`**. Their random temporary passwords are printed to the console and saved to `data/INITIAL_LOGINS.txt`. Both must change their password at first login.
* A separate, clearly labelled **DEMO – Sample Villa Project** with demo users (password `demo1234`): `demo.pm`, `demo.pmc`, `demo.engineer`, `demo.supervisor`, `demo.architect`, `demo.structural`, `demo.contractor`, `demo.purchase`, `demo.accounts`. Sample data never touches live projects. **Admin → Data → Delete all sample data** removes all of it. To skip it entirely, start with `LOAD_SAMPLE=0`.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `./data` | Database, uploaded files, backups |
| `DB_FILE` | `$DATA_DIR/gavan.db` | SQLite file |
| `ADMIN_PASSWORD` | random | Initial `director` password (first start only) |
| `LOAD_SAMPLE` | `1` | Set `0` to not create the DEMO project |

### Production deployment

* Run it behind HTTPS (nginx/Caddy, or a platform such as Render, Railway or a VPS). **The browser only allows live camera, GPS, push and offline install over HTTPS** (or on localhost).
* `DATA_DIR` must be on a persistent disk. Back up both `gavan.db` (use **Admin → Data → Create backup**) and `data/uploads/`.
* Use a process manager such as `pm2 start server/index.js --name gavan-site` or systemd.

---

## 2. What is implemented

| # | Area | Implemented |
|---|---|---|
| 1 | Design / UX | Forest green `#173D32`, ivory `#F8F7F2` and muted gold; the GAVAN logo (admins can upload a new one); large touch targets; bottom nav (Home, Tasks, Daily Report, Drawings, More) and a desktop sidebar; loading, empty, success and error states; **English / हिन्दी / ગુજરાતી** UI |
| 2 | Projects | Add, edit and archive projects. Each project has its own Building/Zone → Floor → Unit/Work-location tree, team, contractors, work items, folders and records. Residential, commercial and industrial types |
| 3 | Roles & access | 11 roles, with a permission matrix admins can edit (**enforced on the server**). Non-directors see only assigned projects. Contractors see only their own tasks, inspections, drawing requests and drawings shared with them. Finance data (rates, PO values, invoices, bills) is restricted |
| 4 | Dashboard | Project filter; cards for planned/completed work today, labour present, overdue tasks, pending approvals, material shortages, pending drawing requests, quality issues, delays with reasons, missing reports, upcoming deadlines and contractor performance. Every card opens the matching records. Progress is weighted by quantity, and the formula is shown |
| 5 | Morning report | Location, contractor, date/time, trade-wise labour, planned work linked to work items, material and machinery required vs available, drawing availability, expected completion, problems, live photos. Deadline per project, with reminders |
| 6 | Evening report | Links to the morning plan (pre-fills planned work and labour). Captures actual quantities, pending work, delay reasons, attendance and hours/OT, material consumption (deducted from stock), quality checks, safety, and tomorrow's plan, labour and materials. Corrections need a reason and keep a full **edit history**. Concurrent edits are detected (version check) |
| 7 | Tasks | Location, assignee, contractor or department, priority, dates, checklist, attachments, dependencies (start is blocked until they finish), comments with **@mentions**, proof of completion, reviewer. Flow: Open → In Progress → Submitted → Approved/Rework → Closed. **List, Kanban and Calendar** views. Notifications on assignment, due, overdue, rework and approval |
| 8 | Drawings | Request → site engineer check → consultant upload → a **different** authorised reviewer approves → contractor and supervisors are notified. Drawing no., revision, uploader, date and status. The current approved revision is highlighted and older ones are marked *superseded*. PDF and image preview; DWG/DXF can be downloaded for an external CAD viewer |
| 9 | Quality | 13 editable checklists (Excavation through Handover). OK/Not OK/NA per item, measurements, remarks, photos, Pass/Fail/Rework, correction deadline, correction, reinspection and **sign-off by the assigned reviewer**. A task marked "requires inspection" **cannot be approved before sign-off** |
| 10 | Contractors | Profile, trade, projects, work order, scope, rates and units (restricted), dates, labour history, approved quantities, quality record, bills and payments (finance only), documents, and performance metrics. Several contractors per trade are supported |
| 11 | Materials | Request → approval (you cannot approve your own) → PO → **partial deliveries** with challan/invoice, accepted, rejected and shortage, plus photos → stock update → accounts review. Stock ledger: opening, receipts, consumption, transfers in/out, wastage, adjustments, closing. **Project-to-project transfers** with receiving confirmation |
| 12 | Labour & planning | Contractor- and trade-wise attendance (skilled/unskilled, planned vs actual, hours, OT, location, quantity, tomorrow's need). Daily and weekly targets with responsible person and deadline. The result is achieved, partial or missed (calculated), with a reason and revised date |
| 13 | Live photos | In-app **live camera** (getUserMedia) with a timestamp overlay. Stores project, location, uploader, device capture time, server upload time, GPS and accuracy (if permitted) and the linked record. Offline captures and missing GPS are flagged. Shown as *supporting evidence, not proof of authenticity*. Live evidence is kept separate from document uploads and cannot be deleted |
| 14 | Files | Project folders and nested sub-folders, **role-restricted folders**, previews (PDF/images), downloads, search, type and date filters, **version history**, uploader and date, and links to tasks, drawings and reports |
| 15 | Communication | Project group chats (created automatically), direct messages, task discussion threads, file/photo sharing, @mentions, pinned instructions. Meetings with agenda, location or video link, attendees, minutes, and **action items that become tasks** |
| 16 | Notifications | Always in-app. **Push (Web Push/VAPID), email (SMTP) and WhatsApp Cloud API** are sent only through providers you configure. You choose channels per notification type. Escalation timings and roles are configurable. A **delivery log** records the real status of every attempt (`sent`, `accepted_by_provider`, `failed`, `not_configured`, `skipped`) |
| 17 | Reports | 11 reports: daily progress, labour, weekly plan vs actual, contractor performance, stock & consumption, pending purchase, drawing requests, quality & rework, overdue tasks, project progress, management summary. On-screen preview and **PDF and Excel** downloads with GAVAN branding, project, period, prepared-by and generation time. Filters for project, contractor, person, location, status and dates. Gujarati and Hindi text is rendered in PDFs |
| 18 | Reporting structure | Admins can edit who reports to whom, by person, role or department, per project or globally. Initial setup: Purchase and Accounts report to **Anushka**, and Anushka reports to the Director. The **Consolidated Summary** page shows per-project status, missing reports, decisions needing attention and escalations |
| 19 | Offline & security | IndexedDB offline queue for reports, attendance, material requests and photos. A pending-upload badge and sync screen, automatic sync when back online, and server **idempotency by client UUID**, so there are no duplicates. scrypt password hashing, session tokens, a login rate limit, forced change of temporary passwords, deactivation (ends sessions), audit log, backups, full JSON export, restricted financial data |
| 20 | Acceptance | `npm test` runs the 9 required workflows end-to-end against a real server and a temporary database |

---

## 3. Architecture

```
gavan-site/
  server/
    index.js          Express app, static hosting, boot
    db.js             SQLite schema + helpers (node:sqlite)
    auth.js           roles, permission matrix, sessions, project scoping
    notify.js         in-app + email / WhatsApp / push delivery with logging
    scheduler.js      reminders & escalations (every 5 min, de-duplicated)
    seed.js           live initial setup + removable sample data
    routes/           core, files, site (reports/labour/plans), tasks,
                      drawings (+quality), materials (+contractors), comm, dashboard (+PDF/Excel)
    fonts/            DejaVu + Noto Gujarati/Devanagari for PDFs
  public/             PWA: index.html, css/, js/core.js, js/app.js, js/views/*, sw.js
  test/               end-to-end workflow tests
```

* There is no frontend build step: plain JS modules served statically, and a service worker caches the app shell for offline use.
* All authorisation is checked server-side. The UI only hides what the server would refuse anyway.

### Database structure

| Table | Purpose |
|---|---|
| `companies`, `settings` | company, permission matrix, integrations, escalation, branding |
| `users`, `sessions` | accounts (role, department, contractor link, active), login sessions |
| `projects`, `project_members`, `locations` | projects, team assignment, Building → Floor → Unit tree |
| `work_items` | planned qty × weight per item, used to calculate progress |
| `contractors`, `project_contractors`, `contractor_bills` | profiles, work orders/rates per project, bills & payments |
| `daily_reports`, `report_edits` | morning/evening reports (JSON data, version), correction history |
| `attendance`, `plans` | labour attendance, daily/weekly targets |
| `tasks`, `task_history`, `comments` | tasks, status transitions, comments for all entities |
| `drawing_requests`, `drawings`, `drawing_revisions` | request workflow, register, revisions & approval |
| `checklist_templates`, `inspections` | QC checklists, inspections with rework/reinspection/sign-off |
| `material_requests`, `purchase_orders`, `deliveries`, `stock_ledger`, `transfers` | purchase workflow & stock |
| `folders`, `files` | folders with role restrictions; files (documents & live photos, GPS, versions) |
| `chats`, `chat_members`, `messages`, `meetings` | communication |
| `notifications`, `notification_deliveries`, `push_subscriptions` | in-app notices & external delivery log |
| `reporting_lines`, `audit_log` | reporting structure, audit history |

---

## 4. Setting up external services (Admin → Integrations)

| Service | What you need | Until it is configured |
|---|---|---|
| Web push | Click **Generate keys & enable**. Each user then taps **Enable push** in My Profile (HTTPS required) | Delivery log shows `not_configured` |
| Email | SMTP host, port, user, password, from-address (e.g. Gmail app password, Zoho, SES) | `not_configured` |
| WhatsApp | Meta WhatsApp Business **Cloud API** phone-number ID, a permanent token and an **approved template** with one body variable | `not_configured`. A successful API call is logged as `accepted_by_provider` (Meta accepted it), not as "delivered to the phone" |
| Video calling | Provider credentials | Meetings use pasted Google Meet, Zoom or Teams links, and the page says so |

Use **Send test notification to me**, then open the **Delivery log** to check each channel.

---

## 5. Known limitations (honest list)

* **Integrated voice/video calling is not built.** You can store provider credentials, but meetings use external meeting links.
* **WhatsApp delivery receipts** (delivered/read webhooks) are not processed. The log shows the provider's acceptance only.
* **Offline support** covers morning/evening reports, attendance, material requests and their photos. Other actions (task approvals, drawing uploads, chat) need a connection and show a clear "No internet connection" error. A project's locations and contractors must have been loaded online once for a full offline form. Otherwise the form still works with fewer dropdowns.
* **DWG/DXF** files are stored, versioned and downloadable, but they are not previewed in the browser.
* **PDF shaping of complex Gujarati/Hindi conjuncts** may be slightly imperfect in some words (PDF library limitation). Excel exports and the app UI render them correctly.
* GPS and camera data come from the user's device. **They support a record but cannot by themselves prove authenticity.** Device clocks can be wrong, which is why the server upload time is stored separately.
* SQLite suits a single server for a company of this size (hundreds of users). Moving to PostgreSQL would be needed for multi-server scaling.
* UI translations cover navigation, forms and common labels. Admin screens and some longer help texts are in English.
* The progress percentage depends on work items being defined for each project. Projects without work items show "—" and a prompt to add them.
