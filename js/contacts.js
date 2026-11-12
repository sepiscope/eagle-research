/**
 * Faculty contact details are only available to signed-in @bc.edu students.
 *
 * The public data file (js/data.js) has no emails, phones, offices, application
 * instructions, or profile/lab/ORCID links. After sign-in, this loads them from the
 * Supabase table `faculty_contacts` (readable only by @bc.edu accounts) and merges
 * them into the faculty records. On sign-out they're removed again.
 */
const Contacts = {
  loaded: false,
  TOP_KEYS: ["email", "phone", "building", "room", "bcProfileUrl", "labWebsiteUrl", "formUrl", "applicationInstructions", "applicationProcess"],

  async load(client) {
    const { data, error } = await client.from("faculty_contacts").select("id,data");
    if (error) throw error;
    const byId = new Map((data || []).map(r => [r.id, r.data || {}]));
    BC_FACULTY_DATA.forEach(p => {
      const c = byId.get(p.id);
      if (!c) return;
      this.TOP_KEYS.forEach(k => { if (c[k] !== undefined) p[k] = c[k]; });
      if (p.orcid && c.orcidUrl) p.orcid.url = c.orcidUrl;
      if (p.undergradHistory && c.undergradSource) p.undergradHistory.source = c.undergradSource;
      if (p.pay && c.paySource) p.pay.source = c.paySource;
    });
    if (typeof BC_DEPT_NOTES !== "undefined") {
      Object.keys(BC_DEPT_NOTES).forEach(id => {
        const c = byId.get("dept:" + id);
        if (c && c.contact) BC_DEPT_NOTES[id].contact = c.contact;
      });
    }
    this.loaded = true;
  },

  clear() {
    BC_FACULTY_DATA.forEach(p => {
      this.TOP_KEYS.forEach(k => { delete p[k]; });
      if (p.orcid) delete p.orcid.url;
      if (p.undergradHistory) delete p.undergradHistory.source;
      if (p.pay) delete p.pay.source;
    });
    if (typeof BC_DEPT_NOTES !== "undefined") Object.values(BC_DEPT_NOTES).forEach(n => { n.contact = null; });
    this.loaded = false;
  }
};

// True when the visitor is signed in with a BC account and contact details are loaded.
function canSeeContacts() {
  return !!(typeof Auth !== "undefined" && Auth.user && Contacts.loaded);
}

// Small "sign in to see this" prompt used wherever contact details would appear.
function signInPromptHtml(what = "contact details and links") {
  if (typeof Auth !== "undefined" && Auth.enabled) {
    return `<button type="button" class="btn btn-link btn-sm p-0 align-baseline text-maroon" onclick="Auth.openSignIn()"><i class="bi bi-lock-fill me-1"></i>Sign in with your BC email to see ${what}</button>`;
  }
  return `<span class="small text-muted"><i class="bi bi-lock-fill me-1"></i>${what.charAt(0).toUpperCase() + what.slice(1)} are available to signed-in BC students</span>`;
}
