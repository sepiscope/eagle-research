/**
 * Boston College Research Opportunities Portal - Student Application Tracker
 *
 * Saved labs, favorites, application status, and private notes.
 * Requires signing in with a @bc.edu account. Everything is stored in the student's
 * account (Supabase table `saved_labs`, protected so each student can only read and
 * write their own rows) and follows them to any device. Nothing is kept in the browser.
 */

const TRACKER_STATUSES = {
  considering: { text: "Saved / Exploring", cls: "bg-secondary text-white" },
  emailed:     { text: "Email Sent",        cls: "bg-primary text-white" },
  applied:     { text: "Applied",           cls: "bg-info text-dark" },
  interview:   { text: "Interview / Meeting", cls: "bg-warning text-dark" },
  joined:      { text: "Offer Accepted / Joined", cls: "bg-success text-white" },
  declined:    { text: "Full / Declined",   cls: "bg-dark text-white" }
};

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- Storage backends --------------------------------------------------------
const LocalTrackerStore = {
  key: "bc_research_tracker_data",
  async loadAll() {
    try { return JSON.parse(localStorage.getItem(this.key) || "[]"); } catch (e) { return []; }
  },
  async saveAll(items) {
    try { localStorage.setItem(this.key, JSON.stringify(items)); } catch (e) { console.error("Could not save to this browser", e); }
  },
  async upsert(item, all) { await this.saveAll(all); },
  async remove(labId, all) { await this.saveAll(all); },
  async clear() { try { localStorage.removeItem(this.key); } catch (e) {} }
};

