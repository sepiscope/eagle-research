/**
 * Boston College Research Opportunities Portal - Main Application Logic
 * Integrates verified undergraduate-opportunity evidence, ORCID/OpenAlex activity checks, department notes, and direct application links.
 */

// Application State
const AppState = {
  selectedSchool: "all",
  selectedDept: "all",
  searchQuery: "",
  statusFilter: "all", // all | recruiting | inquire | full | future
  compensationFilter: "all", // all | paid (verified pay evidence only)
  orcidFilter: "all", // all | active | inactive
  verifiedOnly: false,
  mentoredOnly: false,
  page: 1,
  sortBy: "opportunity" // opportunity | name | orcidWorks
};

// ---- Shareable search links ---------------------------------------------------
// The current search/filters live in the address (e.g. ?school=mcas-sci&dept=biology&pay=paid),
// so copying the link shares exactly these results. Only known values are accepted.
const URL_KEYS = { school: "selectedSchool", dept: "selectedDept", q: "searchQuery", status: "statusFilter", orcid: "orcidFilter", pay: "compensationFilter", sort: "sortBy" };
const URL_ALLOWED = {
  status: ["recruiting", "inquire", "full"], orcid: ["active", "inactive"], pay: ["paid"], sort: ["opportunity", "name", "orcidWorks"]
};

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  const school = params.get("school");
  if (school && BC_SCHOOLS.some(s => s.id === school)) AppState.selectedSchool = school;
  const dept = params.get("dept");
  const deptObj = dept && BC_DEPARTMENTS.find(d => d.id === dept && d.id !== "all");
  if (deptObj) { AppState.selectedDept = deptObj.id; AppState.selectedSchool = deptObj.schoolId; }
  const q = params.get("q");
  if (q) AppState.searchQuery = q.toLowerCase().trim().slice(0, 100);
  ["status", "orcid", "pay", "sort"].forEach(k => {
    const v = params.get(k);
    if (v && URL_ALLOWED[k].includes(v)) AppState[URL_KEYS[k]] = v;
  });
  if (params.get("undergrads") === "1") AppState.mentoredOnly = true;
  const page = parseInt(params.get("page"), 10);
  if (page > 1) AppState.page = page;
  const input = document.getElementById("searchInput");
  if (input && AppState.searchQuery) input.value = AppState.searchQuery;
  const sortSel = document.getElementById("sortSelect");
  if (sortSel) sortSel.value = AppState.sortBy;
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (AppState.selectedSchool !== "all") params.set("school", AppState.selectedSchool);
  if (AppState.selectedDept !== "all") params.set("dept", AppState.selectedDept);
  if (AppState.searchQuery) params.set("q", AppState.searchQuery);
  if (AppState.statusFilter !== "all") params.set("status", AppState.statusFilter);
  if (AppState.orcidFilter !== "all") params.set("orcid", AppState.orcidFilter);
  if (AppState.compensationFilter !== "all") params.set("pay", AppState.compensationFilter);
  if (AppState.mentoredOnly) params.set("undergrads", "1");
  if (AppState.sortBy !== "opportunity") params.set("sort", AppState.sortBy);
  if (AppState.page > 1) params.set("page", String(AppState.page));
  const qs = params.toString();
  const url = location.pathname + (qs ? "?" + qs : "") + location.hash;
  if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, "", url);
}

// ---- "Report a problem" links (mailto to config.contactEmail; hidden if none is set) ----
function reportMailto(kind, prof) {
  const to = ((window.BC_RESEARCH_CONFIG || {}).contactEmail || "").trim();
  if (!to) return "";
  const page = location.origin + location.pathname;
  let subject, body;
  if (kind === "listing" && prof) {
    subject = `EagleResearch: problem with ${prof.name}'s listing`;
    body = `Listing: ${prof.name} (${prof.department})\nListing ID: ${prof.id}\n\nWhat's wrong or out of date?\n\n`;
  } else if (kind === "delete") {
    subject = "EagleResearch: please delete my account";
    body = "Please delete my EagleResearch account and saved labs. (Send this from the @bc.edu address you sign in with.)\n";
  } else {
    subject = "EagleResearch: problem report";
    body = `Page: ${page}\n\nWhat happened? (What did you click, and what did you expect?)\n\nDevice/browser:\n`;
  }
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function setupReportLinks() {
  const popup = typeof Report !== "undefined" && Report.enabled();   // pop-up form (js/report.js)
  document.querySelectorAll(".report-link").forEach(a => {
    const href = popup ? "#" : reportMailto(a.dataset.report);
    if (href) { a.href = href; a.classList.remove("d-none"); if (popup) a.setAttribute("role", "button"); }
    else if (a.dataset.report === "delete") { a.replaceWith(document.createTextNode("contact the site owner")); }
    else { a.classList.add("d-none"); }
  });
}

function shareResultsLink() {
  const url = location.origin + location.pathname + location.search;
  const done = () => showToast("Link copied. Anyone who opens it sees these same results.", "success");
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(done, () => window.prompt("Copy this link:", url));
  } else {
    window.prompt("Copy this link:", url);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  readStateFromUrl();
  renderSchoolPills();
  renderDepartmentPills();
  updateStatisticsDashboard();
  syncFilterControls();
  renderFacultyList(true);   // keep the page number from a shared link
  setupEventListeners();
  setupReportLinks();
  ApplicationTracker.init();
  Auth.init();
  setupNavHighlight();
});

