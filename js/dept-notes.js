/**
 * Department notes: how undergraduate research works in each department.
 * Every fact is taken from the cited BC page (checked 2026-11-10). Where a
 * department publishes nothing specific, the note says so instead of guessing.
 */
const BC_DEPT_NOTES_CHECKED = "2026-11-10";

// Applies to every department; shown under each department's own note.
const BC_RESEARCH_GENERAL = {
  title: "How undergraduate research works at BC",
  points: [
    "Most positions are never posted. Students usually find a spot by emailing a professor whose work interests them.",
    "Undergraduate Research Fellowships (URF) pay students to assist with faculty research, but the professor applies for the funding, not the student, so talk to professors first. URF work ordinarily earns pay, not academic credit.",
    "URF funding is reviewed three times a year (fall, spring, and summer terms), so reach out about a semester before you want to start.",
    "Other BC funding: Advanced Study Grants for student-designed summer projects (you need a faculty nominator) and Conference Travel Grants (up to 50% of costs, $500 maximum) for presenting your research."
  ],
  sources: [
    { label: "University Fellowships Committee: Undergraduate Research Support", url: "https://bc.edu/bc-web/academics/sites/office-of-provost/about/provost-committees/university-fellowship-committee/undergraduate-research-support.html" }
  ]
};

