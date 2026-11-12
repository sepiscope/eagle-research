/**
 * Boston College Research Opportunities Portal - Application & Contact Handler
 * Provides direct application links (Email or Google Form / Lab Portal)
 * without generating automated email templates.
 */

const ApplyHandler = {
  activeProfessor: null,

  open(facultyId) {
    const prof = BC_FACULTY_DATA.find(f => f.id === facultyId);
    if (!prof) return;
    if (!Auth.require(`Sign in to see how to contact ${prof.name}.`)) return;

    this.activeProfessor = prof;

    // ORCID INACTIVITY SAFEGUARD: Check if professor has ceased active research
    if (prof.orcid && !prof.orcid.researchActive) {
      this.showInactivityBlockModal(prof);
      return;
    }

    const modal = document.getElementById("applyModal");
    if (!modal) return;

    // Fill professor preview details
    document.getElementById("applyProfName").textContent = prof.name;
    document.getElementById("applyProfDept").textContent = `${prof.title} · ${prof.department}`;
    document.getElementById("applyProfLab").textContent = prof.labName;
    document.getElementById("applyProfLocation").textContent = prof.room ? `${prof.building}, ${prof.room}` : prof.building;

    // Display ORCID Verification status
    const orcidBadge = document.getElementById("applyOrcidStatusBadge");
    if (orcidBadge && prof.orcid) {
      orcidBadge.innerHTML = `
        <span class="badge bg-success-subtle text-success border border-success">
          <i class="bi bi-patch-check-fill me-1"></i> ${prof.orcid.id ? 'ORCID Active' : 'Publishing'} (${prof.orcid.lastPublicationYear})${prof.orcid.totalWorks != null ? ` · ${prof.orcid.totalWorks} Works` : ''}
        </span>
      `;
    }

    // Populate Preferred Application Action (Google Form vs. Email)
    const actionContainer = document.getElementById("applyActionButtonsContainer");
    const instructionsEl = document.getElementById("applyInstructionsText");
    instructionsEl.textContent = prof.applicationInstructions || prof.applicationProcess;

    if (prof.applyMethod === "form" && prof.formUrl) {
      actionContainer.innerHTML = `
        <div class="p-3 bg-light rounded border mb-3 text-center">
          <span class="badge bg-maroon mb-2">Preferred Application Method</span>
          <h3 class="h6 fw-bold text-dark mb-2">Online Application Form</h3>
          <p class="small text-muted mb-3">This professor requests that interested students submit their information through the lab's online application form.</p>
          <a href="${prof.formUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-maroon btn-lg px-4 mb-2 shadow-sm">
            <i class="bi bi-box-arrow-up-right me-2"></i> Open Application Form
          </a>
          <div class="mt-2 small text-muted">
            Questions? Contact PI directly: <a href="mailto:${prof.email}" class="fw-semibold text-maroon">${prof.email}</a>
          </div>
        </div>
      `;
    } else if (!prof.email) {
      actionContainer.innerHTML = `
        <div class="p-3 bg-light rounded border mb-3 text-center">
          <h3 class="h6 fw-bold text-dark mb-2">No Email Listed</h3>
          <p class="small text-muted mb-3">BC's directory doesn't list an email address for ${prof.name}. Check their BC profile or the BC online directory for current contact details.</p>
          <a href="${prof.bcProfileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-maroon px-4 shadow-sm">
            <i class="bi bi-link-45deg me-1"></i> Open BC Profile
          </a>
        </div>
      `;
    } else {
      // Default: Direct Email
      const emailSubject = encodeURIComponent(`[BC Undergraduate Research] Inquiry - ${prof.labName}`);
      actionContainer.innerHTML = `
        <div class="p-3 bg-light rounded border mb-3 text-center">
          <span class="badge bg-maroon mb-2">Preferred Application Method</span>
          <h3 class="h6 fw-bold text-dark mb-2">Direct Faculty Email</h3>
          <p class="small text-muted mb-3">${prof.status === "recruiting"
            ? `${prof.name} is recruiting and takes applications by Boston College email.`
            : `${prof.name} has not posted an application form. If you're interested, email to ask whether they have room for an undergraduate researcher.`}</p>
          <div class="d-flex flex-wrap justify-content-center gap-2 mb-2">
            <a href="mailto:${prof.email}?subject=${emailSubject}" class="btn btn-maroon btn-lg px-4 shadow-sm">
              <i class="bi bi-envelope-fill me-2"></i> Email ${prof.name}
            </a>
            <button type="button" class="btn btn-outline-secondary btn-lg" onclick="ApplyHandler.copyEmail('${prof.email}')">
              <i class="bi bi-clipboard me-1"></i> Copy Email
            </button>
          </div>
          <div class="small text-muted mt-2">
            Official BC Address: <code>${prof.email}</code>
          </div>
        </div>
      `;
    }

    // Required Skills / Materials checklist
    const materialsContainer = document.getElementById("applyMaterialsList");
    if (materialsContainer) {
      materialsContainer.innerHTML = `
        <li class="mb-1"><i class="bi bi-check2-square text-maroon me-2"></i>Current Resume or Academic CV</li>
        <li class="mb-1"><i class="bi bi-check2-square text-maroon me-2"></i>Unofficial Degree Audit / Transcript</li>
        ${(prof.requiredSkills || []).length ? `<li class="mb-1"><i class="bi bi-check2-square text-maroon me-2"></i>Coursework background: <strong>${prof.requiredSkills.slice(0, 3).join(', ')}</strong></li>` : ''}
      `;
    }

    // Show modal via Bootstrap
    const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    bsModal.show();
  },

  showInactivityBlockModal(prof) {
    const blockModalEl = document.getElementById("orcidBlockedModal");
    if (!blockModalEl) return;

    document.getElementById("blockedProfName").textContent = prof.name;
    document.getElementById("blockedProfDept").textContent = `${prof.title} · ${prof.department}`;
    document.getElementById("blockedOrcidId").textContent = prof.orcid.id;
    const blockedLink = document.getElementById("blockedOrcidLink");
    if (prof.orcid.url) blockedLink.href = prof.orcid.url; else blockedLink.removeAttribute("href");
    document.getElementById("blockedLastYear").textContent = prof.orcid.lastPublicationYear;
    document.getElementById("blockedReasonText").textContent = prof.orcid.inactivityWarning || 
      "Cross-referencing with the official ORCID registry indicates this professor has ceased active laboratory research. Sending outreach emails for research positions is not recommended.";

    const bsModal = bootstrap.Modal.getOrCreateInstance(blockModalEl);
    bsModal.show();
  },

  copyEmail(email) {
    navigator.clipboard.writeText(email).then(() => {
      showToast(`Copied ${email} to clipboard!`, "success");
    }).catch(() => {
      showToast(email, "info");
    });
  },

  saveToTrackerFromApply() {
    if (!this.activeProfessor) return;
    ApplicationTracker.addLab(this.activeProfessor.id, "considering", "Reviewed application details via portal.");
    showToast(`Added ${this.activeProfessor.name} to your Application Tracker!`, "success");
  }
};

// Backwards compatibility alias
const ColdEmailGenerator = ApplyHandler;