// ---- Top navigation: highlight the tab for the section you're on ---------
function setActiveNav(link) {
  document.querySelectorAll(".bc-navbar .nav-link[href^='#']").forEach(a => {
    const on = a === link;
    a.classList.toggle("active", on);
    a.classList.toggle("text-white-50", !on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

function setupNavHighlight() {
  const links = [...document.querySelectorAll(".bc-navbar .nav-link[href^='#']")];
  const sections = links.map(a => ({ link: a, el: document.querySelector(a.getAttribute("href")) })).filter(x => x.el);
  if (!sections.length) return;
  let clickLockUntil = 0;

  links.forEach(a => a.addEventListener("click", () => {
    setActiveNav(a);
    clickLockUntil = Date.now() + 900;   // let the jump finish before scroll tracking takes over again
    const menu = document.getElementById("mainNavbar");   // close the mobile menu after a tap
    if (menu && menu.classList.contains("show") && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(menu).hide();
  }));

  const onScroll = () => {
    if (Date.now() < clickLockUntil || document.body.classList.contains("view-saved")) return;
    const navH = (document.querySelector(".bc-navbar")?.offsetHeight || 0) + 24;
    let current = sections[0];
    for (const s of sections) { if (s.el.getBoundingClientRect().top - navH <= 0) current = s; }
    // at the very bottom of the page, the last section wins even if it's short
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
    if (!current.link.classList.contains("active")) setActiveNav(current.link);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  // "My Saved Labs" is a separate page at #saved; every other link returns to the main page
  window.addEventListener("hashchange", () => showView(true));
  showView(false);
  onScroll();
}

function showView(fromNavigation) {
  const saved = location.hash === "#saved";
  const wasSaved = document.body.classList.contains("view-saved");
  showView.baseTitle = showView.baseTitle || document.title;
  document.body.classList.toggle("view-saved", saved);
  document.title = saved ? "My Saved Labs | " + showView.baseTitle : showView.baseTitle;
  if (saved) {
    setActiveNav(document.getElementById("navTracker"));
    window.scrollTo(0, 0);
  } else if (wasSaved || fromNavigation) {
    // the target section was hidden when the browser tried to jump to it, so jump now
    let target = null;
    try { target = /^#[\w-]+$/.test(location.hash) ? document.querySelector(location.hash) : null; } catch (e) { /* not a section link */ }
    if (target) target.scrollIntoView();
    else if (wasSaved) window.scrollTo(0, 0);
    window.dispatchEvent(new Event("scroll"));   // re-sync the highlighted nav tab
  }
}

// Setup DOM event listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      AppState.searchQuery = e.target.value.toLowerCase().trim();
      renderFacultyList();
    });
  }

  // Clear search
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      AppState.searchQuery = "";
      renderFacultyList();
    });
  }

  // Status Filter
  const statusSelect = document.getElementById("statusFilterSelect");
  if (statusSelect) {
    statusSelect.addEventListener("change", (e) => {
      AppState.statusFilter = e.target.value;
      syncFilterControls();
      renderFacultyList();
    });
  }

  // ORCID Filter
  const orcidSelect = document.getElementById("orcidFilterSelect");
  if (orcidSelect) {
    orcidSelect.addEventListener("change", (e) => {
      AppState.orcidFilter = e.target.value;
      syncFilterControls();
      renderFacultyList();
    });
  }

  // Compensation Filter
  const compSelect = document.getElementById("compFilterSelect");
  if (compSelect) {
    compSelect.addEventListener("change", (e) => {
      AppState.compensationFilter = e.target.value;
      syncFilterControls();
      renderFacultyList();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      AppState.sortBy = e.target.value;
      renderFacultyList();
    });
  }

  // Reset all filters
  const resetBtn = document.getElementById("resetFiltersBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllFilters);
  }

  // Ensure only one lab details dropdown is open at any time
  const facultyListContainer = document.getElementById("facultyListContainer");
  if (facultyListContainer) {
    facultyListContainer.addEventListener("show.bs.collapse", (e) => {
      const openCollapses = facultyListContainer.querySelectorAll(".collapse.show");
      openCollapses.forEach(collapseEl => {
        if (collapseEl !== e.target) {
          const bsCollapse = bootstrap.Collapse.getInstance(collapseEl) || new bootstrap.Collapse(collapseEl, { toggle: false });
          bsCollapse.hide();
        }
      });
    });
  }
}

// Reset all filters
function resetAllFilters() {
  AppState.selectedSchool = "all";
  AppState.selectedDept = "all";
  AppState.searchQuery = "";
  AppState.statusFilter = "all";
  AppState.compensationFilter = "all";
  AppState.orcidFilter = "all";
  AppState.verifiedOnly = false;
  AppState.mentoredOnly = false;
  AppState.sortBy = "opportunity";

  document.getElementById("searchInput").value = "";
  document.getElementById("statusFilterSelect").value = "all";
  document.getElementById("compFilterSelect").value = "all";
  const orcidSelect = document.getElementById("orcidFilterSelect");
  if (orcidSelect) orcidSelect.value = "all";
  document.getElementById("sortSelect").value = "opportunity";

  syncFilterControls();

  renderSchoolPills();
  renderDepartmentPills();
  renderFacultyList();
  showToast("All filters reset", "info");
}

// Quick filters: toggles that combine (e.g. ORCID Active + Paid Positions shows only professors who are both).
// "Actively Recruiting" and "No Posted Openings" are opposites, so turning one on turns the other off.
// forceOn: turn the filter on even if it's already on (used by links elsewhere on the page)
const QUICK_FILTERS = {
  orcidActive: { id: "qfOrcidActive", isOn: () => AppState.orcidFilter === "active",      set: on => { AppState.orcidFilter = on ? "active" : "all"; } },
  recruiting:  { id: "qfRecruiting",  isOn: () => AppState.statusFilter === "recruiting", set: on => { AppState.statusFilter = on ? "recruiting" : "all"; } },
  mentored:    { id: "qfMentored",    isOn: () => AppState.mentoredOnly,                  set: on => { AppState.mentoredOnly = on; } },
  inquire:     { id: "qfInquire",     isOn: () => AppState.statusFilter === "inquire",    set: on => { AppState.statusFilter = on ? "inquire" : "all"; } },
  paid:        { id: "qfPaid",        isOn: () => AppState.compensationFilter === "paid", set: on => { AppState.compensationFilter = on ? "paid" : "all"; } }
};

function applyQuickFilter(type, forceOn) {
  if (type === "all") {
    Object.values(QUICK_FILTERS).forEach(f => f.set(false));
    AppState.verifiedOnly = false;
  } else if (QUICK_FILTERS[type]) {
    const f = QUICK_FILTERS[type];
    f.set(forceOn ? true : !f.isOn());
  }
  syncFilterControls();
  renderFacultyList();
}

// Keep the quick-filter pills and the dropdowns showing exactly what is applied
function syncFilterControls() {
  let anyOn = false;
  Object.values(QUICK_FILTERS).forEach(f => {
    const on = f.isOn();
    anyOn = anyOn || on;
    const btn = document.getElementById(f.id);
    if (btn) { btn.classList.toggle("active", on); btn.setAttribute("aria-pressed", String(on)); }
  });
  // "All Listings" is lit only when no status/ORCID/pay/undergrad filter is applied
  const allOn = !anyOn && AppState.statusFilter === "all" && AppState.orcidFilter === "all" && AppState.compensationFilter === "all";
  const allBtn = document.getElementById("qfAll");
  if (allBtn) { allBtn.classList.toggle("active", allOn); allBtn.setAttribute("aria-pressed", String(allOn)); }

  const statusSelect = document.getElementById("statusFilterSelect");
  if (statusSelect) statusSelect.value = AppState.statusFilter;
  const orcidSelect = document.getElementById("orcidFilterSelect");
  if (orcidSelect) orcidSelect.value = AppState.orcidFilter;
  const compSelect = document.getElementById("compFilterSelect");
  if (compSelect) compSelect.value = AppState.compensationFilter;
}


