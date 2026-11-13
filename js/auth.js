/**
 * Student accounts: passwordless sign-in with a @bc.edu email link (Supabase Auth).
 * Disabled automatically when js/config.js has no Supabase keys.
 */
const Auth = {
  client: null,
  user: null,
  enabled: false,

  init() {
    const cfg = window.BC_RESEARCH_CONFIG || {};
    this.domain = (cfg.allowedEmailDomain || "bc.edu").toLowerCase();
    this.enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
    this.renderNav();
    if (!this.enabled) return;

    this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    this.client.auth.onAuthStateChange((event, session) => {
      const newUser = session ? session.user : null;
      const changed = (newUser && newUser.id) !== (this.user && this.user.id);
      this.user = newUser;
      this.renderNav();
      if (!changed) return;
      this.onUserChanged(event);
    });
  },

  async onUserChanged(event) {
    if (this.user) {
      try { await Contacts.load(this.client); }
      catch (e) { console.error(e); showToast("Signed in, but contact details couldn't be loaded. Try refreshing.", "warning"); }
      await ApplicationTracker.useAccount(this.client);
      if (event === "SIGNED_IN") showToast(`Signed in as ${this.user.email}`, "success");
    } else {
      Contacts.clear();
      // Wipe contact details left inside closed pop-ups from the signed-in session
      ["applyActionButtonsContainer", "applyInstructionsText", "applyProfLocation", "detailProfLocation", "detailProfEmail", "detailProfPhone", "detailApplyProcess"]
        .forEach(id => { const el = document.getElementById(id); if (el) { el.innerHTML = ""; el.removeAttribute("href"); } });
      ["detailProfBcLink", "detailProfLabLink", "detailProfOrcidLink"].forEach(id => document.getElementById(id)?.removeAttribute("href"));
      await ApplicationTracker.useGuest();
    }
    if (typeof renderFacultyList === "function") renderFacultyList(true);
  },

  // Gate for anything that reveals faculty contact info or saves data.
  // Returns true if the visitor may proceed; otherwise opens the sign-in prompt.
  require(reason) {
    if (canSeeContacts()) return true;
    if (this.enabled) this.openSignIn(reason);
    else showToast("This is available to signed-in BC students once accounts are switched on.", "info");
    return false;
  },

  validEmail(email) {
    const e = String(email || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+$/.test(e) && e.endsWith("@" + this.domain);
  },

  openSignIn(reason) {
    if (!this.enabled) { showToast("Sign-in isn't switched on yet.", "info"); return; }
    const modalEl = document.getElementById("signInModal");
    const reasonEl = document.getElementById("signInReason");
    if (reasonEl) reasonEl.textContent = reason ? reason + " " : "";
    document.getElementById("signInForm").classList.remove("d-none");
    document.getElementById("signInSent").classList.add("d-none");
    document.getElementById("signInError").textContent = "";
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
    setTimeout(() => document.getElementById("signInEmail")?.focus(), 300);
  },

  async sendLink(event) {
    event.preventDefault();
    const input = document.getElementById("signInEmail");
    const errEl = document.getElementById("signInError");
    const btn = document.getElementById("signInSubmit");
    const email = input.value.trim().toLowerCase();
    errEl.textContent = "";
    if (!this.validEmail(email)) {
      errEl.textContent = `Please use your @${this.domain} email address.`;
      input.focus();
      return;
    }
    btn.disabled = true;
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    btn.disabled = false;
    if (error) {
      errEl.textContent = /rate|security purposes/i.test(error.message)
        ? "Please wait a minute before requesting another link."
        : /database error/i.test(error.message)
          ? `Only @${this.domain} addresses can create accounts.`
          : "Couldn't send the sign-in link. Please try again.";
      return;
    }
    this.pendingEmail = email;
    document.getElementById("signInSentTo").textContent = email;
    document.getElementById("signInCode").value = "";
    document.getElementById("signInCodeError").textContent = "";
    document.getElementById("signInForm").classList.add("d-none");
    document.getElementById("signInSent").classList.remove("d-none");
    setTimeout(() => document.getElementById("signInCode")?.focus(), 100);
  },

  // Sign in on THIS device with the code from the email (for when the email is opened on another device)
  async verifyCode(event) {
    event.preventDefault();
    const input = document.getElementById("signInCode");
    const errEl = document.getElementById("signInCodeError");
    const btn = document.getElementById("signInCodeSubmit");
    const token = input.value.replace(/\D/g, "");
    errEl.textContent = "";
    if (token.length < 6) { errEl.textContent = "Enter the code from the email."; input.focus(); return; }
    btn.disabled = true;
    const { error } = await this.client.auth.verifyOtp({ email: this.pendingEmail, token, type: "email" });
    btn.disabled = false;
    if (error) {
      errEl.textContent = /expired|invalid/i.test(error.message)
        ? "That code is wrong or has expired. Check it, or use a different email to request a new one."
        : "Couldn't sign in with that code. Please try again.";
      input.focus();
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById("signInModal"))?.hide();
  },

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
    // Close any professor pop-ups that may be showing contact details
    document.querySelectorAll(".modal.show").forEach(m => bootstrap.Modal.getInstance(m)?.hide());
    showToast("Signed out. Your saved labs stay in your account.", "info");
  },

  openDeleteAccount() {
    if (!this.client || !this.user) return;
    document.getElementById("deleteAccountEmail").textContent = this.user.email || "";
    document.getElementById("deleteAccountCount").textContent = (ApplicationTracker.data || []).length;
    document.getElementById("deleteAccountConfirm").value = "";
    document.getElementById("deleteAccountError").textContent = "";
    document.getElementById("deleteAccountSubmit").disabled = false;
    bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteAccountModal")).show();
    setTimeout(() => document.getElementById("deleteAccountConfirm")?.focus(), 300);
  },

  // Permanently deletes the signed-in student's account and saved labs (database function delete_my_account)
  async deleteAccount(event) {
    event.preventDefault();
    const input = document.getElementById("deleteAccountConfirm");
    const errEl = document.getElementById("deleteAccountError");
    const btn = document.getElementById("deleteAccountSubmit");
    errEl.textContent = "";
    if (input.value.trim().toUpperCase() !== "DELETE") {
      errEl.textContent = "Type DELETE to confirm.";
      input.focus();
      return;
    }
    if (!this.client || !this.user) { errEl.textContent = "You're not signed in."; return; }
    btn.disabled = true;
    const { error } = await this.client.rpc("delete_my_account");
    if (error) {
      console.error(error);
      btn.disabled = false;
      errEl.textContent = "Couldn't delete your account. Please try again, or use Report a problem in the footer.";
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById("deleteAccountModal"))?.hide();
    // The account no longer exists on the server; just clear this browser's sign-in
    try { await this.client.auth.signOut({ scope: "local" }); } catch (e) { console.error(e); }
    document.querySelectorAll(".modal.show").forEach(m => bootstrap.Modal.getInstance(m)?.hide());
    showToast("Your account and saved labs were permanently deleted.", "info");
  },

  renderNav() {
    const slot = document.getElementById("accountNavSlot");
    if (!slot) return;
    if (!this.enabled) { slot.innerHTML = ""; return; }
    if (!this.user) {
      slot.innerHTML = `<button type="button" class="btn btn-gold btn-sm fw-semibold ms-lg-2" onclick="Auth.openSignIn()"><i class="bi bi-person-circle me-1"></i>Sign in</button>`;
      return;
    }
    const email = escapeHtml(this.user.email || "");
    slot.innerHTML = `
      <div class="dropdown ms-lg-2">
        <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-display="static" aria-expanded="false" aria-label="Account menu for ${email}">
          <i class="bi bi-person-check me-1"></i><span class="d-none d-xl-inline">${email}</span><span class="d-xl-none">Account</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-start dropdown-menu-lg-end account-menu">
          <li><span class="dropdown-item-text small text-muted">Signed in as<br><strong class="text-break">${email}</strong></span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#saved"><i class="bi bi-bookmark-star me-2"></i>My Saved Labs</a></li>
          <li><button class="dropdown-item" type="button" onclick="Auth.signOut()"><i class="bi bi-box-arrow-right me-2"></i>Sign out</button></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger small" type="button" onclick="Auth.openDeleteAccount()"><i class="bi bi-trash me-2"></i>Delete account…</button></li>
        </ul>
      </div>`;
  }
};