function makeCloudTrackerStore(client) {
  const toRow = i => ({ lab_id: i.labId, status: i.status, favorite: !!i.favorite, notes: i.notes || "", added_at: i.addedAt, updated_at: new Date().toISOString() });
  const fromRow = r => ({ labId: r.lab_id, status: r.status, favorite: !!r.favorite, notes: r.notes || "", addedAt: r.added_at });
  return {
    async loadAll() {
      const { data, error } = await client.from("saved_labs").select("lab_id,status,favorite,notes,added_at,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(fromRow);
    },
    async upsert(item) {
      const { error } = await client.from("saved_labs").upsert(toRow(item), { onConflict: "user_id,lab_id" });
      if (error) throw error;
    },
    async insertMissing(items) {
      if (!items.length) return;
      const { error } = await client.from("saved_labs").upsert(items.map(toRow), { onConflict: "user_id,lab_id", ignoreDuplicates: true });
      if (error) throw error;
    },
    async remove(labId) {
      const { error } = await client.from("saved_labs").delete().eq("lab_id", labId);
      if (error) throw error;
    }
  };
}

// ---- Tracker -----------------------------------------------------------------
const ApplicationTracker = {
  data: [],
  store: LocalTrackerStore,
  mode: "guest",          // "guest" | "account"
  view: "all",            // "all" | "favorites" | "applied"

  async init() {
    await LocalTrackerStore.clear();   // remove anything an older version of the site saved in this browser
    this.data = [];
    this.render();
    if (typeof refreshAllSaveButtons === "function") refreshAllSaveButtons();
  },

  // Called by Auth when a student signs in: move guest items into the account, then load the account.
  async useAccount(client) {
    const cloud = makeCloudTrackerStore(client);
    this.store = cloud;
    this.mode = "account";
    try {
      this.data = await cloud.loadAll();
    } catch (e) {
      console.error(e);
      this.data = [];
      showToast("Couldn't load your saved labs. Try refreshing the page.", "warning");
    }
    this.render();
    if (typeof refreshAllSaveButtons === "function") refreshAllSaveButtons();
  },

  // Called by Auth on sign-out: nothing to show until the student signs in again.
  async useGuest() {
    this.store = LocalTrackerStore;
    this.mode = "guest";
    this.data = [];
    this.render();
    if (typeof refreshAllSaveButtons === "function") refreshAllSaveButtons();
  },

  async persist(item) {
    try { await this.store.upsert(item, this.data); }
    catch (e) { console.error(e); showToast("Couldn't save that change. Check your connection and try again.", "danger"); }
  },

  isSaved(labId) {
    return this.data.some(item => item.labId === labId);
  },

  isFavorite(labId) {
    const i = this.data.find(d => d.labId === labId);
    return !!(i && i.favorite);
  },

  newItem(labId, status = "considering", notes = "") {
    return { labId, status, favorite: false, addedAt: new Date().toISOString().split("T")[0], notes };
  },

  async toggleSave(labId) {
    if (!Auth.require("Sign in to save labs to your tracker.")) return false;
    const existingIndex = this.data.findIndex(item => item.labId === labId);
    const prof = BC_FACULTY_DATA.find(f => f.id === labId);
    const name = prof ? prof.name : "Lab";

    if (existingIndex >= 0) {
      this.data.splice(existingIndex, 1);
      this.render();
      updateSaveButtons(labId, false);
      showToast(`Removed ${name} from your tracker`, "info");
      try { await this.store.remove(labId, this.data); } catch (e) { console.error(e); showToast("Couldn't remove that lab. Try again.", "danger"); }
      return false;
    }
    const item = this.newItem(labId);
    this.data.unshift(item);
    this.render();
    updateSaveButtons(labId, true);
    showToast(`Saved ${name} to your Research Tracker`, "success");
    await this.persist(item);
    return true;
  },

  async addLab(labId, status = "considering", notes = "") {
    if (!Auth.require("Sign in to save labs to your tracker.")) return;
    let item = this.data.find(i => i.labId === labId);
    if (item) {
      item.status = status;
      if (notes) item.notes = notes;
    } else {
      item = this.newItem(labId, status, notes);
      this.data.unshift(item);
    }
    this.render();
    updateSaveButtons(labId, true);
    await this.persist(item);
  },

  async toggleFavorite(labId) {
    const item = this.data.find(d => d.labId === labId);
    if (!item) return;
    item.favorite = !item.favorite;
    this.render();
    await this.persist(item);
  },

  async updateStatus(labId, newStatus) {
    const item = this.data.find(d => d.labId === labId);
    if (!item || !TRACKER_STATUSES[newStatus]) return;
    item.status = newStatus;
    this.render();
    showToast("Application status updated", "info");
    await this.persist(item);
  },

  async updateNotes(labId, newNotes) {
    const item = this.data.find(d => d.labId === labId);
    if (!item || item.notes === newNotes) return;
    item.notes = String(newNotes).slice(0, 5000);
    await this.persist(item);
    showToast("Notes saved", "success");
  },

  async remove(labId) {
    this.data = this.data.filter(d => d.labId !== labId);
    this.render();
    updateSaveButtons(labId, false);
    showToast("Removed from tracker", "info");
    try { await this.store.remove(labId, this.data); } catch (e) { console.error(e); showToast("Couldn't remove that lab. Try again.", "danger"); }
  },

  setView(view) {
    this.view = view;
    this.render();
  },

  exportJSON() {
    const exportBlob = new Blob([JSON.stringify(this.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(exportBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bc-research-tracker-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Tracker exported as JSON file", "success");
  },

  render() {
    const container = document.getElementById("trackerList");
    const countBadge = document.getElementById("savedTrackerCount");
    const emptyState = document.getElementById("trackerEmptyState");
    const viewBar = document.getElementById("trackerViewBar");
    const modeNote = document.getElementById("trackerModeNote");
    if (!container) return;

    if (countBadge) countBadge.textContent = this.data.length;

    if (this.mode !== "account") {
      if (modeNote) modeNote.innerHTML = "";
      if (viewBar) viewBar.innerHTML = "";
      if (emptyState) emptyState.classList.add("d-none");
      container.innerHTML = `
        <div class="text-center py-5 bg-white rounded border">
          <div class="display-6 text-muted mb-2"><i class="bi bi-lock"></i></div>
          <h3 class="h5 text-dark">Sign in to use your Research Tracker</h3>
          <p class="text-muted small mb-3">Save labs, star favorites, track applications, and keep private notes. Available to Boston College students with a @bc.edu email.</p>
          ${typeof Auth !== "undefined" && Auth.enabled
            ? `<button type="button" class="btn btn-sm btn-maroon" onclick="Auth.openSignIn()"><i class="bi bi-person-circle me-1"></i>Sign in with your BC email</button>`
            : `<span class="small text-muted">Sign-in isn't switched on yet.</span>`}
        </div>`;
      return;
    }

    if (modeNote) modeNote.innerHTML = `<i class="bi bi-cloud-check me-1"></i>Saved to your account. Your list follows you to any device.`;

    const counts = {
      all: this.data.length,
      favorites: this.data.filter(i => i.favorite).length,
      applied: this.data.filter(i => ["applied", "interview", "joined"].includes(i.status)).length
    };
    if (viewBar) {
      const btn = (v, label, icon) => `<button type="button" class="btn btn-sm ${this.view === v ? "btn-maroon" : "btn-outline-maroon"}" onclick="ApplicationTracker.setView('${v}')" aria-pressed="${this.view === v}"><i class="bi ${icon} me-1"></i>${label} (${counts[v]})</button>`;
      viewBar.innerHTML = this.data.length ? btn("all", "All saved", "bi-bookmark") + btn("favorites", "Favorites", "bi-star-fill") + btn("applied", "Applied", "bi-send-check") : "";
    }

    let items = this.data;
    if (this.view === "favorites") items = items.filter(i => i.favorite);
    if (this.view === "applied") items = items.filter(i => ["applied", "interview", "joined"].includes(i.status));
    items = [...items].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));

    if (items.length === 0) {
      container.innerHTML = this.data.length
        ? `<p class="text-muted small py-3 mb-0">Nothing here yet. ${this.view === "favorites" ? "Tap the star on a saved lab to favorite it." : "Set a lab's status to Applied once you've applied."}</p>`
        : "";
      if (emptyState) emptyState.classList.toggle("d-none", this.data.length > 0);
      return;
    }
    if (emptyState) emptyState.classList.add("d-none");

    let html = "";
    items.forEach(item => {
      const prof = BC_FACULTY_DATA.find(f => f.id === item.labId);
      if (!prof) return;
      const options = Object.entries(TRACKER_STATUSES).map(([v, s]) => `<option value="${v}" ${item.status === v ? "selected" : ""}>${s.text}</option>`).join("");

      html += `
        <div class="card mb-3 shadow-sm tracker-card ${item.favorite ? "border-warning" : "border-primary-subtle"}">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <div class="d-flex align-items-start gap-2">
                <button type="button" class="btn btn-sm p-0 border-0" onclick="ApplicationTracker.toggleFavorite('${prof.id}')"
                        aria-pressed="${item.favorite}" aria-label="${item.favorite ? "Remove from favorites" : "Add to favorites"}: ${escapeHtml(prof.name)}"
                        title="${item.favorite ? "Favorite" : "Mark as favorite"}">
                  <i class="bi ${item.favorite ? "bi-star-fill text-warning" : "bi-star text-muted"} fs-5"></i>
                </button>
                <div>
                  <h3 class="h5 mb-1 text-maroon font-weight-bold">${escapeHtml(prof.name)}</h3>
                  <div class="text-muted small"><strong>${escapeHtml(prof.department)}</strong> · ${escapeHtml(prof.labName)}</div>
                  <span class="badge ${TRACKER_STATUSES[item.status] ? TRACKER_STATUSES[item.status].cls : TRACKER_STATUSES.considering.cls} mt-1">${(TRACKER_STATUSES[item.status] || TRACKER_STATUSES.considering).text}</span>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <select class="form-select form-select-sm" aria-label="Application status for ${escapeHtml(prof.name)}" onchange="ApplicationTracker.updateStatus('${prof.id}', this.value)" style="width: auto;">
                  ${options}
                </select>
                <button class="btn btn-outline-danger btn-sm" onclick="ApplicationTracker.remove('${prof.id}')" title="Remove from Tracker" aria-label="Remove ${escapeHtml(prof.name)} from tracker">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>

            <div class="row g-2 small text-muted my-2 bg-light p-2 rounded">
              <div class="col-md-4"><i class="bi bi-geo-alt me-1"></i> ${escapeHtml(prof.building)}${prof.room ? ", " + escapeHtml(prof.room) : ""}</div>
              <div class="col-md-4"><i class="bi bi-envelope me-1"></i> ${prof.email ? `<a href="mailto:${escapeHtml(prof.email)}" class="text-decoration-none">${escapeHtml(prof.email)}</a>` : "Email not listed"}</div>
              <div class="col-md-4"><i class="bi bi-clock me-1"></i> Added: ${escapeHtml(item.addedAt)}</div>
            </div>

            <div class="mt-3">
              <label class="form-label small text-muted fw-bold mb-1" for="notes-${prof.id}">Personal Notes &amp; Next Steps:</label>
              <textarea class="form-control form-control-sm" rows="2" id="notes-${prof.id}" maxlength="5000"
                placeholder="e.g. Sent email on 10/28 with CV. Following up next Tuesday if no response..."
                onblur="ApplicationTracker.updateNotes('${prof.id}', this.value)">${escapeHtml(item.notes)}</textarea>
            </div>

            <div class="d-flex justify-content-end align-items-center mt-3 pt-2 border-top gap-2">
              <button class="btn btn-sm btn-outline-primary" onclick="ApplyHandler.open('${prof.id}')">
                <i class="bi bi-box-arrow-up-right me-1"></i> Apply / Contact
              </button>
              <button class="btn btn-sm btn-outline-secondary" onclick="viewProfessorDetail('${prof.id}')">
                <i class="bi bi-info-circle me-1"></i> Details
              </button>
            </div>
          </div>
        </div>`;
    });
    container.innerHTML = html;
  }
};
