// Evidence-led 2027 scholarship campaign. Dates with unknown 2027 calls are intentionally null.
// Verified snapshot: 2026-10-03. Official links are stored with each opportunity.
export const goalSnapshot = '2026-10-03';
export const goalCoreDocuments = [
  "Valid passport scan and consistent legal-name spelling",
  "Official NSU degree certificate (or accepted provisional evidence)",
  "Full official transcript and grading-scale explanation",
  "IELTS Academic test report (target overall 7.0+; check programme minima)",
  "Research-oriented academic CV with dated achievements",
  "Two academic referees briefed with programme-specific evidence",
  "Tailored statement of purpose / motivation letter",
  "Publication status evidence and non-confidential project portfolio"
];
export const goalCampaign = [
  "Book IELTS Academic on Computer; study toward 7.0+ (Cambridge component floors and Oxford higher English threshold are separate).",
  "Request official NSU degree, transcript, grading scale and English MOI certificate.",
  "Start Bangladesh MOFA attestation/e-apostille for EDISS degree and EVERY transcript page.",
  "Confirm 2–3 academic referees and supply a precise research-achievements brief.",
  "Build an academic CV with publication status stated honestly; retain employment and Nippon AI Dojo evidence.",
  "Draft three SOP variants: multimodal vision research, AI systems engineering, and biomedical/spatial intelligence.",
  "Ship one reproducible open-source multimodal/efficient-inference project with benchmarks and limitations.",
  "Shortlist recent lab papers, thesis supervisors, GPU access and internship partners for each viable programme.",
  "Submit at least 72 hours before each confirmed deadline; check referee/video/upload completion.",
  "Maintain a backup of this browser's Career Track progress export before clearing local storage."
];
export const goalPathways = {
  "mobility": {
    "label": "Multi-country Erasmus Mundus",
    "work": "You can seek jobs after the MSc; there is no automatic obligation to return to Bangladesh under standard EMJM terms. Eligibility for a post-study permit depends on the country where you hold qualifying student residence and the degree awarded. Arrange a job or eligible status before your final permit expires; consortium mobility is not an EU-wide work permit.",
    "pr": "Potentially, but no automatic EU PR. Under EU long-term-residence rules, five years of qualifying continuous residence in one Member State is typical and study time may count only in part after conversion to an eligible status. Moving between consortium countries does not automatically combine residence periods.",
    "sources": [
      [
        "EU EMJM mobility",
        "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters"
      ],
      [
        "EU long-term resident directive",
        "https://eur-lex.europa.eu/eli/dir/2003/109"
      ]
    ]
  },
  "finland": {
    "label": "Finland — depends on final degree and residence",
    "work": "A qualifying graduate of a Finnish degree who held study residence can apply for a permit to look for work/start a business for up to two years; its work rights apply under that permit. For a joint master, confirm with Migri that degree completion and residence criteria are met.",
    "pr": "Potentially through Finland's current permanent-residence pathways, which changed in January 2026: the degree-completed-in-Finland route has distinct integration and continuous-permit requirements. A joint degree or temporary mobility stay is not automatically sufficient.",
    "sources": [
      [
        "Finnish graduate job-search permit",
        "https://migri.fi/en/residence-permit-to-look-for-work"
      ],
      [
        "Permanent residence paths",
        "https://migri.fi/en/permanent-residence-permit"
      ]
    ]
  },
  "swiss": {
    "label": "Switzerland",
    "work": "Third-country graduates of a Swiss higher-education institution can normally seek work matching their qualifications for six months after completing their studies. A suitable employer and residence/work authorization are still needed; labour-market rules apply.",
    "pr": "Swiss C-permit / settlement is a separate residence process, generally requiring qualifying years and integration. A two-year master's does not by itself grant PR.",
    "sources": [
      [
        "Swiss SEM graduate guidance",
        "https://www.sem.admin.ch/sem/en/home/themen/arbeit/faq.0006.html"
      ]
    ]
  },
  "uk": {
    "label": "United Kingdom",
    "work": "Eligible graduates who complete the required UK study period can apply in-country for the Graduate visa. For applications from 1 January 2027, the current duration is 18 months (not two years). You can work or seek work, then seek a qualifying sponsored status such as Skilled Worker.",
    "pr": "Possible only through a later eligible settlement route, subject to rules then in force. A Graduate visa is temporary and does not itself grant indefinite leave to remain.",
    "sources": [
      [
        "UK Graduate visa",
        "https://www.gov.uk/graduate-visa"
      ],
      [
        "Skilled Worker visa",
        "https://www.gov.uk/skilled-worker-visa"
      ]
    ]
  },
  "saudi": {
    "label": "Saudi Arabia",
    "work": "An MSc does not automatically create a general open post-study work permit. Employment after graduation ordinarily requires a qualifying employer-sponsored work/residence process or another authorized category; KAUST relocation provisions include return travel, not indefinite job-search support.",
    "pr": "No automatic conventional PR through a student permit. Premium Residency is a separate eligibility- and fee-based system, not an MSc entitlement.",
    "sources": [
      [
        "Saudi Premium Residency",
        "https://pr.gov.sa/"
      ],
      [
        "KAUST fellowship",
        "https://admissions.kaust.edu.sa/fees-funding"
      ]
    ]
  },
  "uae": {
    "label": "United Arab Emirates",
    "work": "Graduating does not automatically provide an unrestricted job-search/work permit. You can pursue a qualified employer-sponsored residence/work permit or another eligible UAE residence category.",
    "pr": "The UAE does not give automatic conventional PR with an MSc; renewable long-term categories such as Golden Residency require separate eligibility.",
    "sources": [
      [
        "UAE Golden Residency",
        "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa"
      ],
      [
        "MBZUAI MSc funding",
        "https://mbzuai.ac.ae/admissions/graduate-masters-admissions"
      ]
    ]
  }
};
export const goalProgrammes = [
  {
    "id": "ipcvai",
    "name": "IPCVAI",
    "full": "AI for Image Processing and Computer Vision",
    "category": "Erasmus Mundus",
    "institution": "Pázmány Péter Catholic University · Universidad Autónoma de Madrid · Université de Bordeaux",
    "location": "Budapest, Hungary → Madrid, Spain → Bordeaux, France; final internship in academia or industry",
    "starts": "2026-11-01",
    "ends": "2027-02-02",
    "dateQuality": "Published 2027 call; exact submission hour must be checked in portal",
    "funding": "Full if awarded",
    "cover": "Full EMJM awards waive participation costs and provide €1,400/month for the eligible programme duration (typically up to 24 months) to contribute to living, travel, visa and installation costs; insurance is arranged by the consortium. Airfare is not a separate unlimited ticket benefit.",
    "goal": "Research-centric visual AI, deep learning and a dedicated internship align with your ViT, segmentation and production CV experience. Propose vision-language foundation models, temporal reasoning or efficient perception as a thesis direction after confirming partner supervision.",
    "careerKey": "mobility",
    "careerExtra": "For the last semester, actively pursue the internship in a lab/company with foundation-model or GPU-systems research. If relying on Spain's graduate job-search residence, verify qualifying Spanish-study/status conditions: it is up to 24 months but does NOT authorize working during job search.",
    "language": "Published admission baseline: English at CEFR B2, e.g. IELTS 6.5 or TOEFL 90. Do not assume an NSU MOI substitute without the 2027 consortium confirming acceptance.",
    "docs": [
      "Programme application and scholarship form",
      "Proof of English per current call; NSU MOI if expressly accepted",
      "Programme-specific motivation statement and preferred internship interest",
      "Two academic/research references, if required by the 2027 portal"
    ],
    "levers": [
      "Show controlled experiments on a visual foundation model rather than CV-only production screenshots.",
      "Describe the specific research contribution and use the fourth-semester internship strategically.",
      "Provide defensible metrics for segmentation, throughput and multimodal research."
    ],
    "sources": [
      [
        "2027 programme call",
        "https://ipcv.eu/"
      ],
      [
        "Admissions and criteria",
        "https://ipcv.eu/how-to-apply/admission/"
      ],
      [
        "Spain post-study permit",
        "https://www.inclusion.gob.es/en/web/migraciones/w/20.-autorizacion-de-residencia-para-busqueda-de-empleo-o-inicio-de-proyecto-empresarial"
      ]
    ]
  },
  {
    "id": "ediss",
    "name": "EDISS",
    "full": "Engineering of Data-intensive Intelligent Software Systems",
    "category": "Erasmus Mundus",
    "institution": "Åbo Akademi University · University of the Balearic Islands · University of L’Aquila · Mälardalen University",
    "location": "Finland (first year) → Spain, Italy or Sweden (selected second-year pathway)",
    "starts": "2026-11-16",
    "ends": "2027-01-12",
    "dateQuality": "Published 2027 scholarship round; closes 15:00 Helsinki time",
    "funding": "Full if EMJM/EDISS scholarship awarded",
    "cover": "Full EMJM awards waive participation costs and provide €1,400/month for the eligible programme duration (typically up to 24 months) to contribute to living, travel, visa and installation costs; insurance is arranged by the consortium. Airfare is not a separate unlimited ticket benefit. Different EDISS award categories may have distinct terms: inspect the offered scholarship agreement.",
    "goal": "Connects your full-stack and distributed systems background with intelligent software and AI/ML platforms. An excellent narrative is evaluation-driven, resource-efficient foundation-model serving and production-grade AI systems.",
    "careerKey": "mobility",
    "careerExtra": "EDISS includes compulsory internship activity. Your first-year Finnish residence does not guarantee a Finnish post-study job-search permit if your completed degree/residence does not meet Migri's conditions; confirm your joint-degree plan.",
    "language": "IELTS Academic ≥6.5, each component ≥6.0. A Bangladeshi English-medium BSc alone is not a listed exemption; IELTS Online is not accepted.",
    "docs": [
      "EDISS's own mandatory CV template and evidence for ALL stated experiences",
      "Two signed academic recommendation letters (not professional-only)",
      "A 2-minute ±30-second motivation video",
      "Attested copies of EACH transcript/degree page by Bangladesh MOFA Consular & Welfare Wing, or accepted e-apostille",
      "IELTS Academic TRF, valid and verifiable at least 14 days after closing"
    ],
    "levers": [
      "Start Bangladesh MOFA attestation early; missing stamps could invalidate an otherwise strong file.",
      "Use EDISS's prescribed CV template and attach proof for every claimed relevant experience.",
      "Frame a concrete intelligent-software research problem, not a generic wish to join Big Tech."
    ],
    "sources": [
      [
        "2027 scholarship calendar",
        "https://www.master-ediss.eu/upcoming-application-rounds-ediss-intake-7/"
      ],
      [
        "Full document rules",
        "https://www.master-ediss.eu/admission-requirements/"
      ],
      [
        "Bangladesh attestation rules",
        "https://www.master-ediss.eu/country-specific-requirements/"
      ]
    ]
  },
  {
    "id": "deai",
    "name": "DEAI",
    "full": "Data Engineering and Artificial Intelligence",
    "category": "Erasmus Mundus",
    "institution": "Université libre de Bruxelles and partner consortium universities (verify final mobility assignment)",
    "location": "Belgium + consortium mobility through Spain and possible Austria / France / Italy specialization",
    "starts": null,
    "ends": null,
    "dateQuality": "2027–29 call NOT published; website still displays 2026–28 dates. Do not reuse old dates.",
    "funding": "Full if 2027 Erasmus Mundus award offered and won",
    "cover": "Full EMJM awards waive participation costs and provide €1,400/month for the eligible programme duration (typically up to 24 months) to contribute to living, travel, visa and installation costs; insurance is arranged by the consortium. Airfare is not a separate unlimited ticket benefit. Reconfirm funded 2027 intake and its specific award terms when new call is released.",
    "goal": "Offers cross-layer training in ML, intelligent systems and data infrastructure. Use this route for efficient multimodal model pipelines, data quality and scalable AI training/evaluation.",
    "careerKey": "mobility",
    "careerExtra": "Second-year residence and award structure control which country can issue a post-study permit; confirm destination and degree entitlement.",
    "language": "2027 English evidence and thresholds await updated programme call; prepare IELTS Academic and NSU MOI.",
    "docs": [
      "DEAI official application and bachelor's CS-credit evidence",
      "Detailed official transcript including computer-science/maths modules",
      "Programme cover letter emphasizing originality and verified experience",
      "Academic recommendations; ensure referees use portal submission"
    ],
    "levers": [
      "Make CS-credit distribution and mathematical course equivalence explicit.",
      "Provide one evidence-backed technical narrative linking data architecture to foundation-model training.",
      "Write your own tailored cover letter; admissions specifically evaluates critical thinking and originality."
    ],
    "sources": [
      [
        "Official admissions (currently previous cycle)",
        "https://deai.ulb.be/home/students/admission/"
      ],
      [
        "Official portal",
        "https://deai.ulb.ac.be/emundus/index.php?option=com_content&view=frontpage"
      ]
    ]
  },
  {
    "id": "imlex",
    "name": "IMLEX",
    "full": "Imaging and Light in Extended Reality",
    "category": "Erasmus Mundus",
    "institution": "University of Eastern Finland and IMLEX consortium partners",
    "location": "Finland with compulsory partner-country study/mobility (verify 2027 route)",
    "starts": "2026-12-02",
    "ends": "2027-01-13",
    "dateQuality": "Published 2027 call; closes 23:59 UTC+2",
    "funding": "Full if EMJM scholarship awarded",
    "cover": "Full EMJM awards waive participation costs and provide €1,400/month for the eligible programme duration (typically up to 24 months) to contribute to living, travel, visa and installation costs; insurance is arranged by the consortium. Airfare is not a separate unlimited ticket benefit.",
    "goal": "Particularly suitable if your AI ambition emphasizes spatial intelligence, 3D perception, imaging and embodied multimodal systems. Less directly focused on core LLM pretraining.",
    "careerKey": "mobility",
    "careerExtra": "A Finnish graduate job-search permit is potentially relevant ONLY if the completed degree/residence meets Migri requirements; confirm with the university and Migri.",
    "language": "IELTS Academic ≥6.5. Bangladesh is NOT on the degree-location exemption list; NSU MOI alone is insufficient.",
    "docs": [
      "One-page motivation letter addressing the published IMLEX questions",
      "Compulsory motivation video up to 2 minutes",
      "Two recommendation letters",
      "IELTS Academic TRF; accepted current test evidence",
      "Degree certificate, transcript, passport and translations where needed"
    ],
    "levers": [
      "Prepare a technical motivation for spatial/XR research, not a generic GenAI statement.",
      "Use video to articulate an original imaging or 3D representation research problem.",
      "Show mathematics, graphics/vision and experiment-design evidence."
    ],
    "sources": [
      [
        "2027 call",
        "https://www.imlex.org/how-to-apply/"
      ],
      [
        "2027 admission checklist",
        "https://www.imlex.org/how-to-apply/admission-criteria/"
      ],
      [
        "Finnish Migri",
        "https://migri.fi/en/residence-permit-to-look-for-work"
      ]
    ]
  },
  {
    "id": "codas",
    "name": "CoDaS",
    "full": "Communications Engineering and Data Science",
    "category": "Erasmus Mundus",
    "institution": "Aalto University · UPC BarcelonaTech · Técnico Lisboa · TU Braunschweig · Grenoble INP–UGA",
    "location": "Finland / Spain / Portugal / Germany / France; two universities and countries based on awarded mobility track",
    "starts": "2026-12-01",
    "ends": "2027-01-05",
    "dateQuality": "Published 2027 application closes 15:00 UTC+2; supplementary documents due 2027-01-12 15:00 UTC+2",
    "funding": "Full if EMJM scholarship awarded",
    "cover": "Full EMJM awards waive participation costs and provide €1,400/month for the eligible programme duration (typically up to 24 months) to contribute to living, travel, visa and installation costs; insurance is arranged by the consortium. Airfare is not a separate unlimited ticket benefit.",
    "goal": "Emphasizes communications/data systems, useful for distributed ML, network-aware AI and AI infrastructure, but is not a dedicated foundation-model research degree. Select a compatible thesis placement.",
    "careerKey": "mobility",
    "careerExtra": "Check your final university and degree eligibility before relying on a national job-search visa. Germany (when it is your qualifying graduating institution) has a graduate job-seeking route; France/Finland/Spain have distinct conditions.",
    "language": "IELTS Academic ≥6.5 overall, Writing ≥6.0 in published 2027 admission materials.",
    "docs": [
      "Consortium admission form and preferences for home/host tracks",
      "Bachelor's course descriptions or official course-page links for prerequisite evaluation",
      "Motivation video",
      "Recommendation letters as specified by application portal",
      "Official IELTS results by January 12, 2027",
      "Official degree/transcript and certified copies as applicable"
    ],
    "levers": [
      "Tie communications/data skills to distributed AI serving, low-latency inference or training systems.",
      "Propose a thesis topic with an identifiable partner laboratory.",
      "Meet two separate deadlines: application close and final uploads."
    ],
    "sources": [
      [
        "2027 admissions and timetable",
        "https://www.unite-codas-master.eu/admission.html"
      ],
      [
        "Funding terms",
        "https://codas.dice.aalto.fi/scholarship.html"
      ],
      [
        "Germany graduate work outlook",
        "https://www.make-it-in-germany.com/en/study-vocational-training/studies-in-germany/prospects-after"
      ]
    ]
  },
  {
    "id": "maia",
    "name": "MAIA",
    "full": "Medical Imaging and Applications",
    "category": "Erasmus Mundus",
    "institution": "University of Girona and renewed MAIA partner consortium (confirm 2027 list)",
    "location": "Multi-country European mobility; final 2027 itinerary to be confirmed",
    "starts": null,
    "ends": null,
    "dateQuality": "2027–29 Erasmus funding confirmed; tentative scholarship window November 2026–February 2027; exact dates PENDING",
    "funding": "Full if one of the renewed 2027 EMJM grants is awarded",
    "cover": "Full EMJM awards waive participation costs and provide €1,400/month for the eligible programme duration (typically up to 24 months) to contribute to living, travel, visa and installation costs; insurance is arranged by the consortium. Airfare is not a separate unlimited ticket benefit.",
    "goal": "Directly leverages medical imaging and Vision Transformer research. Useful if biomedical multimodal foundation models, trustworthy imaging and clinically grounded generation interest you; narrower than general GenAI.",
    "careerKey": "mobility",
    "careerExtra": "Job and residency options depend on graduating institution and country of qualifying residence, not on the Erasmus label itself.",
    "language": "2027 English evidence and score rules pending revised curriculum/call. Prepare IELTS Academic and official MOI.",
    "docs": [
      "Renewed 2027 application (not yet released)",
      "Biomedical AI research/motivation letter",
      "Academic referees and documented medical-imaging research contribution",
      "IELTS and official academic records as announced"
    ],
    "levers": [
      "Explain how your medical vision research transitions to clinically robust multimodal models.",
      "Distinguish submitted papers from peer-reviewed accepted publications.",
      "Wait for the newly published 2027 curriculum and scholarship form."
    ],
    "sources": [
      [
        "Official MAIA 2027 funding update",
        "https://maiamaster.udg.edu/admission/"
      ]
    ]
  },
  {
    "id": "eth-esop",
    "name": "ETH ESOP",
    "full": "Excellence Scholarship & Opportunity Programme — MSc Computer Science",
    "category": "Other fully funded",
    "institution": "ETH Zurich",
    "location": "Zurich, Switzerland",
    "starts": "2026-11-01",
    "ends": "2026-11-30",
    "dateQuality": "Published 2027 international master's/ESOP window; closes 11:59 CET",
    "funding": "Full if ESOP awarded",
    "cover": "Full programme tuition waiver + CHF 13,500 per semester (from Autumn 2027) toward living/study costs and mentorship, for the normal MSc duration. Travel/airfare not advertised as a separate full entitlement.",
    "goal": "Substantial opportunity to build deep machine intelligence and systems foundations, with a rigorous research thesis. Examine supervisors/projects for foundation-model computation, multimodal learning and efficient ML.",
    "careerKey": "swiss",
    "careerExtra": "Swiss non-EU work permits remain regulated; a prestigious degree does not waive employer/permit requirements.",
    "language": "Accepted English C1-level evidence must be available by November 30; confirm ETH's current accepted IELTS threshold and target-course admission rules before booking.",
    "docs": [
      "Complete ETH MSc Computer Science admission dossier",
      "ESOP preliminary master's thesis proposal — independently authored and accurately cited",
      "Two professorial references (if not already required by course)",
      "English language certificate submitted by the hard deadline",
      "Evidence of excellent academic standing / class rank if available"
    ],
    "levers": [
      "Verify top-10% undergraduate standing with NSU if supportable.",
      "Write a non-generic, self-developed pre-proposal with credible literature, novelty and feasibility.",
      "Check CS module prerequisites and strict English-document deadline; no late IELTS."
    ],
    "sources": [
      [
        "ETH 2027 application dates",
        "https://ethz.ch/en/studies/master/application/dates.html"
      ],
      [
        "ESOP funding and evidence",
        "https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html"
      ],
      [
        "ETH language rules",
        "https://ethz.ch/en/studium/master/bewerbung/sprachanforderungen.html"
      ]
    ]
  },
  {
    "id": "kaust",
    "name": "KAUST Fellowship",
    "full": "Fully Funded MSc Computer Science",
    "category": "Other fully funded",
    "institution": "King Abdullah University of Science and Technology",
    "location": "Thuwal, Saudi Arabia",
    "starts": "2026-09-28",
    "ends": "2027-01-03",
    "dateQuality": "Published Fall 2027 Round 2; dates marked tentative by university; exact closing hour unannounced",
    "funding": "Full for eligible admitted MSc students",
    "cover": "Full tuition/bench fees, MS stipend approximately USD 20,000 per year, base on-campus accommodation, medical insurance, initial/return relocation and travel support; external sponsorship exceptions exist.",
    "goal": "A continuous research-lab MSc is useful for GPU-intensive experiments, efficient foundation models and substantive paper contributions. Concentrate on matching a currently active CS/ML/Vision research advisor.",
    "careerKey": "saudi",
    "careerExtra": "Do not assume your scholarship covers a post-graduation Saudi job search; pursue offers early and verify employer authorization.",
    "language": "Review KAUST's currently accepted test/MOI evidence; proceed with IELTS Academic and obtain MOI as backup.",
    "docs": [
      "KAUST graduate online application",
      "Statement of purpose and aligned faculty interests",
      "Academic transcripts, degree, passport and grading scale",
      "Academic references according to current portal",
      "English proof according to entry requirements"
    ],
    "levers": [
      "Contact relevant labs with a specific research question and reproducible prior results.",
      "Explain why MSc research adds methodological depth beyond your production AI work.",
      "Select a thesis pathway and assess genuine available GPU resources with the professor."
    ],
    "sources": [
      [
        "Fall 2027 calendar",
        "https://admissions.kaust.edu.sa/how-to-apply/admission-timelines"
      ],
      [
        "Fellowship terms",
        "https://admissions.kaust.edu.sa/fees-funding"
      ],
      [
        "Entry requirements",
        "https://admissions.kaust.edu.sa/how-to-apply/entry-requirements"
      ]
    ]
  },
  {
    "id": "cambridge",
    "name": "Cambridge funding",
    "full": "MPhil Machine Learning and Machine Intelligence — general university / Gates consideration",
    "category": "Other fully funded",
    "institution": "University of Cambridge",
    "location": "Cambridge, United Kingdom",
    "starts": "2026-09-09",
    "ends": "2026-12-08",
    "dateQuality": "Published 2027 course funding deadline; 23:59 UK deadline convention to confirm in portal",
    "funding": "Full only if a full university/college/Gates or external award is won; course admission alone is NOT funded",
    "cover": "Funding varies by award: Gates Cambridge is full-cost where awarded; other postgraduate awards may be full or partial. The MLMI course does not advertise a guaranteed course-specific full fellowship.",
    "goal": "A technically deep 11-month MPhil with a thesis/dissertation and advanced ML coursework. Valuable if you use the short period to complete research and establish a doctoral/industrial network.",
    "careerKey": "uk",
    "careerExtra": "Funding conditions may affect subsequent plans: verify each award agreement; eligible UK study can allow a Graduate visa subject to completion and the current rules.",
    "language": "IELTS Academic 7.0 overall: Listening 7.0, Writing 7.0, Speaking 7.0, Reading 6.5.",
    "docs": [
      "MPhil application; transcript and official degree information",
      "Statement of interest / course-specific supporting materials",
      "Required academic references",
      "IELTS satisfying EACH band",
      "Select correct full-funding boxes and supply additional Gates reference where applicable"
    ],
    "levers": [
      "Demonstrate first-class-equivalent academics and strong mathematical ML foundations.",
      "Make thesis interests specific rather than naming corporate employment as the principal motivation.",
      "Obtain referees who can evaluate independent research potential."
    ],
    "sources": [
      [
        "2027 MPhil requirements",
        "https://www.postgraduate.study.cam.ac.uk/courses/directory/egegmpmsl/requirements"
      ],
      [
        "Programme finance disclosure",
        "https://www.postgraduate.study.cam.ac.uk/courses/directory/egegmpmsl/finance"
      ],
      [
        "Gates Cambridge funding",
        "https://www.gatescambridge.org/apply/"
      ]
    ]
  },
  {
    "id": "oxford",
    "name": "Oxford Clarendon",
    "full": "Clarendon Fund — MSc Advanced Computer Science",
    "category": "Other fully funded",
    "institution": "University of Oxford",
    "location": "Oxford, United Kingdom",
    "starts": null,
    "ends": "2027-01-06",
    "dateQuality": "Published course & Clarendon consideration deadline; applications currently open, opening date not explicitly published in cited course notice; 12:00 noon UK time",
    "funding": "Full if Clarendon awarded",
    "cover": "Clarendon covers full course fees and a living grant for the period of fee liability. Travel/airfare not a separately guaranteed line item.",
    "goal": "Broad advanced CS with mathematically rigorous study and AI-related elective possibilities. Choose a substantive ML/GenAI dissertation topic; verify available supervision and modules.",
    "careerKey": "uk",
    "careerExtra": "MSc is 12 months; eligible graduates may apply for 18-month UK Graduate visa under rules effective 2027, followed by skilled-work route if eligible.",
    "language": "Oxford Higher Level English: IELTS Academic 7.5 overall, minimum 7.0 in each component unless a valid course-specific exemption.",
    "docs": [
      "Complete MSc application including CS prerequisite evidence",
      "Academic CV, transcript/degree and required referees",
      "Statement of purpose according to Oxford course instructions",
      "IELTS 7.5/7.0 or formally confirmed accepted exemption",
      "Submit by course funding deadline; Clarendon has no separate application"
    ],
    "levers": [
      "Prioritize Oxford only if English-test target can meet its higher threshold.",
      "Quantify academic standing and original research contributions.",
      "Avoid generic SOP; build a course-specific connection to algorithms and ML systems."
    ],
    "sources": [
      [
        "2027 MSc course",
        "https://www.ox.ac.uk/admissions/graduate/courses/msc-advanced-computer-science"
      ],
      [
        "Clarendon funding",
        "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/funding/clarendon/applicants"
      ]
    ]
  },
  {
    "id": "mbzuai",
    "name": "MBZUAI faculty funding",
    "full": "Research MSc in Computer Science / AI — faculty assistantship funding",
    "category": "Conditional / watch",
    "institution": "Mohamed bin Zayed University of Artificial Intelligence",
    "location": "Abu Dhabi, United Arab Emirates",
    "starts": "2026-09-07",
    "ends": "2026-12-15",
    "dateQuality": "Official Fall 2027 postgraduate applications: portal opened 7 Sep 2026 (08:00 GST); MSc deadline 15 Dec 2026 (17:00 GST). Funding is separate and not guaranteed.",
    "funding": "NOT automatic; full only with confirmed faculty-sponsored RA/TA or approved government scholarship",
    "cover": "A funded MSc offer can include tuition waiver, stipend (published international funded MSc category AED 15,500/month), insurance and eligible residence/airfare benefits. Without sponsorship MSc charges apply. Fee-paying MAAI is ineligible for these university/faculty funds.",
    "goal": "Direct AI university with relevant research faculty. Investigate only a thesis-based and fully sponsored faculty opportunity, not a fee-paying taught programme.",
    "careerKey": "uae",
    "careerExtra": "Written full-funding confirmation is a hard requirement before committing; sponsored work residence or another eligible status needed after study.",
    "language": "Check selected MSc 2027 English requirement, entrance screening and permitted updated results. IELTS plan alone does not secure funding.",
    "docs": [
      "Fall 2027 research MSc portal application, IELTS/accepted English proof and 200 AED screening/application fee",
      "Two academic/professional referee recommendations as allowed by the MSc portal",
      "Statement of purpose, research-oriented CV, official transcript/degree and passport",
      "White-background photograph and relevant screening examination; prepare for possible interview",
      "Written research/teaching assistantship or merit-funding decision (do not treat admission as funding)"
    ],
    "levers": [
      "Prioritize a faculty member with funded work in multimodal / foundation-model efficiency.",
      "Ask for written RA/TA coverage, stipend length and deliverables.",
      "Do not confuse full funding with admission; reject fee-paying MAAI for this campaign."
    ],
    "sources": [
      [
        "2027 MSc admissions and funding",
        "https://mbzuai.ac.ae/admissions/graduate-masters-admissions"
      ]
    ]
  },
  {
    "id": "emai",
    "name": "EMAI",
    "full": "Erasmus Mundus Joint Master in Artificial Intelligence",
    "category": "Conditional / watch",
    "institution": "Pompeu Fabra University · Sapienza University of Rome · Radboud University · University of Ljubljana",
    "location": "Spain / Italy / Netherlands / Slovenia (mobility based on track)",
    "starts": "2026-11-15",
    "ends": null,
    "dateQuality": "Published 2027–29 dates presently specify SELF-FUNDED recruitment; no confirmed 2027 full EMJM scholarship deadline",
    "funding": "Not confirmed fully funded for 2027; scholarship monitor only",
    "cover": "A past 2026–28 cohort advertised full EMJM awards. Do not presume the 2027–29 round repeats that funding; avoid accepting a fee-paying place under the full-funding-only goal.",
    "goal": "Title/curriculum broadly aligns with your future AI interests; only activate if an actual fully funded 2027 scholarship call is published.",
    "careerKey": "mobility",
    "careerExtra": "If a fully funded offer emerges, check the final degree country and your residence conditions for post-study rights.",
    "language": "2027 funding and current language documentation must be checked if a scholarship call is announced.",
    "docs": [
      "Watch the consortium's 2027 scholarship news",
      "Prepare academic CV, references, IELTS and specific AI motivation only if a funded call appears"
    ],
    "levers": [
      "Do not spend application fees on the self-funded cohort under your present constraint.",
      "Verify funding in writing with consortium before changing campaign status."
    ],
    "sources": [
      [
        "Official programme admissions",
        "https://www.upf.edu/web/emai/admissions"
      ],
      [
        "Scholarship information",
        "https://www.upf.edu/web/emai/scholarships"
      ]
    ]
  }
];
