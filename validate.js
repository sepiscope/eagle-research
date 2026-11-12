const fs = require('fs');

const files = [
  'js/data.js',
  'js/dept-notes.js',
  'js/config.js',
  'js/auth.js',
  'js/contacts.js',
  'js/tracker.js',
  'js/email-generator.js',
  'js/audit-view.js',
  'js/app.js',
  'server.js'
];

let allPassed = true;
files.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    new Function(code);
    console.log(`[PASS] Syntax check: ${file}`);
  } catch (err) {
    console.error(`[FAIL] Syntax check: ${file}: ${err.message}`);
    allPassed = false;
  }
});

try {
  const { BC_FACULTY_DATA, BC_DEPARTMENTS, BC_SCHOOLS, getBCStats } = require('./js/data.js');
  console.log(`[PASS] Successfully loaded ${BC_FACULTY_DATA.length} professors across ${BC_DEPARTMENTS.length} department categories and ${BC_SCHOOLS.length} school categories.`);
  
  const stats = getBCStats();
  console.log(`[PASS] Statistics dashboard:`, stats);
  
  // Verify all data fields have proper integrity, allowing verified ORCID or null
  const validStatuses = new Set(["recruiting", "inquire", "stale", "full", "future", "inactive"]);
  const validSchools = new Set(BC_SCHOOLS.map(s => s.id).filter(id => id !== "all"));
  const validDisciplineTypes = new Set(["stem", "social", "humanities"]);

  BC_FACULTY_DATA.forEach(prof => {
    if (!prof.id || !prof.name || !prof.department || !prof.labName || !prof.lastUpdated) {
      throw new Error(`Incomplete professor entry: ${JSON.stringify(prof)}`);
    }
    if (!validStatuses.has(prof.status)) {
      throw new Error(`Unknown status "${prof.status}" on professor: ${prof.name}`);
    }
    // Validate school field
    if (!prof.school || !validSchools.has(prof.school)) {
      throw new Error(`Missing or invalid school "${prof.school}" on professor: ${prof.name}`);
    }
    // Validate disciplineType field
    if (!prof.disciplineType || !validDisciplineTypes.has(prof.disciplineType)) {
      throw new Error(`Missing or invalid disciplineType "${prof.disciplineType}" on professor: ${prof.name}`);
    }
    if (prof.orcid !== null) {
      if ((!prof.orcid.id && !prof.orcid.researchActive) || typeof prof.orcid.researchActive !== 'boolean') {
        throw new Error(`Missing or invalid ORCID record for: ${prof.name}`);
      }
      if (!prof.orcid.researchActive && !prof.orcid.inactivityWarning) {
        throw new Error(`Inactive ORCID professor missing inactivity warning explanation: ${prof.name}`);
      }
    }
  });
  console.log(`[PASS] Verified integrity of all ${BC_FACULTY_DATA.length} professor records (school, disciplineType, ORCID)!`);
  const inquireCount = stats.inquire || 0;
  console.log(`[PASS] Status breakdown — Recruiting: ${stats.recruiting}, No Posted Openings: ${inquireCount}, Stale: ${stats.stale}, Full: ${stats.full}, Future: ${stats.future}`);
  console.log(`[PASS] ORCID Active: ${stats.orcidActive}, ORCID Inactive: ${stats.orcidInactive}, ORCID Unlisted/Null: ${stats.total - stats.orcidActive - stats.orcidInactive}`);

  // School distribution
  const schoolDist = {};
  BC_FACULTY_DATA.forEach(f => { schoolDist[f.school] = (schoolDist[f.school] || 0) + 1; });
  console.log(`[PASS] School distribution:`, schoolDist);

} catch (err) {
  console.error(`[FAIL] Data import error:`, err);
  allPassed = false;
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log(`\n>>> [SUCCESS] All validation tests passed cleanly! <<<`);
}
