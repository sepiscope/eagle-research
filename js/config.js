/**
 * Site configuration.
 *
 * BC-only sign-in, faculty contact details, and saved labs use Supabase.
 * See SETUP-ACCOUNTS.md for where to find these values.
 *
 * Both values are safe to publish: the publishable key only allows what the
 * database's rules permit (contact details only for signed-in @bc.edu accounts;
 * each student can read and write only their own saved labs).
 * Never put a secret / "service_role" key here.
 *
 * If these are blank, sign-in is switched off: visitors can browse, but contact
 * details and saving stay locked.
 */
window.BC_RESEARCH_CONFIG = {
  supabaseUrl: "https://dnhtdnkogsnbambhlixk.supabase.co",
  supabaseAnonKey: "sb_publishable_W2yVfO_YhSuOUPtFAA005Q_8-BQ02Nb",   // publishable key (safe to publish)
  allowedEmailDomain: "bc.edu",
  // Where "Report a problem" emails go (e.g. the site's Gmail). Leave blank to hide the report links.
  contactEmail: "bceagleresearch@gmail.com"
};
