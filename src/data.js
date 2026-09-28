export const snapshotDate = "2026-09-26";

export const scholarships = [
  {
    id: "commonwealth",
    name: "Commonwealth Master's Scholarship",
    country: "United Kingdom",
    provider: "Commonwealth Scholarship Commission",
    status: "open",
    deadline: "2026-10-20",
    funding: "Full tuition + airfare + living stipend",
    fit: "strong",
    priority: 2,
    fitScore: 86,
    route: "Government / development impact",
    eligible: true,
    keyRisk: "Development-impact narrative must be specific, measurable and Bangladesh-focused.",
    whyFit: "Strong technical record plus a credible route to resource-efficient AI capacity and deployment impact in Bangladesh.",
    actions: [
      "Finalize four-part Bangladesh development-impact statement",
      "Lock eligible UK MSc choices and study-plan logic",
      "Confirm three referees and secure required uploaded references",
      "Complete CSC application and supporting evidence",
      "Complete Bangladesh UGC / nominating-agency requirements"
    ],
    source: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
    secondarySource: "https://ugc.gov.bd/notice/application-form-for-commonwealth-scholarships-uk-2027"
  },
  {
    id: "kaust",
    name: "KAUST MSc Fellowship",
    country: "Saudi Arabia",
    provider: "King Abdullah University of Science and Technology",
    status: "opens-soon",
    opens: "2026-09-28",
    deadline: "2027-01-03",
    funding: "Full tuition + stipend + housing + insurance + relocation",
    fit: "excellent",
    priority: 1,
    fitScore: 93,
    route: "Research / engineering",
    eligible: true,
    keyRisk: "Research fit, faculty/lab alignment and English evidence need to be explicit.",
    whyFit: "Your production AI, computer vision, efficient inference, model-compression and research experience map closely to KAUST's technical environment.",
    actions: [
      "Shortlist AI/CV/ML faculty and labs",
      "Finalize research-oriented CV and ~750-word SOP",
      "Prepare transcript with grading scale and passport",
      "Confirm three strong academic/research referees",
      "Secure IELTS/accepted English evidence and submit early"
    ],
    source: "https://admissions.kaust.edu.sa/how-to-apply/admission-timelines",
    secondarySource: "https://admissions.kaust.edu.sa/how-to-apply/entry-requirements"
  },
  {
    id: "mbzuai",
    name: "MBZUAI MSc + Merit Funding",
    country: "United Arab Emirates",
    provider: "Mohamed bin Zayed University of Artificial Intelligence",
    status: "open",
    deadline: "2026-12-15",
    funding: "Full funding possible via merit assistantship; not guaranteed for MSc",
    fit: "excellent",
    priority: 3,
    fitScore: 91,
    route: "AI research",
    eligible: true,
    keyRisk: "MSc admission does not automatically imply full funding.",
    whyFit: "Computer vision, multimodal AI, edge inference, deployment and research publications align directly with MBZUAI's domain focus.",
    actions: [
      "Target the strongest matching Computer Vision / ML pathway",
      "Emphasize publication + production AI combination",
      "Document your research contribution to each paper/project",
      "Prepare research statement and evidence package",
      "Verify assistantship/funding route during the application"
    ],
    source: "https://mbzuai.ac.ae/"
  },
  {
    id: "weidenfeld",
    name: "Oxford Weidenfeld-Hoffmann",
    country: "United Kingdom",
    provider: "University of Oxford",
    status: "open",
    deadline: "2027-01-06",
    funding: "100% course fees + living grant",
    fit: "strong-reach",
    priority: 4,
    fitScore: 79,
    route: "Academic excellence + leadership/public impact",
    eligible: true,
    keyRisk: "Oxford admission is highly selective and the public-impact case must extend beyond technical ambition.",
    whyFit: "MSc Advanced Computer Science is an eligible course and Bangladesh is an eligible country; your technical/research profile is credible.",
    actions: [
      "Build a 1–2 page Oxford-grade academic CV",
      "Prepare MSc Advanced Computer Science application",
      "Prepare Oxford SOP within the current word limit",
      "Frame a concrete public-impact and return-home case",
      "Select strongest academic/research referees and submit by funding deadline"
    ],
    source: "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/weidenfeld-hoffmann-scholarships-and-leadership-programme"
  },
  {
    id: "clarendon",
    name: "Oxford Clarendon Fund",
    country: "United Kingdom",
    provider: "University of Oxford",
    status: "open",
    deadline: "2027-01-06",
    funding: "Full course fees + living grant",
    fit: "reach",
    priority: 5,
    fitScore: 75,
    route: "Academic merit",
    eligible: true,
    keyRisk: "Requires exceptional academic standing within an already selective Oxford applicant pool.",
    whyFit: "Your publication and research/engineering trajectory make the application defensible despite elite competition.",
    actions: [
      "Maximize the Oxford course application rather than writing a separate Clarendon application",
      "Present publications and technical research contributions clearly",
      "Obtain high-specificity recommendation letters",
      "Ensure the academic statement demonstrates research maturity"
    ],
    source: "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon"
  },
  {
    id: "gates",
    name: "Gates Cambridge",
    country: "United Kingdom",
    provider: "University of Cambridge",
    status: "open",
    deadline: "2026-12-08",
    funding: "Full cost of study",
    fit: "reach",
    priority: 6,
    fitScore: 72,
    route: "Academic ability + leadership + social impact",
    eligible: true,
    keyRisk: "Leadership and social-impact evidence are less mature than your technical profile.",
    whyFit: "Academic/technical credentials are plausible; the Gates-specific case depends on authentic leadership and improving-lives evidence.",
    actions: [
      "Target MPhil Advanced Computer Science by the funding deadline",
      "Prepare the required brief research-project proposal",
      "Identify real leadership evidence not currently emphasized in the CV",
      "Prepare Gates-specific case and Gates reference",
      "Meet the Cambridge English-language requirement"
    ],
    source: "https://www.gatescambridge.org/",
    secondarySource: "https://www.postgraduate.study.cam.ac.uk/courses/directory/cscsmpacs"
  },
  {
    id: "khs",
    name: "Knight-Hennessy Scholars",
    country: "United States",
    provider: "Stanford University",
    status: "open",
    deadline: "2026-10-06",
    funding: "Tuition/fees + living stipend + annual travel + relocation",
    fit: "extreme-reach",
    priority: 7,
    fitScore: 64,
    route: "Leadership + civic mindset + graduate admission",
    eligible: true,
    keyRisk: "Very short runway; leadership/civic differentiation is essential and can consume time needed for stronger-fit applications.",
    whyFit: "Technically credible, but the scholarship's distinctive selection dimensions are not your strongest documented dimensions.",
    actions: [
      "Make an immediate go/no-go decision based on genuine leadership evidence",
      "Check Stanford graduate-program deadline alignment",
      "Prepare KHS-specific essays only if the evidence is strong enough",
      "Obtain highly specific recommendations",
      "Submit by 6 Oct 2026 if proceeding"
    ],
    source: "https://knight-hennessy.stanford.edu/admission"
  },
  {
    id: "chevening",
    name: "Chevening Scholarship",
    country: "United Kingdom",
    provider: "UK Government",
    status: "blocked",
    deadline: "2026-10-06",
    funding: "Fully funded",
    fit: "ineligible",
    priority: 99,
    fitScore: 0,
    route: "Leadership / professional experience",
    eligible: false,
    keyRisk: "Current cycle requires qualifying post-undergraduate work experience and degree-completion timing you do not meet.",
    whyFit: "Keep for a later cycle after satisfying the post-degree experience requirement.",
    actions: [
      "Do not invest application time this cycle",
      "Build post-graduation leadership and professional evidence",
      "Revisit in a future eligible year"
    ],
    source: "https://www.chevening.org/scholarship/bangladesh/",
    secondarySource: "https://www.chevening.org/scholarships/who-can-apply/work-experience/"
  },
  {
    id: "ediss",
    name: "Erasmus Mundus — EDISS",
    country: "Europe",
    provider: "Erasmus Mundus Joint Master",
    status: "upcoming",
    opens: "2026-11-16",
    deadline: "2027-01-12",
    funding: "Full Erasmus Mundus / EDISS scholarship route",
    fit: "strong",
    priority: 4,
    fitScore: 85,
    route: "Data-intensive intelligent software systems",
    eligible: true,
    keyRisk: "The evidence/attestation workload is heavier than a normal MSc application.",
    whyFit: "Excellent overlap with AI engineering, data-intensive software, distributed systems and production ML.",
    actions: [
      "Prepare EDISS CV template and motivation package",
      "Map coursework to programme prerequisites",
      "Prepare two academic recommendation letters",
      "Collect certified/attested academic and experience evidence",
      "Prepare 2-minute ±30-second motivation video and apply from 16 Nov"
    ],
    source: "https://www.master-ediss.eu/upcoming-application-rounds-ediss-intake-7/",
    secondarySource: "https://www.master-ediss.eu/admission-requirements/"
  },
  {
    id: "commonwealth-shared",
    name: "Commonwealth Shared Scholarship",
    country: "United Kingdom",
    provider: "Commonwealth Scholarship Commission + participating universities",
    status: "upcoming",
    funding: "Fully funded shared-scholarship route",
    fit: "strong",
    priority: 5,
    fitScore: 82,
    route: "Development impact + eligible taught Master's",
    eligible: true,
    timing: "2027/28 candidate applications are scheduled to open in early November 2026 and close in mid-December; exact dates and eligible courses are pending.",
    keyRisk: "The eligible university/course list is not published until November, so course fit cannot yet be finalized.",
    whyFit: "A second Commonwealth route can reuse your development-impact evidence while adding course-specific university selection.",
    actions: [
      "Watch the November 2026 eligible-course publication",
      "Shortlist AI/CS/data-intensive courses immediately after publication",
      "Reuse and adapt Commonwealth development-impact evidence",
      "Apply separately to the participating university course where required"
    ],
    source: "https://cscuk.fcdo.gov.uk/commonwealth-shared-scholarship-university-bids/"
  },
  {
    id: "mext",
    name: "MEXT Research Student Scholarship",
    country: "Japan",
    provider: "Government of Japan / Embassy of Japan in Bangladesh",
    status: "closed",
    funding: "Fully funded government scholarship",
    fit: "strong",
    priority: 20,
    fitScore: 84,
    route: "Research plan + related field",
    eligible: true,
    timing: "MEXT 2027 Embassy Recommendation for Research Students in Bangladesh is already closed. Watch the next embassy cycle and relevant university-recommendation routes.",
    keyRisk: "The 2027 Bangladesh embassy-recommendation application window is already closed.",
    whyFit: "Your bachelor's field, research record and AI/CV specialization are well suited to a research-plan-driven Japanese graduate route.",
    actions: [
      "Do not treat the closed 2027 embassy route as an active application",
      "Build a reusable Field of Study & Research Plan",
      "Map Japanese AI/CV labs and supervisors",
      "Watch the next Bangladesh embassy cycle and university-recommendation opportunities"
    ],
    source: "https://www.bd.emb-japan.go.jp/itpr_ja/00_000706.html"
  },
  {
    id: "stipendium",
    name: "Stipendium Hungaricum",
    country: "Hungary",
    provider: "Tempus Public Foundation / Bangladesh Ministry of Education",
    status: "watch",
    funding: "Government scholarship; verify the 2027/28 call package when published",
    fit: "strong",
    priority: 8,
    fitScore: 80,
    route: "Government scholarship + university programme",
    eligible: true,
    timing: "Bangladesh is an official sending partner and full-degree Master's study is available in any field of interest. The 2027/28 call is not yet confirmed in this dashboard.",
    keyRisk: "Do not assume the new cycle's dates or programme list before the official 2027/28 call is published.",
    whyFit: "Bangladesh eligibility is established and the broad Master's field coverage should include relevant computing/AI programmes.",
    actions: [
      "Watch the official 2027/28 call and Bangladesh sending-partner notice",
      "Identify English-taught CS/AI/Data Science Master's programmes",
      "Prepare the general academic packet now",
      "Verify programme-specific admission and language requirements after publication"
    ],
    source: "https://stipendiumhungaricum.hu/partners/"
  },
  {
    id: "turkiye",
    name: "Türkiye Scholarships — Graduate",
    country: "Türkiye",
    provider: "Türkiye Scholarships",
    status: "upcoming",
    opens: "2027-01-10",
    deadline: "2027-02-20",
    funding: "Tuition + Master's stipend + accommodation + health insurance + language course + flight",
    fit: "strong",
    priority: 9,
    fitScore: 78,
    route: "Government scholarship + university placement",
    eligible: true,
    timing: "The official programme states that graduate applications are received between 10 January and 20 February every year; confirm the 2027 announcement when released.",
    keyRisk: "University/programme choices offered in the system can depend on the applicant's academic background.",
    whyFit: "Engineering and natural-science Master's programmes are covered, and the centralized scholarship includes university placement.",
    actions: [
      "Watch for the specific 2027 announcement",
      "Prepare the academic/CV/reference packet before January",
      "Research AI/CS programmes likely to appear in the application system",
      "Tailor motivation and career-impact narrative for the centralized application"
    ],
    source: "https://www.turkiyeburslari.gov.tr/fulltimeprograms"
  },
  {
    id: "gks",
    name: "Global Korea Scholarship — Graduate (GKS-G)",
    country: "South Korea",
    provider: "Korean Government / NIIED",
    status: "watch",
    funding: "Government-funded graduate scholarship; verify 2027 call when published",
    fit: "strong",
    priority: 10,
    fitScore: 79,
    route: "Government scholarship + university/embassy track",
    eligible: true,
    timing: "The general 2027 GKS Graduate Degree call is not yet published. Current official notices show 2027 undergraduate calls and the latest general graduate cycle as 2026.",
    keyRisk: "Do not use the Korea–Japan 2027 graduate notice; that notice is specifically for Japanese applicants.",
    whyFit: "Korea has strong AI/CV graduate programmes and GKS-G is worth monitoring once the general 2027 call appears.",
    actions: [
      "Monitor the official GKS scholarship notice board",
      "Prepare apostille/certification strategy once the 2027 guide is published",
      "Build a shortlist of AI/CV universities for embassy vs university track",
      "Do not lock deadlines or document rules until the general 2027 GKS-G guide is released"
    ],
    source: "https://www.studyinkorea.go.kr/ko/notice/scholarshipsList.do?boardSort=3"
  }
];

