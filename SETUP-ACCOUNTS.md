# Turning on student accounts

Students sign in with a one-time link sent to their **@bc.edu** email (no passwords).

- **Anyone** can browse, search, and filter professors and read research summaries, badges, and evidence.
- **Only signed-in BC students** can see professor emails, phones, offices, profile/lab/ORCID links, and application instructions, and can apply, save labs, and use the tracker.

Professor contact details are **not** in the public website files. They're stored in Supabase and sent only to signed-in @bc.edu accounts, so a non-BC visitor can't get them by viewing the page source.

Until you finish these steps the site still loads for browsing, but contact details and saving stay locked for everyone.

You'll do two things: **(A)** create a free Supabase project (accounts and storage) and **(B)** publish the site on GitHub Pages (sign-in links need a real web address). Plan on 15–20 minutes. No command line or Git needed.

---

## A. Create the Supabase project

1. Go to **https://supabase.com**, sign up (free), and click **New project**.
   - Name: `eagleresearch` (anything works)
   - Database password: create one and save it somewhere safe (you won't need it for the site)
   - Region: **East US**
   - Wait about a minute for the project to finish setting up.

2. **Create the database table and rules.**
   In the left sidebar open **SQL Editor** → **New query**. Open `supabase/schema.sql` from this folder, copy all of it, paste it in, and click **Run**. You should see *"Success. No rows returned."*
   This creates the `saved_labs` table, makes each student's rows private to them, and blocks any non-@bc.edu address from creating an account.

3. **Check email sign-in is on.**
   **Authentication → Sign In / Providers → Email**: make sure **Email** is enabled. (Leave "Confirm email" on.)

4. **Load the professor contact details.**
   Still in **SQL Editor → New query**: open `private/faculty_contacts.sql` from this folder, copy all of it, paste, and click **Run**. You should see *"Success. No rows returned."* This loads 412 professors' contact details plus 12 department contacts into the protected `faculty_contacts` table.
   The `private` folder is only for you. **Never upload it to GitHub.**

5. **Copy your two keys into the site.**
   Go to **Project Settings → API** (on some dashboards: **Project Settings → Data API** and **API Keys**). Copy:
   - **Project URL**, which looks like `https://abcdefghijklmnop.supabase.co`
   - **anon public** key, a long string starting with `eyJ...`

   Open `js/config.js` and paste them between the quotes:
   ```js
   supabaseUrl: "https://abcdefghijklmnop.supabase.co",
   supabaseAnonKey: "eyJ...",
   ```
   The anon key is meant to be public; the database rules from step 2 are what keep data private.
   **Never** paste the `service_role` key anywhere in the site.

You'll come back to Supabase once more in step B5 to tell it the site's address.

> **If you update professor data later:** edit and re-run `private/faculty_contacts.sql` in the SQL Editor (it updates existing rows). The public `js/data.js` must never contain emails, phones, offices, or profile links.

---

## B. Publish the site on GitHub Pages

1. Go to **https://github.com**, sign in (or create a free account), click **+** → **New repository**.
   - Name: `bcresearch`
   - Visibility: **Public** (free GitHub Pages requires a public repository; there are no secrets in this project)
   - Leave "Add a README" unchecked, then click **Create repository**.

2. On the new, empty repository page click **uploading an existing file**.
   From your `bcResearch` folder, drag in: `index.html`, `README.md`, `SETUP-ACCOUNTS.md`, `server.js`, `start.bat`, `validate.js`, and the folders `css`, `js`, and `supabase`.
   **Don't upload the `private` or `outreach` folders.** `private` holds the professor contact details, and `outreach` is your personal email list.
   Click **Commit changes**.

3. **Turn on Pages:** repository **Settings → Pages**. Under *Build and deployment*, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, and click **Save**.
   After a minute the page shows your address, e.g. `https://yourname.github.io/bcresearch/`.

4. Open that address and check that the site loads.

5. **Tell Supabase your site's address.** In Supabase: **Authentication → URL Configuration**:
   - **Site URL**: `https://yourname.github.io/bcresearch/`
   - **Redirect URLs**: add the same address
   Click **Save**. Sign-in links will only send students back to this address.

6. **Test it.**
   - Signed out: open a professor's card. You should see "Sign in to contact this lab" and no email address.
   - Click **Sign in**, enter your @bc.edu email, and click the link in the email. You should land back on the site signed in, with your email in the top-right menu, and professor emails and links should now appear.
   - Save a lab, then sign in on your phone: the lab should be there.

### Updating the site later
Edit files on your computer, then in the repository click **Add file → Upload files** and drag in the changed files (same names replace the old ones). For a one-line change like `js/config.js`, you can also click the file on GitHub, then the pencil icon, edit, and commit.

---

## Good to know before launch

- **Email sending limits.** Supabase's built-in email sender is for testing and only sends a few sign-in emails per hour. Before sharing the site widely, connect a free email service (for example Resend or SendGrid) under **Project Settings → Authentication → SMTP Settings**. Otherwise students may wait for links that never arrive.
- **Free projects pause when idle.** A free Supabase project pauses after about a week with no activity; restore it from the Supabase dashboard. Regular use keeps it awake.
- **Branding the email (optional).** Under **Authentication → Email Templates → Magic Link** you can change the subject to something like "Your EagleResearch sign-in link".
- **What's stored about each student:** their email address (for sign-in) and, for each saved lab: the lab, status, favorite flag, notes, and dates. Nothing else. Deleting a user in **Authentication → Users** deletes their saved labs too.
- **Data protection is enforced by the database**, not just the website: a signed-in student can only read and change their own saved labs, and professor contact details can only be read by signed-in @bc.edu accounts. Nobody can change contact details from the website.
- **What this does and doesn't do:** it keeps this site from giving professor contact details to non-BC visitors. It doesn't make them secret: most are also listed in BC's public online directory.