// Render School Dropdown (breadcrumb step 1)
function renderSchoolPills() {
  const select = document.getElementById("schoolFilterSelect");
  if (!select) return;

  let html = "";
  BC_SCHOOLS.forEach(school => {
    const count = school.id === "all"
      ? BC_FACULTY_DATA.length
      : BC_FACULTY_DATA.filter(f => f.school === school.id).length;
    const label = school.id === "all" ? `${school.name} (${count})` : `${school.name}  ·  ${count}`;
    html += `<option value="${school.id}" ${AppState.selectedSchool === school.id ? "selected" : ""}>${label}</option>`;
  });
  select.innerHTML = html;
  updateBreadcrumbDeptDropdown();
  updateBreadcrumbTrail();
}

function selectSchoolFromDropdown(schoolId) {
  AppState.selectedSchool = schoolId;
  AppState.selectedDept = "all";
  updateBreadcrumbDeptDropdown();
  updateBreadcrumbTrail();
  renderFacultyList();
}

// Render Department Dropdown (breadcrumb step 2)
function updateBreadcrumbDeptDropdown() {
  const arrow = document.getElementById("breadcrumbArrow");
  const wrapper = document.getElementById("breadcrumbDeptWrapper");
  const deptSelect = document.getElementById("deptFilterSelect");
  if (!arrow || !wrapper || !deptSelect) return;

  // Filter depts to those belonging to selected school
  const depts = BC_DEPARTMENTS.filter(d =>
    d.id === "all" || AppState.selectedSchool === "all" || d.schoolId === AppState.selectedSchool
  );

  // Only show dept dropdown if a specific school is chosen and it has multiple depts
  const showDept = AppState.selectedSchool !== "all" && depts.length > 2; // "all" + at least 2 real depts
  arrow.classList.toggle("d-none", !showDept);
  wrapper.classList.toggle("d-none", !showDept);

  if (!showDept) {
    AppState.selectedDept = "all";
    return;
  }

  let html = "";
  depts.forEach(dept => {
    const count = dept.id === "all"
      ? BC_FACULTY_DATA.filter(f => f.school === AppState.selectedSchool).length
      : BC_FACULTY_DATA.filter(f => f.departmentId === dept.id).length;
    const label = dept.id === "all" ? `All Departments (${count})` : `${dept.name}  ·  ${count}`;
    html += `<option value="${dept.id}" ${AppState.selectedDept === dept.id ? "selected" : ""}>${label}</option>`;
  });
  deptSelect.innerHTML = html;
}

function selectDeptFromDropdown(deptId) {
  AppState.selectedDept = deptId;
  updateBreadcrumbTrail();
  renderFacultyList();
}

// Update the active breadcrumb trail display
function updateBreadcrumbTrail() {
  const trail = document.getElementById("breadcrumbTrail");
  if (!trail) return;

  if (AppState.selectedSchool === "all" && AppState.selectedDept === "all") {
    trail.innerHTML = "";
    return;
  }

  const school = BC_SCHOOLS.find(s => s.id === AppState.selectedSchool);
  const dept = BC_DEPARTMENTS.find(d => d.id === AppState.selectedDept);

  let crumbs = "";
  if (school && school.id !== "all") {
    crumbs += `<span class="badge bg-maroon text-white me-1 rounded-pill px-2">
      <i class="bi ${school.icon} me-1"></i>${school.name}
    </span>`;
  }
  if (dept && dept.id !== "all") {
    crumbs += `<i class="bi bi-chevron-right text-muted small me-1"></i>
    <span class="badge bg-gold-light text-dark border me-1 rounded-pill px-2">${dept.name}</span>`;
  }
  crumbs += `<button class="btn btn-sm btn-link text-muted p-0 ms-1 small" onclick="resetSchoolDeptFilter()" title="Clear school/dept filter">
    <i class="bi bi-x-circle"></i>
  </button>`;
  trail.innerHTML = crumbs;
}

// Reset only the school/dept portion
function resetSchoolDeptFilter() {
  AppState.selectedSchool = "all";
  AppState.selectedDept = "all";
  renderSchoolPills();
  renderFacultyList();
}

// Render Department Navigation Pills (kept for internal use by selectSchool only)
function renderDepartmentPills() {
  // no-op: replaced by breadcrumb dropdown — kept so existing callers don't throw
}

function selectDepartment(deptId) {
  AppState.selectedDept = deptId;
  updateBreadcrumbTrail();
  renderFacultyList();
}

// Pay badge wording: never claim more than the evidence says
function payLabel(pay) {
  if (!pay) return "";
  if (pay.scope === "department") return "Paid (department policy)";
  if (pay.scope === "lab-past") return "Has had paid fellows";
  return "Paid (lab says)";
}

// ---- Department notes ----------------------------------------------------
function deptNoteBodyHtml(deptId) {
  const note = (typeof BC_DEPT_NOTES !== "undefined") ? BC_DEPT_NOTES[deptId] : null;
  const general = (typeof BC_RESEARCH_GENERAL !== "undefined") ? BC_RESEARCH_GENERAL : null;
  const list = pts => `<ul class="small mb-2 ps-3">${pts.map(p => `<li class="mb-1">${p}</li>`).join("")}</ul>`;
  const srcs = s => (s || []).map(x => `<a href="${x.url}" target="_blank" rel="noopener noreferrer">${x.label}</a>`).join(" · ");
  let html = "";
  if (note) {
    html += list(note.points);
    if (note.contact) html += `<div class="small mb-1"><i class="bi bi-person-lines-fill me-1 text-maroon"></i><strong>Contact:</strong> ${note.contact}</div>`;
    else if (!canSeeContacts()) html += `<div class="small mb-1">${signInPromptHtml("department contacts")}</div>`;
    html += `<div class="small text-muted mb-3"><i class="bi bi-link-45deg me-1"></i>Source: ${srcs(note.sources)}</div>`;
  }
  if (general) {
    html += `<div class="border-top pt-2"><div class="fw-semibold small mb-1">${general.title}</div>${list(general.points)}
      <div class="small text-muted"><i class="bi bi-link-45deg me-1"></i>Source: ${srcs(general.sources)}</div></div>`;
  }
  return html;
}