export const documents = [
  { id: "passport", group: "Identity", label: "Valid passport color scan / national ID backup", detail: "Keep a clean color PDF and verify passport validity.", required: true, priority: "critical" },
  { id: "photo", group: "Identity", label: "Professional passport-style photograph", detail: "Useful for MBZUAI and other portals that request a photo.", required: false, priority: "normal" },

  { id: "transcript", group: "Academic Records", label: "Official academic transcript", detail: "Complete transcript with every page.", required: true, priority: "critical" },
  { id: "certificate", group: "Academic Records", label: "Graduation / provisional certificate", detail: "Prepare the final or provisional degree evidence accepted by each portal.", required: true, priority: "critical" },
  { id: "gradingScale", group: "Academic Records", label: "Transcript grading scale / CGPA explanation", detail: "Keep the university grading legend ready for KAUST and other international admissions.", required: true, priority: "high" },
  { id: "certifiedAcademic", group: "Academic Records", label: "Certified / attested academic-copy packet", detail: "Especially important for EDISS; confirm Bangladesh-specific attestation before submission.", required: true, priority: "high" },

  { id: "cv", group: "CV Variants", label: "Scholarship-optimized master academic CV", detail: "2–3 page evidence bank covering education, research, work, teaching, projects and publications.", required: true, priority: "critical" },
  { id: "cvResearch", group: "CV Variants", label: "Research / technical CV variant", detail: "KAUST, MBZUAI, Cambridge and research-heavy applications.", required: true, priority: "high" },
  { id: "cvOxford", group: "CV Variants", label: "Oxford 1–2 page CV variant", detail: "Tighter academic CV emphasizing research preparation and evidence.", required: true, priority: "high" },
  { id: "cvEdiss", group: "CV Variants", label: "EDISS CV template", detail: "Use the programme's required format rather than only your general CV.", required: false, priority: "high" },

  { id: "sopResearch", group: "Statements & Essays", label: "Research-focused SOP master draft", detail: "Long evidence bank from which programme-specific statements are derived.", required: true, priority: "critical" },
  { id: "sopKaust", group: "Statements & Essays", label: "KAUST research SOP (~750 words)", detail: "Research trajectory, efficient AI systems, faculty/lab fit and future research direction.", required: true, priority: "critical" },
  { id: "sopOxford", group: "Statements & Essays", label: "Oxford MSc Advanced CS statement", detail: "Keep within Oxford's current limit and foreground academic/research preparation.", required: true, priority: "high" },
  { id: "impactEssay", group: "Statements & Essays", label: "Development / public-impact narrative", detail: "Bangladesh problem → intervention → beneficiaries → measurable outcomes.", required: true, priority: "critical" },
  { id: "commonwealthImpact", group: "Statements & Essays", label: "Commonwealth four-part development-impact response", detail: "Problem, application of skills, expected outcomes/beneficiaries/timeline, and measurement.", required: true, priority: "critical" },
  { id: "careerPlan", group: "Statements & Essays", label: "2-year / 5-year / long-term career plan", detail: "Reusable for Commonwealth, Weidenfeld and other impact-oriented routes.", required: true, priority: "high" },
  { id: "leadershipEssay", group: "Statements & Essays", label: "Leadership / civic-impact evidence bank", detail: "Only real examples: teaching, mentorship, initiative, ownership and measurable outcomes.", required: false, priority: "high" },
  { id: "mextPlan", group: "Statements & Essays", label: "MEXT Field of Study & Research Plan draft", detail: "Not for the closed 2027 embassy route; prepare for the next relevant MEXT route.", required: false, priority: "watch" },

  { id: "references", group: "References", label: "Core three-referee panel confirmed", detail: "Research supervisor + academic/teaching referee + strongest third academic/professional referee.", required: true, priority: "critical" },
  { id: "refereePackets", group: "References", label: "Referee evidence packets", detail: "CV, programme list, deadlines, research summary, achievements and suggested evidence—not ghostwritten letters.", required: true, priority: "high" },

  { id: "english", group: "Testing", label: "IELTS Academic plan or valid score", detail: "Portfolio target: 7.5 overall with no component below 7.0.", required: true, priority: "critical" },

  { id: "publications", group: "Evidence", label: "Publication package", detail: "PDFs, DOI links, acceptance details, citation metadata and concise contribution statements.", required: true, priority: "high" },
  { id: "portfolio", group: "Evidence", label: "GitHub / project evidence cleaned for admissions", detail: "Pin strongest repos and create concise evidence-focused project descriptions.", required: false, priority: "normal" },
  { id: "evidenceArchive", group: "Evidence", label: "Employment / teaching / achievement evidence archive", detail: "Certificates/letters supporting CV claims; particularly valuable for EDISS.", required: false, priority: "high" },
  { id: "edissVideo", group: "Evidence", label: "EDISS motivation video", detail: "Prepare the required 2-minute ±30-second motivation video for Intake 7.", required: false, priority: "high" },
  { id: "finance", group: "Evidence", label: "Financial-need/supporting documents where requested", detail: "Keep only where a scholarship/application specifically asks for them.", required: false, priority: "normal" }
];