const BC_DEPT_NOTES = {
  "cs": {
    points: [
      "The department doesn't publish a central list of research openings. Contact faculty directly.",
      "Honors thesis: juniors and seniors with at least a 3.3 GPA in CS courses. A faculty advisor and the Honors committee must approve a Morrissey contract form by the end of junior year (submit it to Mary Mulkeen in the CS main office).",
      "Senior year: two sections of CSCI4961 Honors Thesis, a written thesis due the last day of classes in spring, and an oral presentation."
    ],
    contact: null,
    sources: [{ label: "CS Honors Thesis", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/computer-science/academics/honors.html" }]
  },
  "biology": {
    points: [
      "Find a Biology faculty member who agrees to supervise you. Students often start in sophomore year.",
      "For credit: 3 credits per semester and at least 10 hours a week. Two semesters can satisfy the advanced-experience requirement. File a research contract before or during registration.",
      "Paid: professors may select students as paid Undergraduate Research Fellows. Paid positions can't also count for credit.",
      "Off-campus research for credit is allowed if it's an unpaid biological research lab (not a clinic) with a PhD or MD mentor. Clinical research doesn't count.",
      "Senior thesis: BIOL4962 in your final semester (faculty decide; no minimum GPA). Undergraduate Research Day is the first Friday in May."
    ],
    contact: null,
    sources: [{ label: "Biology: Research Experience", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/biology/undergraduate/for-current-students/research-experience.html" }]
  },
  "psychology": {
    points: [
      "Start looking in sophomore year and aim to be in a lab by junior year. The department notes that positions fill quickly and can take one to two semesters to secure.",
      "The department keeps a jobs board and a Job Postings folder (linked from its Undergraduate menu).",
      "Three ways in: volunteer (sometimes as little as 4-5 hours a week), course credit through PSYC2205 or PSYC2206 (about 8-10 hours a week, up to 3 credits, after your mentor approves a contract), or a paid role in some labs. You can't be paid and get credit for the same hours.",
      "Honors: eligible students are invited at the end of sophomore year. Thesis proposals are due in April of junior year."
    ],
    contact: null,
    sources: [{ label: "Psychology & Neuroscience: Academic Opportunities", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/psychology-neuroscience/undergraduate/academic-opportunities.html" }]
  },
  "physics": {
    points: [
      "The department says it will \"make every effort to find a suitable research opportunity for all interested students.\"",
      "Positions are paid and available in fall, spring, and summer. You must be at least a sophomore.",
      "Review faculty and research-group pages, then contact several professors directly."
    ],
    contact: null,
    sources: [{ label: "Physics: Undergraduate Research", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/physics/undergraduate/research-guarantee.html" }]
  },
  "chemistry": {
    points: [
      "Contact individual faculty about a spot in their research group several months before you want to start.",
      "For credit, a Research Course Contract is due by the Friday of the first week of classes. Submit it to Lynne Houlihan (Merkert 125).",
      "Off-campus research must be described to the Director of Undergraduate Studies (Lynne O'Connell).",
      "Summer: NSF REU application deadlines usually fall in February and March."
    ],
    contact: null,
    sources: [{ label: "Chemistry: Undergraduate Research", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/chemistry/academics/undergraduate/undergraduate-research.html" }]
  },
  "engineering": {
    points: [
      "The department doesn't publish an undergraduate research guide. Contact faculty directly.",
      "Research labs at 245 Beacon Street: Brace, Hira, Salifu, Gaudette, Hoar, Govindasamy, Pan, Henriques, and Ranger labs.",
      "Every engineering major completes a Senior Impact Project (the program's capstone)."
    ],
    contact: null,
    sources: [{ label: "Engineering: Research", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/engineering/research.html" }]
  },
  "earth": {
    points: [
      "\"Students are encouraged to conduct research with professors in the department.\"",
      "To find an advisor: read faculty websites, talk with current thesis students, attend the September colloquia, and \"knock on office doors, email, talk to faculty after class.\"",
      "Senior thesis: EESC5595 each semester of senior year. A course contract and 2-3 page proposal are due by fall drop/add, and the thesis is due April 20. Department Honors needs a 3.3 GPA in the major and 3.2 overall.",
      "Funding: an Advanced Study Grant (apply in spring of junior year) for summer research, and a Thesis Research Grant in fall of senior year."
    ],
    contact: null,
    sources: [{ label: "EESC Undergraduate Program", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/eesc/undergraduate.html" }]
  },
  "economics": {
    points: [
      "Economics has a central route: submit the department's Undergraduate Research Fellowship application, and the Director of Undergraduate Studies (Prof. Donald Cox) shares it with faculty. Interested faculty contact you, and if it's a match they apply for the fellowship with you as their assistant. The role is paid hourly.",
      "Fellowships typically go to Morrissey College rising sophomores, juniors, and seniors. Faculty generally prefer students who have finished Theory and Econometrics.",
      "You can also contact faculty directly about paid or unpaid research assistance."
    ],
    contact: null,
    sources: [{ label: "Economics: Research Opportunities & Internships", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/economics/undergraduate/research.html" }]
  },
  "sociology": {
    points: [
      "Professors must apply for research-fellow funding a semester ahead. Contact them by March for summer work or by July for fall.",
      "Honors program: majors with a 3.5 GPA or higher are invited to apply in spring of sophomore year. It's a three-course sequence (SOCY4931, SOCY4961, SOCY4963), and you're matched with a faculty advisor in fall of junior year for a senior thesis."
    ],
    contact: null,
    sources: [
      { label: "Sociology: Research Opportunities", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/sociology/undergraduate/research-opportunities.html" },
      { label: "Sociology: Honors Program", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/sociology/undergraduate/honors-program.html" }
    ]
  },
  "polisci": {
    points: [
      "Undergraduate Research Fellowships: faculty select students. They're open to all full-time undergraduates, available fall, spring, and summer, and don't earn academic credit.",
      "Honors program: highly selective, by department invitation after sophomore year (about 15-20 students a year). An optional two-semester senior thesis runs as POLI4961 and POLI4962."
    ],
    contact: null,
    sources: [{ label: "Political Science: Special Programs", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/political-science/undergraduate/special-programs.html" }]
  },
  "history": {
    points: [
      "Honors thesis: open to majors with a 3.5 History GPA, who apply in junior year.",
      "Talk with faculty who share your interests in fall of junior year. In March, submit a 5-7 page proposal with a bibliography to your prospective advisor. Research runs over the summer, followed by the honors seminar in senior fall and HIST4962 in senior spring.",
      "Eligible seniors can instead write a 12-credit Scholar of the College thesis."
    ],
    contact: null,
    sources: [{ label: "History: Honors Program Senior Thesis", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/history/undergraduate/major/honors-program.html" }]
  },
  "theology": {
    points: [
      "Three thesis options: Standard (3 credits, one semester, 30-45 pages), Honors (6 credits, two semesters, 60-70 pages), and Scholar of the College (12 credits, requires a 3.7 GPA).",
      "Find a faculty advisor by April 15 of junior year. The Director of Undergraduate Studies can help you choose."
    ],
    contact: null,
    sources: [{ label: "Theology: Thesis Guidelines", url: "https://www.bc.edu/content/bc-web/schools/morrissey/departments/theology/undergraduate/thesis-guidelines.html" }]
  },
  "philosophy": {
    points: [
      "The department doesn't describe a research-assistant program. Contact faculty directly.",
      "Honors program: by invitation (based on GPA and/or faculty nomination), sent in fall of junior year, with applications early in junior spring. Honors students write a 50-75 page thesis with a faculty mentor in senior year, starting with an honors seminar in the fall."
    ],
    contact: null,
    sources: [{ label: "University Catalog: Philosophy", url: "https://www.bc.edu/content/bc-web/academics/sites/university-catalog/undergraduate/mcas/philosophy.html" }]
  },
  "stm-theology": {
    points: [
      "The Clough School of Theology and Ministry is a graduate school, and its research opportunities are aimed at master's and doctoral students.",
      "Undergraduates interested in theology research usually work through the Morrissey College Theology Department (see the Theology note). You can still email Clough School faculty whose work interests you."
    ],
    contact: null,
    sources: [{ label: "Clough School: Student Research", url: "https://www.bc.edu/content/bc-web/schools/stm/faculty/student-research.html" }]
  },
  "nursing": {
    points: [
      "Undergraduate Research Fellows: nursing students \"in excellent academic standing\" may apply to assist faculty on a faculty-directed research project.",
      "Independent study (NURS4911): juniors and seniors can propose a project in a nursing area of interest, graded pass/fail. Talk with your academic advisor first."
    ],
    contact: null,
    sources: [{ label: "University Catalog: Connell School of Nursing", url: "https://www.bc.edu/content/bc-web/academics/sites/university-catalog/undergraduate/cson.html" }]
  },
  "education": {
    points: [
      "The Lynch School lists research assistantships among its undergraduate opportunities but doesn't publish a central application. Contact faculty directly or ask the Office of Undergraduate Programs.",
      "Many Lynch labs list current or former undergraduate research assistants. Look for the \"Invites Undergrads\" and \"Has Taken Undergrads\" badges."
    ],
    contact: null,
    sources: [{ label: "Lynch School: Undergraduate", url: "https://www.bc.edu/content/bc-web/schools/lynch-school/academics/undergraduate.html" }]
  },
  "csom-mgmt": {
    points: [
      "We couldn't find a Carroll School page about undergraduates assisting faculty research. Contact faculty directly. BC's university-wide Undergraduate Research Fellowship (below) is the main funded route."
    ],
    contact: null,
    sources: [{ label: "Carroll School: Faculty Research", url: "https://www.bc.edu/content/bc-web/schools/carroll-school/faculty-research/Faculty-Research.html" }]
  }
};

if (typeof window !== "undefined") {
  window.BC_DEPT_NOTES = BC_DEPT_NOTES;
  window.BC_RESEARCH_GENERAL = BC_RESEARCH_GENERAL;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BC_DEPT_NOTES, BC_RESEARCH_GENERAL, BC_DEPT_NOTES_CHECKED };
}
