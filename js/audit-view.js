/**
 * Boston College Research Opportunities Portal - ORCID / research-activity inspector
 * Shows each professor's verified publication activity (ORCID + OpenAlex).
 */

/**
 * Dedicated ORCID Cross-Referencing Inspector
 */
const OrcidInspector = {
  open(facultyId) {
    const prof = BC_FACULTY_DATA.find(f => f.id === facultyId);
    if (!prof || !prof.orcid) return;

    const modalEl = document.getElementById("orcidDetailModal");
    if (!modalEl) return;

    document.getElementById("orcidModalProfName").textContent = prof.name;
    document.getElementById("orcidModalProfDept").textContent = `${prof.title} · ${prof.department}`;
    document.getElementById("orcidModalId").textContent = prof.orcid.id || "No ORCID ID found";
    const orcidLinkModal = document.getElementById("orcidModalLink");
    if (prof.orcid.url) {
      orcidLinkModal.href = prof.orcid.url;
      orcidLinkModal.textContent = prof.orcid.url;
    } else {
      orcidLinkModal.removeAttribute("href");
      orcidLinkModal.textContent = prof.orcid.id
        ? "Sign in with your BC email to open the ORCID profile"
        : "Activity verified via OpenAlex publication records";
    }

    const statusBadge = document.getElementById("orcidModalStatusBadge");
    if (prof.orcid.researchActive) {
      statusBadge.className = "badge bg-success px-3 py-2 fs-6";
      statusBadge.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> Active Researcher (${prof.orcid.lastPublicationYear})`;
    } else {
      statusBadge.className = "badge bg-danger px-3 py-2 fs-6";
      statusBadge.innerHTML = `<i class="bi bi-shield-slash-fill me-1"></i> Inactive / Ceased (${prof.orcid.lastPublicationYear})`;
    }

    document.getElementById("orcidModalLastYear").textContent = prof.orcid.lastPublicationYear;
    document.getElementById("orcidModalTotalWorks").textContent = prof.orcid.totalWorks != null
      ? `${prof.orcid.totalWorks} indexed works (OpenAlex)`
      : "Not indexed on OpenAlex; recent work listed on the professor's own page";
    document.getElementById("orcidModalActiveGrants").textContent = prof.orcid.activeGrants != null
      ? `${prof.orcid.activeGrants} registered grant awards`
      : "Not verified";
    document.getElementById("orcidModalRecentPaper").textContent = `"${prof.orcid.recentPaperTitle}"`;
    document.getElementById("orcidModalJournal").textContent = prof.orcid.recentJournal;

    const warningBox = document.getElementById("orcidModalInactivityAlert");
    if (!prof.orcid.researchActive) {
      warningBox.classList.remove("d-none");
      document.getElementById("orcidModalWarningText").textContent = prof.orcid.inactivityWarning;
    } else {
      warningBox.classList.add("d-none");
    }

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
  }
};

function showOrcidInactiveWarning(facultyId) {
  const prof = BC_FACULTY_DATA.find(f => f.id === facultyId);
  if (!prof) return;
  ColdEmailGenerator.showInactivityBlockModal(prof);
}