export const englishPlan = {
  target: "IELTS Academic 7.5+ overall, no component below 7.0",
  rationale: "This single target is designed to clear the current Cambridge MPhil Advanced Computer Science threshold while exceeding the published KAUST and EDISS minima.",
  requirements: [
    { programme: "Cambridge MPhil Advanced CS", score: "7.5 overall; 7.0 in each component" },
    { programme: "KAUST", score: "7.0 overall; at least 6.5 in each component" },
    { programme: "EDISS", score: "6.5 overall; no component below 6.0" }
  ],
  steps: [
    { id: "book", label: "Book an IELTS Academic test date with enough retake margin" },
    { id: "baseline", label: "Take a full timed baseline mock and record section scores" },
    { id: "prep", label: "Run targeted preparation until every section is consistently ≥7.0" },
    { id: "sit", label: "Sit the official test" },
    { id: "report", label: "Store TRF/score details and map reporting requirements per university" }
  ]
};

export const referees = [
  {
    id: "A",
    role: "Research / thesis supervisor",
    purpose: "Primary research-depth referee for KAUST, Oxford, EDISS and other research-heavy applications."
  },
  {
    id: "B",
    role: "Academic / teaching supervisor",
    purpose: "Academic performance, teaching/mentoring, intellectual maturity and comparative standing."
  },
  {
    id: "C",
    role: "Senior academic or strongest technical supervisor",
    purpose: "Third reference for KAUST/Oxford/Commonwealth; use professional evidence only where it strengthens the specific route."
  }
];

