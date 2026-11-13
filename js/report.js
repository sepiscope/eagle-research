/**
 * "Report a problem" pop-up.
 * Reports are sent to the site inbox (config.contactEmail) by Web3Forms (web3forms.com),
 * using the public access key in config.reportFormKey. No server needed.
 * If no key is set, the report links fall back to opening an email (mailto).
 */
const Report = {
  context: null,      // { kind, prof }
  lastSentAt: 0,

  config() { return window.BC_RESEARCH_CONFIG || {}; },
  enabled() { return !!(this.config().reportFormKey || "").trim(); },

  // kind: "general" | "listing" | "account"
  open(kind, prof) {
    if (!this.enabled()) {
      const href = reportMailto(kind === "account" ? "delete" : kind, prof);
      if (href) window.location.href = href;
      return;
    }
    this.context = { kind, prof: prof || null };
    const about = document.getElementById("reportAbout");
    if (kind === "listing" && prof) {
      about.innerHTML = `<i class="bi bi-person-badge me-1"></i>About: <strong>${escapeHtml(prof.name)}</strong> · ${escapeHtml(prof.department)}`;
      about.classList.remove("d-none");
    } else {
      about.innerHTML = "";
      about.classList.add("d-none");
    }
    document.getElementById("reportType").value =
      kind === "listing" ? "Wrong or outdated professor info" : kind === "account" ? "Sign-in or account" : "Something on the site isn't working";
    document.getElementById("reportMessage").value = kind === "account" ? "Please delete my EagleResearch account and saved labs.\n" : "";
    const emailEl = document.getElementById("reportEmail");
    emailEl.value = (typeof Auth !== "undefined" && Auth.user && Auth.user.email) || "";
    document.getElementById("reportBotcheck").checked = false;
    document.getElementById("reportError").textContent = "";
    document.getElementById("reportSubmit").disabled = false;
    document.getElementById("reportForm").classList.remove("d-none");
    document.getElementById("reportSent").classList.add("d-none");

    // close the professor pop-up first so the two don't stack
    document.querySelectorAll(".modal.show").forEach(m => { if (m.id !== "reportModal") bootstrap.Modal.getInstance(m)?.hide(); });
    bootstrap.Modal.getOrCreateInstance(document.getElementById("reportModal")).show();
    setTimeout(() => document.getElementById("reportMessage")?.focus(), 300);
  },

  async submit(event) {
    event.preventDefault();
    const errEl = document.getElementById("reportError");
    const btn = document.getElementById("reportSubmit");
    const msgEl = document.getElementById("reportMessage");
    const emailEl = document.getElementById("reportEmail");
    const message = msgEl.value.trim();
    const email = emailEl.value.trim();
    errEl.textContent = "";

    if (message.length < 5) { errEl.textContent = "Please describe the problem."; msgEl.focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = "That email address doesn't look right (or leave it blank)."; emailEl.focus(); return; }
    if (Date.now() - this.lastSentAt < 30000) { errEl.textContent = "You just sent a report. Please wait a few seconds before sending another."; return; }

    const type = document.getElementById("reportType").value;
    const prof = this.context && this.context.prof;
    const payload = {
      access_key: this.config().reportFormKey.trim(),
      subject: `EagleResearch report: ${type}${prof ? ` (${prof.name})` : ""}`,
      from_name: "EagleResearch site",
      "Problem type": type,
      "Message": message,
      "About listing": prof ? `${prof.name} · ${prof.department} · id: ${prof.id}` : "(none)",
      "Page": location.href,
      "Signed in": (typeof Auth !== "undefined" && Auth.user) ? "yes" : "no",
      botcheck: document.getElementById("reportBotcheck").checked
    };
    if (email) payload.email = email;   // becomes the reply-to address

    btn.disabled = true;
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
      this.lastSentAt = Date.now();
      document.getElementById("reportSentNote").textContent = email
        ? `We'll reply to ${email} if we need more details. Our reply comes from bceagleresearch@gmail.com, so check Junk/Spam too.`
        : "We'll look into it soon.";
      document.getElementById("reportForm").classList.add("d-none");
      document.getElementById("reportSent").classList.remove("d-none");
    } catch (e) {
      console.error(e);
      btn.disabled = false;
      const to = (this.config().contactEmail || "").trim();
      errEl.innerHTML = "Couldn't send your report. Check your connection and try again" +
        (to ? `, or email <a href="mailto:${escapeHtml(to)}">${escapeHtml(to)}</a>.` : ".");
    }
  }
};

// Wire up every "report" link on the page (footer, privacy pop-up, professor pop-up)
document.addEventListener("click", e => {
  const link = e.target.closest(".report-link");
  if (!link || !Report.enabled()) return;   // no key: the link keeps its mailto
  e.preventDefault();
  const kind = link.dataset.report === "delete" ? "account" : link.dataset.report;
  const prof = kind === "listing" && link.dataset.profId ? BC_FACULTY_DATA.find(f => f.id === link.dataset.profId) : null;
  Report.open(kind, prof);
});
