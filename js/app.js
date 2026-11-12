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
  sortBy: "verified" // verified | name | orcidWorks
};

document.addEventListener("DOMContentLoaded", () => {
  renderSchoolPills();
  renderDepartmentPills();
  updateStatisticsDashboard();
  renderFacultyList();
  setupEventListeners();
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
    if (Date.now() < clickLockUntil) return;
    const navH = (document.querySelector(".bc-navbar")?.offsetHeight || 0) + 24;
    let current = sections[0];
    for (const s of sections) { if (s.el.getBoundingClientRect().top - navH <= 0) current = s; }
    // at the very bottom of the page, the last section wins even if it's short
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
    if (!current.link.classList.contains("active")) setActiveNav(current.link);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
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
      renderFacultyList();
    });
  }

  // ORCID Filter
  const orcidSelect = document.getElementById("orcidFilterSelect");
  if (orcidSelect) {
    orcidSelect.addEventListener("change", (e) => {
      AppState.orcidFilter = e.target.value;
      renderFacultyList();
    });
  }

  // Compensation Filter
  const compSelect = document.getElementById("compFilterSelect");
  if (compSelect) {
    compSelect.addEventListener("change", (e) => {
      AppState.compensationFilter = e.target.value;
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
  AppState.sortBy = "verified";

  document.getElementById("searchInput").value = "";
  document.getElementById("statusFilterSelect").value = "all";
  document.getElementById("compFilterSelect").value = "all";
  const orcidSelect = document.getElementById("orcidFilterSelect");
  if (orcidSelect) orcidSelect.value = "all";
  document.getElementById("sortSelect").value = "verified";

  // Reset quick pills
  document.querySelectorAll(".quick-filter-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById("qfAll")?.classList.add("active");

  renderSchoolPills();
  renderDepartmentPills();
  renderFacultyList();
  showToast("All filters reset", "info");
}

// Quick filter shortcuts
function applyQuickFilter(type) {
  // Quick filters are mutually exclusive: each one starts from a clean slate
  // (school, department, and search are left as-is)
  document.querySelectorAll(".quick-filter-btn").forEach(btn => btn.classList.remove("active"));
  AppState.statusFilter = "all";
  AppState.orcidFilter = "all";
  AppState.compensationFilter = "all";
  AppState.verifiedOnly = false;
  AppState.mentoredOnly = false;

  if (type === "inquire") {
    AppState.statusFilter = "inquire";
  } else if (type === "recruiting") {
    AppState.statusFilter = "recruiting";
  } else if (type === "orcidActive") {
    AppState.orcidFilter = "active";
  } else if (type === "paid") {
    AppState.compensationFilter = "paid";
  } else if (type === "mentored") {
    AppState.mentoredOnly = true;
  }

  const btnIds = { all: "qfAll", inquire: "qfInquire", recruiting: "qfRecruiting", orcidActive: "qfOrcidActive", paid: "qfPaid", mentored: "qfMentored" };
  document.getElementById(btnIds[type] || "qfAll")?.classList.add("active");

  // keep the dropdowns in sync with what is actually applied
  document.getElementById("statusFilterSelect").value = AppState.statusFilter;
  const orcidSelect = document.getElementById("orcidFilterSelect");
  if (orcidSelect) orcidSelect.value = AppState.orcidFilter;
  const compSelect = document.getElementById("compFilterSelect");
  if (compSelect) compSelect.value = AppState.compensationFilter;
  renderFacultyList();
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
      return a.name.localeCompare(b.name);
    } else if (AppState.sortBy === "orcidWorks") {
      return (b.orcid?.totalWorks || 0) - (a.orcid?.totalWorks || 0);
    } else {
      // Default: verified recently first
      return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    }
  });
}

// Render Faculty Cards
// ---- Pagination ------------------------------------------------------------
const PAGE_SIZE = 30;

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const html = pages <= 1 ? "" : `
    <div class="d-flex justify-content-center align-items-center gap-2 flex-wrap">
      <button type="button" class="btn btn-outline-maroon btn-sm" onclick="goToPage(${AppState.page - 1})" ${AppState.page <= 1 ? "disabled" : ""}>
        <i class="bi bi-chevron-left me-1"></i>Previous
      </button>
      <span class="small text-muted px-2" aria-live="polite">Page <strong>${AppState.page}</strong> of ${pages}</span>
      <button type="button" class="btn btn-maroon btn-sm" onclick="goToPage(${AppState.page + 1})" ${AppState.page >= pages ? "disabled" : ""}>
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
                        title="${isSaved ? 'Remove from Tracker' : 'Save to Research Tracker'}">
                  <i class="bi ${isSaved ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-5"></i>
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
  btn.innerHTML = `<i class="bi ${isSaved ? "bi-star-fill text-warning" : "bi-star text-muted"} fs-5"></i>`;
  btn.title = isSaved ? "Remove from Tracker" : "Save to Research Tracker";
  btn.setAttribute("aria-pressed", String(isSaved));
}

// Re-sync every visible card's save star with the tracker (after sign-in/out or load)
function refreshAllSaveButtons() {
  document.querySelectorAll("[id^='save-btn-']").forEach(btn => {
    const labId = btn.id.replace("save-btn-", "");
    updateSaveButtons(labId, ApplicationTracker.isSaved(labId));
  });
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

  // Projects
  const projContainer = document.getElementById("detailProjectsList");
  projContainer.innerHTML = (prof.currentProjects || []).length ? prof.currentProjects.map(p => `
    <li class="mb-2"><i class="bi bi-check-circle text-maroon me-2"></i>${p}</li>
  `).join("") : `<li class="text-muted small">Not listed. See the research summary and the professor's website.</li>`;

  // Requirements & Compensation
  document.getElementById("detailHours").textContent = prof.hoursPerWeek;
  document.getElementById("detailCommitment").textContent = prof.minimumCommitment;
  document.getElementById("detailEligibility").textContent = (prof.studentLevel || []).length ? prof.studentLevel.join(", ") : "Not listed";
  
  const compContainer = document.getElementById("detailCompensation");
  compContainer.innerHTML = (prof.pay && prof.pay.paid)
    ? `<span class="badge bg-gold text-dark me-1">${payLabel(prof.pay)}</span> <span class="small text-muted">"${prof.pay.evidence}"</span>`
    : `<span class="small text-muted">Not listed. Ask the professor (BC's Undergraduate Research Fellowship can fund paid positions).</span>`;

  const reqSkillsContainer = document.getElementById("detailRequiredSkills");
  reqSkillsContainer.innerHTML = (prof.requiredSkills || []).length ? prof.requiredSkills.map(s => `<span class="badge bg-light text-dark border me-1 mb-1">${s}</span>`).join("") : `<span class="small text-muted">Not listed</span>`;

  const prefSkillsContainer = document.getElementById("detailPreferredSkills");
  prefSkillsContainer.innerHTML = (prof.preferredSkills || []).length ? prof.preferredSkills.map(s => `<span class="badge bg-secondary-subtle text-dark me-1 mb-1">${s}</span>`).join("") : `<span class="small text-muted">Not listed</span>`;

  if (signedIn) document.getElementById("detailApplyProcess").textContent = prof.applicationInstructions || prof.applicationProcess || "Not listed";
  else document.getElementById("detailApplyProcess").innerHTML = signInPromptHtml("how to apply to this lab");
  document.getElementById("detailSamplePaper").textContent = prof.samplePaperTitle ? `"${prof.samplePaperTitle}"` : "Not listed";

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