export const refereeStages = [
  { id: "confirmed", label: "Confirmed" },
  { id: "briefed", label: "Evidence packet sent" },
  { id: "submitted", label: "Submitted where required" }
];

export const timeline = [
  { date: "26–27 Sep", title: "Freeze the master evidence system", detail: "Organize identity, academic records, three referees, research evidence and essay evidence bank." },
  { date: "28 Sep", title: "KAUST opens", detail: "Launch the application with faculty/lab mapping, research CV, ~750-word SOP and English-test plan." },
  { date: "By 2 Oct", title: "Commonwealth narrative freeze", detail: "Finalize the four-part development-impact statement, study plan, career plan and referee inputs." },
  { date: "6 Oct", title: "Knight-Hennessy deadline", detail: "Submit only if authentic leadership/civic evidence justifies the time cost; otherwise protect higher-fit applications." },
  { date: "20 Oct", title: "Commonwealth deadline", detail: "Submit CSC application and ensure Bangladesh nominating-agency requirements and required references are complete." },
  { date: "Early Nov", title: "Commonwealth Shared expected to open", detail: "Review the published 2027/28 eligible course list immediately; exact dates are still pending." },
  { date: "16 Nov", title: "EDISS scholarship round opens", detail: "Start with certified academic evidence, EDISS CV template, two academic references and motivation video." },
  { date: "8 Dec", title: "Cambridge funding deadline", detail: "Submit MPhil Advanced Computer Science in time for funding consideration and Gates route." },
  { date: "Mid-Dec", title: "Commonwealth Shared expected to close", detail: "Exact closing date is pending; work from the official November timetable when published." },
  { date: "15 Dec", title: "MBZUAI deadline", detail: "Submit MSc application and verify merit/assistantship funding pathway." },
  { date: "3 Jan", title: "KAUST deadline", detail: "Final deadline; target an earlier submission." },
  { date: "6 Jan", title: "Oxford funding-linked deadline", detail: "Submit Advanced Computer Science in time for Weidenfeld/Clarendon consideration." },
  { date: "10 Jan", title: "Türkiye Scholarships recurring window begins", detail: "Official programme states 10 Jan–20 Feb every year; confirm the specific 2027 announcement." },
  { date: "12 Jan", title: "EDISS scholarship deadline", detail: "Submit the Erasmus Mundus / EDISS scholarship application by 15:00 Helsinki time." },
  { date: "20 Feb", title: "Türkiye Scholarships recurring window ends", detail: "Confirm the 2027 announcement before relying on this recurring annual date." },
  { date: "Watch", title: "MEXT / Stipendium / GKS-G", detail: "MEXT 2027 Bangladesh embassy route is closed; monitor next MEXT route, the Stipendium 2027/28 call, and the general 2027 GKS Graduate announcement." }
];
