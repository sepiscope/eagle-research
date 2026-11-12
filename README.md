# EagleResearch · Boston College Research Opportunities Portal

**EagleResearch** is a specialized one-stop research directory designed specifically for Boston College undergraduates and graduate students to discover faculty research labs, verify current opening statuses, cross-reference research activity via ORCID, and prepare outreach materials.

---

## 🌟 Key Features

### 1. ORCID Registry Cross-Referencing & Emailing Guardrail (NEW)
To ensure students do not waste time cold emailing professors who have stopped conducting active laboratory research (e.g., transitioned entirely into university administration, teaching-only appointments, or retirement):
* **Cross-Referenced with Global ORCID:** Every faculty member is linked to their persistent 16-digit ORCID identifier (`https://orcid.org/0000-...`).
* **Active vs. Inactive Research Detection:**
  * 🟢 **ORCID Active:** Professors with peer-reviewed publications and grant activities in 2025–2026 are verified as active researchers.
  * 🚫 **ORCID Inactive / Ceased:** If ORCID records show zero publications or active grants in 3+ years, the professor is flagged as **Research Inactive**.
* **Cold Email Safeguard:** For inactive professors, the **Draft Email button is safely blocked and locked** (`Emailing Blocked (Inactive)`), displaying a warning modal that explains the professor's transition away from active lab research.
* **ORCID Inspector:** Click any ORCID badge to view the professor's verified publication count, most recent paper citation, journal name, and direct link to their ORCID profile.

---

### 2. Faculty Staleness Sentinel
* **Semester Staleness Rule:** For the ongoing **Fall 2026** academic term, any professor who advertises research positions on their website but has **not updated their information since last semester** (Spring 2026 or earlier) is prominently flagged with `⚠️ Flagged: Stale Listing`.
* **Staleness Audit Inspector:** A dedicated modal displaying the exact date of the last detected update, quoting the expired semester snippet, and comparing the `bc.edu` profile against their personal lab site.

---

### 2b. Undergraduate Opportunity Signals (verified November 2026)
Each label is backed by a quoted snippet and a source link (an archived copy when the page is gone):
* **Actively Recruiting:** the lab's website currently says it has undergraduate openings.
* **Invites Undergrads:** the lab's website has a standing invitation or application for undergrads, but no specific current opening.
* **Has Taken Undergrads:** current or past undergrad lab members are listed on the lab website, now or in an Internet Archive copy. Nothing is posted now, but it's worth emailing.
* **Lab Full:** the lab's website says it isn't taking undergrads right now.
* **No Posted Openings:** the professor is research-active, but no undergraduate evidence was found. Most of these have no lab website to check.

### 2d. Verified Pay Filter
* "Paid Positions" shows only professors with real evidence. There are three kinds: the lab's own site says the role is paid ("Paid (lab says)"), the lab has had paid Undergraduate Research Fellows ("Has had paid fellows"), or the department says its positions are paid ("Paid (department policy)": Physics and Economics). Every badge links to its source.
* The old class-year ("Freshmen Welcome"/"Level") filters were removed because their data was never verified.

### 2c. Department Research Notes
* When you pick a department (or a single-department school like Nursing or Lynch), a note at the top explains how undergraduate research works there: how to get started, credit and pay options, timing, honors and thesis tracks, and who to contact.
* Every professor card has a "How undergrad research works in …" link that opens the same note, so it's one click away when you're browsing all departments.
* Each note also covers the BC-wide basics: most positions aren't posted, and for Undergraduate Research Fellowships (URF) the *professor* requests the funding.
* Notes live in `js/dept-notes.js`. Every fact cites its BC source page (checked November 2026).

---

### 3. Multi-Department Coverage (400 Faculty Profiles)
Indexed across major Boston College academic departments:
* **Computer Science** (245 Beacon St, Fulton Hall, St. Mary's)
* **Biology** (Higgins Hall)
* **Psychology & Neuroscience** (McGuinn Hall)
* **Physics** (Higgins Hall)
* **Chemistry** (Merkert Chemistry Center)
* **Engineering** (Human-Centered Engineering, 245 Beacon St)
* **Earth & Environmental Sciences** (Devlin Hall)
* **Economics & Carroll School of Management** (Maloney Hall, Fulton Hall)

---

### 4. Cold Email Draft Assistant (Manual Send Only)
* Drafts a respectful, customized cold email tailored to each professor's verified ORCID publications and required qualifications.
* **Smart Staleness Adaptation:** Automatically shifts tone into a polite inquiry when contacting professors with stale listings.
* **Manual Review Only:** Drafts are displayed on-screen with **Copy Draft** and **Open in Mail Client** options so you have full control.

---

### 5. BC-Only Access, Saved Labs & Accounts
* **Anyone** can browse, search, and filter professors and read research summaries, badges, and evidence.
* **Signed-in BC students only** (one-time link to a @bc.edu email): professor emails, phones, offices, profile/lab/ORCID links, application instructions, the Apply/Contact flow, and the saved-labs tracker (favorites, statuses, private notes, synced across devices).
* Contact details are **not** in the public files. They live in a protected Supabase table and load only after sign-in.
* Setup: see **SETUP-ACCOUNTS.md**. Until it's configured, browsing works but contact details and saving are locked.
---

### 6. Boston College Student Funding & Academic Credit Guide
* Information on BC **URAP** (Undergraduate Research Assistant Program, offering up to $2,000/semester).
* Course credit codes for research (`CSCI 3390`, `BIOL 4901`, `PSYC 4901`, `CHEM 4901`, `PHYS 4901`, `ENGR 3390`, `EESC 4901`, `ECON 3390`).
* Schiller Institute for Integrated Science and Society student grants.

---

## 📂 Project Architecture

```
eagle-research/
├── index.html              # Main application page (accessible in any browser)
├── css/
│   ├── styles.css          # Boston College Maroon & Gold aesthetic, ORCID styling
│   └── components.css      # Modals, audit timeline, email preview, cards
├── js/
│   ├── data.js             # 412 research-active BC faculty (public fields only; no contact details)
│   ├── config.js           # Supabase keys (blank = accounts off)
│   ├── auth.js             # @bc.edu email-link sign-in + access gate
│   ├── contacts.js         # Loads protected faculty contact details after sign-in
│   ├── tracker.js          # Saved labs, favorites, statuses, notes (account or browser)
│   ├── dept-notes.js       # Per-department undergraduate research notes
│   ├── email-generator.js  # Apply / contact pop-up
│   ├── audit-view.js       # Research-activity (ORCID / OpenAlex) inspector
│   └── app.js              # Search, multi-criteria filters, and rendering logic
├── supabase/schema.sql     # Database tables + privacy rules (saved labs, faculty contacts)
├── private/                # NOT for upload: faculty contact data (faculty_contacts.sql)
├── SETUP-ACCOUNTS.md       # Step-by-step: Supabase + GitHub Pages
├── serve.ps1               # Local preview server (Windows PowerShell, no installs)
├── start.bat               # Double-click launcher for serve.ps1
└── validate.js             # Automated data integrity and syntax test suite
```

---

## 🚀 Running It

**Live site:** https://sepiscope.github.io/eagle-research/

**On your own computer:** double-click `start.bat` (runs `serve.ps1`), then visit `http://localhost:3000`. Browsing works by opening `index.html` directly too, but @bc.edu sign-in needs the local server address.