function renderDeptNoteBanner() {
  const el = document.getElementById("deptNoteBanner");
  if (!el) return;
  let dept = BC_DEPARTMENTS.find(d => d.id === AppState.selectedDept && d.id !== "all");
  if (!dept && AppState.selectedSchool !== "all") {
    // Single-department schools (STM, CSON, Lynch, Carroll) have no department dropdown
    const inSchool = BC_DEPARTMENTS.filter(d => d.id !== "all" && d.schoolId === AppState.selectedSchool);
    if (inSchool.length === 1) dept = inSchool[0];
  }
  if (!dept || typeof BC_DEPT_NOTES === "undefined" || !BC_DEPT_NOTES[dept.id]) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <div class="card border-gold mb-3 shadow-sm">
      <div class="card-body py-3">
        <div class="d-flex justify-content-between align-items-start">
          <h3 class="h6 fw-bold text-maroon mb-2"><i class="bi ${dept.icon} me-1"></i> Undergraduate research in ${dept.name}</h3>
          <button class="btn btn-sm btn-link text-muted p-0" type="button" data-bs-toggle="collapse" data-bs-target="#deptNoteBannerBody" aria-expanded="true">
            <i class="bi bi-chevron-up"></i>
          </button>
        </div>
        <div class="collapse show" id="deptNoteBannerBody">${deptNoteBodyHtml(dept.id)}</div>
      </div>
    </div>`;
}

function openDeptNote(deptId) {
  const dept = BC_DEPARTMENTS.find(d => d.id === deptId);
  if (!dept) return;
  document.getElementById("deptNoteModalTitle").textContent = `Undergraduate research in ${dept.name}`;
  document.getElementById("deptNoteModalBody").innerHTML = deptNoteBodyHtml(deptId);
  const modalEl = document.getElementById("deptNoteModal");
  document.getElementById("deptNoteModalFilterBtn").onclick = () => {
    bootstrap.Modal.getInstance(modalEl)?.hide();
    AppState.selectedSchool = dept.schoolId;
    AppState.selectedDept = dept.id;
    renderSchoolPills();
    updateBreadcrumbTrail();
    renderFacultyList();
    document.getElementById("deptNoteBanner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// Update Top Statistics
function updateStatisticsDashboard() {
  const stats = getBCStats();

  // Same rule as the "Has Taken Undergrads" quick filter
  const mentoredEl = document.getElementById("statMentoredCount");
  if (mentoredEl) mentoredEl.textContent = BC_FACULTY_DATA.filter(p =>
    p.status === "recruiting" || (p.undergradHistory && p.undergradHistory.hasMentored)).length;

  // Same rule as the "Paid Positions" filter
  const paidEl = document.getElementById("statPaidCount");
  if (paidEl) paidEl.textContent = BC_FACULTY_DATA.filter(p => p.pay && p.pay.paid).length;

  const recruitingEl = document.getElementById("statRecruitingCount");
  if (recruitingEl) recruitingEl.textContent = stats.recruiting;

  const deptEl = document.getElementById("statDeptCount");
  if (deptEl) deptEl.textContent = stats.departments;
  
  const orcidActiveCountEl = document.getElementById("statOrcidActiveCount");
  if (orcidActiveCountEl) {
    orcidActiveCountEl.textContent = stats.orcidActive;
  }
}

// Filter and Sort Data
function getFilteredFaculty() {
  return BC_FACULTY_DATA.filter(prof => {
    // School filter
    if (AppState.selectedSchool !== "all" && prof.school !== AppState.selectedSchool) {
      return false;
    }

    // Department filter
    if (AppState.selectedDept !== "all" && prof.departmentId !== AppState.selectedDept) {
      return false;
    }

    // Status filter
    if (AppState.statusFilter !== "all" && prof.status !== AppState.statusFilter) {
      return false;
    }

    // ORCID filter
    if (AppState.orcidFilter !== "all") {
      if (AppState.orcidFilter === "active" && (!prof.orcid || !prof.orcid.researchActive)) {
        return false;
      }
      if (AppState.orcidFilter === "inactive" && (prof.orcid && prof.orcid.researchActive)) {
        return false;
      }
    }

    // Has-mentored-undergrads filter (current posting OR past evidence)
    if (AppState.mentoredOnly && prof.status !== "recruiting" && !(prof.undergradHistory && prof.undergradHistory.hasMentored)) {
      return false;
    }

    // Quick verified filter
    if (AppState.verifiedOnly && prof.status !== "recruiting" && prof.status !== "inquire") {
      return false;
    }

    // Pay filter: only verified evidence (lab website or explicit department policy)
    if (AppState.compensationFilter === "paid" && !(prof.pay && prof.pay.paid)) {
      return false;
    }

    // Text Search query
    if (AppState.searchQuery) {
      const query = AppState.searchQuery;
      const matchName = prof.name.toLowerCase().includes(query);
      const matchDept = prof.department.toLowerCase().includes(query);
      const matchLab = prof.labName.toLowerCase().includes(query);
      const matchSummary = prof.researchSummary.toLowerCase().includes(query);
      const matchSkills = (prof.requiredSkills || []).some(s => s.toLowerCase().includes(query)) ||
                          (prof.preferredSkills || []).some(s => s.toLowerCase().includes(query));
      const matchProjects = (prof.currentProjects || []).some(p => p.toLowerCase().includes(query));
      const matchBuilding = (prof.building || "").toLowerCase().includes(query);
      const matchOrcid = (prof.orcid && prof.orcid.id) ? prof.orcid.id.includes(query) : false;
      const matchSchool = (prof.school || "").toLowerCase().includes(query);

      if (!matchName && !matchDept && !matchLab && !matchSummary && !matchSkills && !matchProjects && !matchBuilding && !matchOrcid && !matchSchool) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (AppState.sortBy === "name") {
      return compareByLastName(a, b);
    } else if (AppState.sortBy === "orcidWorks") {
      return (b.orcid?.totalWorks || 0) - (a.orcid?.totalWorks || 0) || compareByLastName(a, b);
    } else {
      // Default: best opportunities first, then A-Z by last name within each group
      return opportunityRank(a) - opportunityRank(b) || compareByLastName(a, b);
    }
  });
}

// 0 = posted openings, 1 = has taken undergrads, 2 = verified pay, 3 = lab says it's full right now, 4 = everyone else
function opportunityRank(p) {
  if (p.status === "recruiting") return 0;
  if (p.status === "full") return 3;
  if (p.undergradHistory && p.undergradHistory.hasMentored) return 1;
  if (p.pay && p.pay.paid) return 2;
  return 4;
}

// Sort key "Last, First": ignores "Dr." and suffixes like "S.J." / "Jr." / "III"
function lastNameKey(p) {
  if (!p._sortKey) {
    const parts = String(p.name || "").replace(/^((dr|prof|professor|rev|fr)\.?\s+)+/i, "").replace(/,.*$/, "").trim().split(/\s+/);
    while (parts.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv|s\.?j\.?)$/i.test(parts[parts.length - 1])) parts.pop();
    const last = parts.pop() || "";
    p._sortKey = last + ", " + parts.join(" ");
  }
  return p._sortKey;
}
function compareByLastName(a, b) {
  return lastNameKey(a).localeCompare(lastNameKey(b), "en", { sensitivity: "base" });
}

// Render Faculty Cards
// ---- Pagination ------------------------------------------------------------
const PAGE_SIZE = 30;

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Wraps around: Previous on page 1 goes to the last page, Next on the last page goes to page 1
  const prev = AppState.page <= 1 ? pages : AppState.page - 1;
  const next = AppState.page >= pages ? 1 : AppState.page + 1;
  const html = pages <= 1 ? "" : `
    <div class="d-flex justify-content-center align-items-center gap-2 flex-wrap">
      <button type="button" class="btn btn-outline-maroon btn-sm page-btn" onclick="goToPage(${prev})" aria-label="Previous page (page ${prev})">
        <i class="bi bi-chevron-left me-1"></i>Previous
      </button>
      <span class="small text-muted px-2" aria-live="polite">Page <strong>${AppState.page}</strong> of ${pages}</span>
      <button type="button" class="btn btn-outline-maroon btn-sm page-btn" onclick="goToPage(${next})" aria-label="Next page (page ${next})">
        Next<i class="bi bi-chevron-right ms-1"></i>
      </button>
    </div>`;
  ["paginationTop", "paginationBottom"].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
}

function goToPage(page) {
  AppState.page = page;
  renderFacultyList(true);
  // Land just above the results header so "N opportunities found" and the top
  // Previous/Next controls are both visible below the sticky navbar.
  const header = document.getElementById("resultCount");
  if (!header) return;
  const navH = document.querySelector(".bc-navbar")?.offsetHeight || 0;
  const top = header.getBoundingClientRect().top + window.scrollY - navH - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

// keepPage: true only when flipping pages; any filter/search/sort change starts at page 1
function renderFacultyList(keepPage) {
  const container = document.getElementById("facultyListContainer");
  const resultCountEl = document.getElementById("resultCount");
  const emptyState = document.getElementById("noResultsState");
  if (!container) return;
  renderDeptNoteBanner();
  if (keepPage !== true) AppState.page = 1;

  const filtered = getFilteredFaculty();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  AppState.page = Math.min(Math.max(1, AppState.page || 1), pages);
  const first = (AppState.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(first, first + PAGE_SIZE);

  // Corrected pluralization
  if (resultCountEl) {
    resultCountEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'opportunity' : 'opportunities'} found` +
      (filtered.length > PAGE_SIZE ? ` · showing ${first + 1}–${first + pageItems.length}` : "");
  }
  renderPagination(filtered.length);
  writeStateToUrl();

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.classList.remove("d-none");
    return;
  }

  if (emptyState) emptyState.classList.add("d-none");

  const signedIn = canSeeContacts();
  let html = "";
  pageItems.forEach(prof => {
    const isSaved = ApplicationTracker.isSaved(prof.id);
    const isOrcidActive = prof.orcid && prof.orcid.researchActive;

    // Badges based on status
    let statusBadge = "";
    if (prof.status === "recruiting") {
      statusBadge = `
        <span class="badge bg-success-subtle text-success border border-success py-1 px-2 small">
          <i class="bi bi-patch-check-fill me-1"></i>Actively Recruiting
        </span>`;
    } else if (prof.status === "inquire") {
      statusBadge = `
        <span class="badge bg-primary-subtle text-primary border border-primary py-1 px-2 small"
              title="This professor is research-active but has not posted undergraduate openings. You can still email to ask.">
          <i class="bi bi-envelope-open me-1"></i>No Posted Openings
        </span>`;
    } else if (prof.status === "full") {
      statusBadge = `
        <span class="badge bg-secondary-subtle text-secondary border border-secondary py-1 px-2 small">
          <i class="bi bi-dash-circle me-1"></i>Lab Full
        </span>`;
    } else if (prof.status === "future") {
      statusBadge = `
        <span class="badge bg-info-subtle text-info-emphasis border border-info py-1 px-2 small">
          <i class="bi bi-calendar-event me-1"></i>Openings Spring 2027
        </span>`;
    }

    // Past-undergrad badge: evidence the lab has taken undergrads, even if nothing is posted now
    let mentoredBadge = "";
    const uh = prof.undergradHistory;
    if (uh && uh.hasMentored && prof.status !== "recruiting" && prof.status !== "full") {
      const when = uh.lastSeen ? ` (${uh.lastSeen})` : "";
      const tip = (uh.evidence || '').replace(/"/g, '&quot;');
      mentoredBadge = uh.type === "invites" ? `
        <span class="badge bg-success-subtle text-success-emphasis border border-success py-1 px-2 small"
              title="Standing invitation on the lab's website: ${tip}">
          <i class="bi bi-door-open-fill me-1"></i>Invites Undergrads
        </span>` : `
        <span class="badge bg-warning-subtle text-warning-emphasis border border-warning py-1 px-2 small"
              title="${tip}">
          <i class="bi bi-people-fill me-1"></i>Has Taken Undergrads${when}
        </span>`;
    }

    // ORCID Status Badge
    let orcidBadge = "";
    if (prof.orcid) {
      if (isOrcidActive) {
        orcidBadge = `
          <button type="button" class="btn btn-sm btn-outline-success py-0 px-2 rounded-pill small d-inline-flex align-items-center"
                  onclick="OrcidInspector.open('${prof.id}')" title="${prof.orcid.id ? 'Click to view verified ORCID registry details' : 'Recent publications verified on OpenAlex; no ORCID ID found'}">
            <span class="orcid-dot bg-success me-1"></span>
            <span>${prof.orcid.id ? 'ORCID Active' : 'Publishing'}</span>
          </button>
        `;
      } else {
        orcidBadge = `
          <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 rounded-pill small fw-bold d-inline-flex align-items-center"
                  onclick="OrcidInspector.open('${prof.id}')" title="ORCID indicates research has ceased / Inactive">
            <span class="orcid-dot bg-danger me-1"></span>
            <span>ORCID Inactive</span>
          </button>
        `;
      }
    }

    // INACTIVITY SAFEGUARD BANNER (inside dropdown)
    let orcidAlertBox = "";
    if (!isOrcidActive && prof.orcid) {
      orcidAlertBox = `
        <div class="alert alert-danger py-2 px-3 my-2 small border-start border-4 border-danger rounded-end shadow-sm">
          <div class="d-flex align-items-start justify-content-between">
            <div class="me-2">
              <strong class="d-block text-danger">
                <i class="bi bi-shield-slash-fill me-1"></i> RESEARCH INACTIVE (ORCID REGISTRY)
              </strong>
              <span>${prof.orcid.inactivityWarning || 'No recent peer-reviewed publications.'}</span>
            </div>
            <button class="btn btn-danger btn-sm text-nowrap py-0 px-2 text-white" onclick="OrcidInspector.open('${prof.id}')">
              ORCID Audit
            </button>
          </div>
        </div>
      `;
    }

    html += `
      <div class="col-12 col-md-6 col-lg-4 mb-3">
        <div class="card faculty-card shadow-sm border ${!isOrcidActive && prof.orcid ? 'border-danger-subtle card-orcid-inactive-bg' : 'border-light-subtle'}">
          <div class="card-body p-3 d-flex flex-column">
            
            <!-- Visible Card Surface: Department, Save Button, Name, Role, Title of Lab -->
            <div>
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="text-uppercase fw-semibold text-gold small tracking-wide">${prof.department}</span>
                <button class="btn btn-sm p-0 border-0 save-btn" 
                        id="save-btn-${prof.id}"
                        onclick="ApplicationTracker.toggleSave('${prof.id}')"
                        aria-pressed="${isSaved}" aria-label="Save ${prof.name.replace(/"/g, '&quot;')} to your tracker"
                        title="${isSaved ? 'Remove from My Saved Labs' : 'Save to My Saved Labs'}">
                  <i class="bi ${isSaved ? 'bi-bookmark-fill text-maroon' : 'bi-bookmark text-muted'} fs-5"></i>
                </button>
              </div>

              <!-- Professor Name -->
              <h2 class="h5 card-title mb-1 text-maroon fw-bold">${prof.name}</h2>
              
              <!-- Role -->
              <div class="text-muted small mb-2">${prof.title}</div>

              <!-- Title of Lab -->
              <div class="fw-semibold text-secondary small mb-2 d-flex align-items-baseline gap-1" title="${prof.labName}">
                <i class="bi ${prof.disciplineType === 'humanities' ? 'bi-book-half' : 'bi-buildings'} text-muted flex-shrink-0"></i>
                <span class="text-truncate">${prof.labName}</span>
              </div>

              <!-- Compact Status & ORCID Badges -->
              <div class="d-flex flex-wrap align-items-center gap-1 mb-2">
                ${statusBadge}
                ${mentoredBadge}
                ${orcidBadge}
              </div>
            </div>

            <!-- Dropdown Toggle Button -->
            <button class="btn btn-sm btn-outline-maroon w-100 mt-2 d-flex align-items-center justify-content-between card-collapse-btn" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#details-${prof.id}" 
                    aria-expanded="false" 
                    aria-controls="details-${prof.id}">
              <span>${prof.disciplineType === 'humanities' ? 'View Research Details' : 'View Lab Details'}</span>
              <i class="bi bi-chevron-down"></i>
            </button>

            <!-- Collapsible Dropdown for Detailed Info -->
            <div class="collapse pt-3 mt-2 border-top" id="details-${prof.id}" data-bs-parent="#facultyListContainer">
              
              <!-- Location & Verification Date -->
              <div class="d-flex flex-wrap gap-2 small text-muted mb-2">
                ${signedIn ? `<span><i class="bi bi-geo-alt me-1"></i>${prof.building || 'Office not listed'}${prof.room ? ', ' + prof.room : ''}</span>` : ''}
                <span><i class="bi bi-calendar3 me-1"></i>Checked: <strong>${prof.lastUpdated}</strong></span>
              </div>

              <!-- Alerts if any -->
              ${orcidAlertBox}

              ${uh && uh.evidence ? `
                <div class="alert alert-warning py-2 px-3 my-2 small border-start border-4 border-warning rounded-end">
                  <strong class="d-block text-warning-emphasis"><i class="bi bi-people-fill me-1"></i> ${prof.status === "recruiting" ? "Current recruiting notice" : prof.status === "full" ? "Lab says it is not taking undergrads right now" : uh.type === "invites" ? "Lab website invites undergraduates" : "This lab has taken undergraduates before"}</strong>
                  <span class="fst-italic">"${uh.evidence}"</span>
                  ${signedIn && uh.source ? `<a href="${uh.source}" target="_blank" rel="noopener noreferrer" class="d-block mt-1">Source${uh.archived ? " (archived copy)" : ""}</a>` : ""}
                  ${prof.status === "inquire" && uh.type !== "invites" ? `<span class="d-block text-muted mt-1">No current opening is posted. It's worth emailing to ask.</span>` : ""}
                </div>
              ` : ''}

              <!-- Research Summary -->
              <div class="mb-2">
                <span class="fw-bold text-dark small d-block">${prof.disciplineType === 'humanities' ? 'Scholarly Overview:' : 'Research Overview:'}</span>
                <p class="text-dark-emphasis small mb-0 lh-sm">
                  ${prof.researchSummary}
                </p>
              </div>

              <!-- Key Focus Projects / Scholarly Areas -->
              ${prof.currentProjects && prof.currentProjects.length ? `
                <div class="mb-2">
                  <span class="fw-bold text-dark small d-block mb-1">${prof.disciplineType === 'humanities' ? 'Active Scholarly Areas:' : 'Focus Projects:'}</span>
                  <ul class="list-unstyled small ps-2 border-start border-2 border-gold-light mb-0">
                    ${prof.currentProjects.slice(0, 2).map(proj => `
                      <li class="mb-1 lh-sm" title="${proj}">
                        <i class="bi bi-arrow-right-short text-maroon me-1"></i>${proj}
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Pay (verified only) & Skills / Engagement Options -->
              <div class="mb-3">
                <div class="d-flex flex-wrap gap-1 mb-1">
                  ${prof.pay && prof.pay.paid ? `
                    <span class="badge bg-success-subtle text-success-emphasis border border-success small" style="font-size: 0.72rem;"
                          title="${(prof.pay.evidence || '').replace(/"/g, '&quot;')}">
                      <i class="bi bi-cash-coin me-1"></i>${payLabel(prof.pay)}
                    </span>
                    ${signedIn && prof.pay.source ? `<a href="${prof.pay.source}" target="_blank" rel="noopener noreferrer" class="small align-self-center">source</a>` : ''}
                  ` : ''}
                  ${prof.hoursPerWeek && prof.hoursPerWeek !== 'Hours not listed' ? `<span class="badge bg-light text-muted border small" style="font-size: 0.72rem;">${prof.hoursPerWeek}</span>` : ''}
                </div>
                ${prof.disciplineType === 'humanities' ? `
                  <div class="d-flex flex-wrap gap-1">
                    ${(prof.requiredSkills || []).slice(0, 3).map(skill => `
                      <span class="badge bg-info-subtle text-dark small" style="font-size: 0.72rem;"><i class="bi bi-book me-1"></i>${skill}</span>
                    `).join('')}
                  </div>
                ` : `
                  <div class="d-flex flex-wrap gap-1">
                    ${(prof.requiredSkills || []).slice(0, 3).map(skill => `
                      <span class="badge bg-secondary-subtle text-dark small" style="font-size: 0.72rem;">${skill}</span>
                    `).join('')}
                    ${(prof.requiredSkills || []).length > 3 ? `
                      <span class="badge bg-secondary-subtle text-muted small" style="font-size: 0.72rem;">+${prof.requiredSkills.length - 3}</span>
                    ` : ''}
                  </div>
                `}
              </div>

              ${typeof BC_DEPT_NOTES !== "undefined" && BC_DEPT_NOTES[prof.departmentId] ? `
                <button type="button" class="btn btn-link btn-sm p-0 mb-2 small text-maroon text-decoration-none" onclick="openDeptNote('${prof.departmentId}')">
                  <i class="bi bi-info-circle me-1"></i>How undergrad research works in ${(BC_DEPARTMENTS.find(d => d.id === prof.departmentId) || {}).name || prof.department} &rarr;
                </button>
              ` : ''}

              <!-- Action Links & Outreach -->
              <div class="pt-2 border-top d-flex flex-column gap-2">
                <div>
                  ${(isOrcidActive || !prof.orcid) && !signedIn ? `
                    <button class="btn btn-sm btn-outline-maroon w-100 fw-semibold" onclick="Auth.require('Sign in to see how to contact ${prof.name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}.')">
                      <i class="bi bi-lock-fill me-1"></i> Sign in to contact this lab
                    </button>
                  ` : isOrcidActive || !prof.orcid ? `
                    <button class="btn btn-sm btn-maroon w-100 fw-semibold" onclick="ApplyHandler.open('${prof.id}')">
                      <i class="bi bi-envelope-fill me-1"></i> Apply / Contact Lab
                    </button>
                  ` : `
                    <button class="btn btn-sm btn-outline-danger w-100 fw-semibold" onclick="showOrcidInactiveWarning('${prof.id}')" title="Research inactive on ORCID">
                      <i class="bi bi-shield-x me-1"></i> Contact Blocked (Inactive)
                    </button>
                  `}
                </div>
                ${!signedIn ? `<div class="small text-center">${signInPromptHtml("profile and lab links")}</div>` : `
                <div class="d-flex gap-1 justify-content-between">
                  ${prof.labWebsiteUrl && prof.labWebsiteUrl !== prof.bcProfileUrl ? `
                    <a href="${prof.labWebsiteUrl}" target="_blank" rel="noopener noreferrer" 
                       class="btn btn-sm btn-outline-secondary flex-grow-1 text-center" 
                       title="${prof.labWebsiteUrl.includes('~') || prof.labWebsiteUrl.includes('github.io') || prof.labWebsiteUrl.includes('bryanranger') || prof.labWebsiteUrl.includes('lewbel') ? 'Visit Personal Academic Website' : 'Visit Research Lab Website'}">
                      <i class="bi bi-globe me-1"></i> ${prof.labWebsiteUrl.includes('~') || prof.labWebsiteUrl.includes('github.io') || prof.labWebsiteUrl.includes('bryanranger') || prof.labWebsiteUrl.includes('lewbel') ? 'Website' : 'Lab Site'}
                    </a>
                  ` : ''}
                  <a href="${prof.bcProfileUrl}" target="_blank" rel="noopener noreferrer" 
                     class="btn btn-sm btn-outline-secondary flex-grow-1 text-center" title="Official BC Faculty Directory Profile">
                    <i class="bi bi-link-45deg me-1"></i> BC Bio
                  </a>
                  ${prof.orcid && prof.orcid.url ? `
                    <a href="${prof.orcid.url}" target="_blank" rel="noopener noreferrer" 
                       class="btn btn-sm btn-outline-success flex-grow-1 text-center" title="View Verified ORCID Profile (${prof.orcid.id})">
                      <i class="bi bi-patch-check me-1"></i> ORCID
                    </a>
                  ` : ''}
                </div>`}
              </div>

            </div>

          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Update state of save buttons
function updateSaveButtons(labId, isSaved) {
  const btn = document.getElementById(`save-btn-${labId}`);
  if (!btn) return;
  btn.className = "btn btn-sm p-0 border-0 save-btn";
  btn.innerHTML = `<i class="bi ${isSaved ? "bi-bookmark-fill text-maroon" : "bi-bookmark text-muted"} fs-5"></i>`;
  btn.title = isSaved ? "Remove from My Saved Labs" : "Save to My Saved Labs";
  btn.setAttribute("aria-pressed", String(isSaved));
}

// Re-sync every visible card's save star with the tracker (after sign-in/out or load)
function refreshAllSaveButtons() {
  document.querySelectorAll("[id^='save-btn-']").forEach(btn => {
    const labId = btn.id.replace("save-btn-", "");
    updateSaveButtons(labId, ApplicationTracker.isSaved(labId));
  });
}

// Detail pop-up: the posted position details, with every unposted item listed once in a single note
function postedDetailsHtml(prof) {
  const listed = v => v && !/not listed/i.test(v);
  const posted = [], missing = [];
  const add = (label, html, missingLabel) => html ? posted.push({ label, html }) : missing.push(missingLabel);

  add("Time commitment", listed(prof.hoursPerWeek) ? `<strong class="text-dark">${escapeHtml(prof.hoursPerWeek)}</strong>` : "", "weekly hours");
  add("Minimum duration", listed(prof.minimumCommitment) ? `<strong class="text-dark">${escapeHtml(prof.minimumCommitment)}</strong>` : "", "minimum duration");
  add("Eligible class years", (prof.studentLevel || []).length ? `<strong class="text-dark">${escapeHtml(prof.studentLevel.join(", "))}</strong>` : "", "eligible class years");
  add("Pay / credit", (prof.pay && prof.pay.paid) ? `<span class="badge bg-gold text-dark me-1">${payLabel(prof.pay)}</span> <span class="text-muted">"${escapeHtml(prof.pay.evidence)}"</span>` : "", "pay or credit");
  add("Required coursework & skills", (prof.requiredSkills || []).map(s => `<span class="badge bg-light text-dark border me-1 mb-1">${escapeHtml(s)}</span>`).join(""), "required skills");
  add("Helpful skills", (prof.preferredSkills || []).map(s => `<span class="badge bg-secondary-subtle text-dark me-1 mb-1">${escapeHtml(s)}</span>`).join(""), "helpful skills");

  const postedHtml = posted.length ? `
    <div class="row g-3 mb-3 bg-light p-3 rounded small mx-0">
      ${posted.map(p => `<div class="col-md-6"><span class="text-muted d-block">${p.label}</span>${p.html}</div>`).join("")}
    </div>` : "";
  const list = missing.length > 1 ? missing.slice(0, -1).join(", ") + " and " + missing[missing.length - 1] : missing[0];
  const missingHtml = missing.length ? `
    <div class="small text-muted mb-4 p-3 border rounded">
      <i class="bi bi-info-circle me-1"></i><strong>Not posted by the professor:</strong> ${list}. Ask about these when you email.
      ${missing.includes("pay or credit") ? `BC's Undergraduate Research Fellowship can fund paid positions.` : ""}
    </div>` : "";
  return postedHtml + missingHtml;
}

// Full Professor Detail Modal View
function viewProfessorDetail(facultyId) {
  const prof = BC_FACULTY_DATA.find(f => f.id === facultyId);
  if (!prof) return;

  const modalEl = document.getElementById("professorDetailModal");
  if (!modalEl) return;

  document.getElementById("detailProfName").textContent = prof.name;
  document.getElementById("detailProfTitle").textContent = `${prof.title} · ${prof.department}`;
  document.getElementById("detailProfLab").textContent = prof.labName;
  // Contact details and links: signed-in BC students only
  const signedIn = canSeeContacts();
  document.getElementById("detailContactBlock").classList.toggle("d-none", !signedIn);
  const locked = document.getElementById("detailContactLocked");
  locked.classList.toggle("d-none", signedIn);
  locked.innerHTML = signedIn ? "" : signInPromptHtml("this professor's email, phone, office, and profile links");
  if (signedIn) {
    document.getElementById("detailProfLocation").textContent = prof.building ? (prof.room ? `${prof.building}, ${prof.room}` : prof.building) : "Not listed";
    document.getElementById("detailProfEmail").textContent = prof.email || "Not listed";
    if (prof.email) { document.getElementById("detailProfEmail").href = `mailto:${prof.email}`; } else { document.getElementById("detailProfEmail").removeAttribute("href"); }
    document.getElementById("detailProfPhone").textContent = prof.phone || "Not listed";
    const bcLink = document.getElementById("detailProfBcLink"), labLink = document.getElementById("detailProfLabLink");
    if (prof.bcProfileUrl) { bcLink.href = prof.bcProfileUrl; bcLink.classList.remove("d-none"); } else { bcLink.classList.add("d-none"); }
    if (prof.labWebsiteUrl) { labLink.href = prof.labWebsiteUrl; labLink.classList.remove("d-none"); } else { labLink.classList.add("d-none"); }
  }

  const orcidLinkEl = document.getElementById("detailProfOrcidLink");
  if (orcidLinkEl) {
    if (prof.orcid && prof.orcid.url) {
      orcidLinkEl.href = prof.orcid.url;
      orcidLinkEl.textContent = prof.orcid.id;
    } else {
      orcidLinkEl.removeAttribute("href");
      orcidLinkEl.textContent = (prof.orcid && prof.orcid.id) ? prof.orcid.id : "No ORCID ID found";
    }
  }

  document.getElementById("detailResearchSummary").textContent = prof.researchSummary;

  const reportLink = document.getElementById("detailReportLink");
  if (reportLink) {
    const popup = typeof Report !== "undefined" && Report.enabled();
    const href = popup ? "#" : reportMailto("listing", prof);
    reportLink.classList.toggle("d-none", !href);
    if (href) reportLink.href = href;
    reportLink.dataset.profId = prof.id;
  }

  // Projects: hidden entirely when none are posted (the research summary above covers it)
  const projects = prof.currentProjects || [];
  document.getElementById("detailProjectsBlock").classList.toggle("d-none", !projects.length);
  document.getElementById("detailProjectsList").innerHTML = projects.map(p => `
    <li class="mb-2"><i class="bi bi-check-circle text-maroon me-2"></i>${p}</li>
  `).join("");

  // Position details: show only what's actually posted, and name everything missing once
  document.getElementById("detailPostedInfo").innerHTML = postedDetailsHtml(prof);

  if (signedIn) document.getElementById("detailApplyProcess").textContent = prof.applicationInstructions || prof.applicationProcess || "Not listed";
  else document.getElementById("detailApplyProcess").innerHTML = signInPromptHtml("how to apply to this lab");
  document.getElementById("detailSamplePaper").textContent = prof.samplePaperTitle ? `"${prof.samplePaperTitle}"` : "";
  document.getElementById("detailSamplePaperBlock").classList.toggle("d-none", !prof.samplePaperTitle);

  // ORCID Detail section
  const orcidDetailBox = document.getElementById("detailOrcidInfo");
  if (orcidDetailBox && prof.orcid) {
    if (prof.orcid.researchActive) {
      orcidDetailBox.innerHTML = `
        <div class="alert alert-success py-2 px-3 small mb-3">
          <strong><i class="bi bi-patch-check-fill text-success me-1"></i> ORCID Verified Active:</strong>
          Most recent publication activity in <strong>${prof.orcid.lastPublicationYear}</strong> ${prof.orcid.totalWorks != null ? `(${prof.orcid.totalWorks} indexed works on OpenAlex${prof.orcid.activeGrants != null ? `, ${prof.orcid.activeGrants} active grants` : ''})` : '(listed on the professor\'s own page)'}.
        </div>
      `;
    } else {
      orcidDetailBox.innerHTML = `
        <div class="alert alert-danger py-2 px-3 small mb-3 border-start border-4 border-danger">
          <strong class="d-block text-danger"><i class="bi bi-shield-x me-1"></i> INACTIVE RESEARCHER WARNING:</strong>
          ${prof.orcid.inactivityWarning}
        </div>
      `;
    }
  }

  // Setup Apply / Contact action button in modal
  const applyBtn = document.getElementById("detailApplyActionBtn");
  if (applyBtn) {
    if (prof.orcid && !prof.orcid.researchActive) {
      applyBtn.className = "btn btn-outline-danger btn-sm";
      applyBtn.innerHTML = '<i class="bi bi-shield-x me-1"></i> Inactive on ORCID (Blocked)';
      applyBtn.onclick = () => {
        bootstrap.Modal.getInstance(modalEl).hide();
        showOrcidInactiveWarning(prof.id);
      };
    } else if (!signedIn) {
      applyBtn.className = "btn btn-outline-maroon btn-sm";
      applyBtn.innerHTML = '<i class="bi bi-lock-fill me-1"></i> Sign in to contact';
      applyBtn.onclick = () => {
        bootstrap.Modal.getInstance(modalEl).hide();
        Auth.require(`Sign in to see how to contact ${prof.name}.`);
      };
    } else {
      applyBtn.className = "btn btn-maroon btn-sm";
      applyBtn.innerHTML = '<i class="bi bi-box-arrow-up-right me-1"></i> Apply / Contact';
      applyBtn.onclick = () => {
        bootstrap.Modal.getInstance(modalEl).hide();
        ApplyHandler.open(prof.id);
      };
    }
  }

  const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
  bsModal.show();
}

// Toast notification helper
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toastId = "toast-" + Date.now();
  const bgClass = type === "success" ? "bg-success text-white" : 
                  type === "warning" ? "bg-warning text-dark" : 
                  type === "danger" ? "bg-danger text-white" : "bg-dark text-white";

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body small">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", toastHtml);
  const toastEl = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
  bsToast.show();

  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove();
  });
}
