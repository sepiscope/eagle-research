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
  // The site's inbox. Shown as a fallback if a report can't be sent.
  contactEmail: "bceagleresearch@gmail.com",
  // Web3Forms access key (web3forms.com): lets the "Report a problem" pop-up deliver
  // reports to the inbox above. Safe to publish (it can only send email to that inbox).
  // Blank = report links open the student's own email app instead.
  reportFormKey: "e006cfdd-d244-4cd6-a8cf-c41804b4566e"
};
