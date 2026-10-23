# Career Track V4 — functionality and source audit

Reviewed 23 October 2026 against the uploaded V4 kit, `UX-CONTRACT.md`, retained V3 workflows and the live production release. The runtime story is browser action → validated local store → derived scholarship/application state → rendered view or explicit export. Public guides are fetched from the same origin. No account or cloud database is required.

## Results

| Verification                       | Result                                                                                          | Evidence                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Unit and integration tests         | 149 passing                                                                                     | `npm test`                                       |
| V4 browser scenarios               | 25 passing                                                                                      | `ux/browser-results.json`                        |
| Retained Classic browser scenarios | 20 passing                                                                                      | `../v3/ux/browser-checks.json`                   |
| Every scholarship drawer           | 47 routes × all six tabs                                                                        | V4 browser scenario: every registry opportunity  |
| Responsive coverage                | Five views, 1440/1024/768/390/320 px, light/dark                                                | V4 browser results                               |
| Accessibility                      | Zero serious/critical Axe findings on five views in both themes                                 | V4 browser results                               |
| Compatibility                      | All 102 original keys/labels preserved; existing guide step IDs retained                        | `check:keys`, registry compatibility review      |
| Registry                           | 47 routes, 103 source records, 22 programmes                                                    | `check:data`                                     |
| Privacy                            | Current-tree private-profile/secret check passes; GPT prompt omits identity, contacts and notes | `check:privacy`, unit/browser tests              |
| UI actions                         | Shared delegated bindings resolved; zero unresolved findings                                    | `ui-static-audit.json`, `ui-reviewed-audit.json` |
| Build                              | Production build passes; initial JavaScript below the 150 KiB gzip budget                       | `bundle-budget.json`                             |

The strict static scanner reports literal buttons whose handlers live in another module. Its raw findings are retained. The binding checker traces those hooks to the mounted shared controller; browser tests verify their behavior. The raw scanner output alone is not a runtime pass.

## Functional coverage

| Workflow                  | Verified behavior                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup and migration     | No-login startup; explicit V2 migration with backup; original V2 bytes retained                                                                                                                   |
| Dashboard                 | Exact timers update without replacing the active view; date-only caveats; KPIs, lanes, add/dismiss/Undo; completed research stays separate from submission                                        |
| Scholarship explorer      | Country tiers, priorities, window tabs, URL-restored search/filter/page state, IME composition and clearing, universities and retained advanced links                                             |
| Research/completion       | Individual status in the drawer; cross-page selection and bulk researching/completed/clear actions; reload persistence; no unintended application-stage changes                                   |
| Guides                    | All six tabs on every route; keyed lazy loading, bounded timeout, visible retry on Overview and other tabs; a slow earlier response cannot overwrite another drawer                               |
| GPT and packages          | Scholarship-specific new-tab URL and copy fallback; selected intake/checklist context; no private identity or notes in the URL; private notes included only in the downloaded application package |
| Documents                 | Shared dossier, route-specific records, versions, expiry, referee matrix and test planning; prior IMLEX CV status cannot become English-test readiness after the data update                      |
| Calendar                  | Monday-start grid, keyboard navigation, agenda, scope/type/timezone filters, exact and all-day event precision, independent reference/document deadlines, ICS and private test milestones         |
| Profile and drafts        | Validation, theme/density/preferences and avatar; saving one form preserves an unsaved form on another route; note drafts survive navigation and export                                           |
| Backup and lifecycle      | Complete export/reset/typed restore round trip; Archive/Trash/restore; backup-first explicit purge; no time-based deletion                                                                        |
| Failure recovery          | In-memory edits survive quota failures and Retry; corrupt stored bytes remain exportable; async guide renders keep all mutation controls locked during recovery                                   |
| Offline and compatibility | Root, `/next/` and `/classic/` remain distinct offline; old-worker update, keyboard shortcuts and retained Classic funding comparison/admission/planning/import tools pass                        |

Ordinary browser tests make no external HTTP requests. The GPT launch is intercepted locally to verify its destination and payload without sending test data to ChatGPT. Test names and data are fictional.

## Repairs from this audit

- Restored V4 research/completion tracking, bulk selection/filtering, pinning, GPT launch/copy and application-package export. These previously required Classic.
- Kept public GPT context separate from private package contents and fixed the package's selected-intake context.
- Preserved unrelated form drafts when another form saves.
- Added Overview guide retry, immediate retry loading state and a bounded fetch timeout.
- Reapplied recovery locks after asynchronous drawer renders.
- Respected an officially published opening hour instead of opening a call at the start of that date.
- Corrected ticker registration so a one-minute subscriber does not rerender the view on the first one-second tick.
- Removed the unsupported “we check every day” match claim and made source-review dates and unresolved routes visible.
- Preserved existing checklist identifiers and document-record meaning while refreshing requirements.

## Data review

`source-review-2026-10-23.json` records 75 reviewed source records: 69 public-page reviews and six explicitly labelled official indexed-content reviews where the full page was unavailable. A review timestamp is not a claim that every future-cycle field has been published. Failed retrievals keep their prior verification date and show a review note.

| Programme                                                                                                    | Current published position                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DEAI](https://deai.ulb.be/home/students/admission/)                                                         | Scholarship round 20 Oct 2026–11 Jan 2027, 12:00 GMT; references 18 Jan. The provider has an application-portal maintenance notice. Full and tuition-only awards are distinguished.                       |
| [IPCVAI](https://ipcv.eu/application-and-selection/application/)                                             | 1 Nov 2026–2 Feb 2027, noon Paris time. Official indexed evidence is labelled; full admissions-page access timed out.                                                                                     |
| [EDISS](https://www.master-ediss.eu/upcoming-application-rounds-ediss-intake-7/)                             | Intake 7 scholarship round 16 Nov 2026, 08:00–12 Jan 2027, 15:00 Helsinki time. Its detailed fee page still labels amounts as Intake 6, so Intake 7 amounts remain unconfirmed.                           |
| [IMLEX](https://www.imlex.org/how-to-apply/)                                                                 | 2 Dec 2026–13 Jan 2027; no invented closing hour. 2027 EMJM availability and the stated documents/video requirement are recorded.                                                                         |
| [CoDaS](https://www.unite-codas-master.eu/admission.html)                                                    | Form: 1 Dec 2026, 09:00–5 Jan 2027, 15:00 Helsinki time. Supporting documents: 12 Jan, 15:00. EMJM stipend and fee-waiver-only awards are separate.                                                       |
| [MAIA](https://maiamaster.udg.edu/admission/)                                                                | 2027–29 funding renewed; the November–February call period is tentative. No exact countdown is published.                                                                                                 |
| [EMAI](https://www.upf.edu/web/emai)                                                                         | The homepage says the next round opens in November 2026; exact dates and current award details remain pending.                                                                                            |
| [Commonwealth Shared](https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships-applications/) | 10 Nov–8 Dec 2026, 16:00 GMT. The provider's current notice still links the previous course list; approved 2027 AI/CS courses need confirmation. This is separate from the closed agency-nominated round. |

Canadian records were checked against the university/department sources. UBC keeps the application, transcript and referee deadlines separate (15 Dec, 16 Dec and 15 Jan). Alberta keeps the 15 Dec application and 15 Jan document cutoff separate. Waterloo/McGill retain their published recurring Fall policies without claiming an independently confirmed 2027 portal opening. Toronto's international MSc exclusion remains explicit. Funding tables, gross/net amounts, assistantship duties and future-rate uncertainty remain separate from admission.

QUT, UTS, Adelaide University and Tasmania were restored to the Australian shortlist. Their international eligibility and round status are recorded. Domestic-only, qualification-restricted and PhD-only opportunities are not presented as general offshore research-master awards. Sydney/Melbourne/Monash/UNSW/ANU/UQ and Australia Awards remain in the registry with their independent funding conditions.

## Explicit limitations

- Twelve routes still need cycle-specific/provider verification: Stipendium, Türkiye, GKS-G, DAAD, university-recommended MEXT, GOI-IES, the generic Erasmus directory, Waterloo, McGill, Cornell, UCL Global and the relevant Adelaide round. The generic directory is not itself an award.
- Eiffel's official indexed pages disagree on 6 versus 8 January. The tracker marks that conflict and does not invent an exact countdown; an institution's nomination cutoff may be earlier.
- DEAI's provider maintenance notice and Stipendium's unavailable website cannot be repaired in this app. Gates provider pages also returned Gone; Cambridge course dates were independently reviewed.
- Country fit ratings remain Provisional/unknown where the required evidence is missing. No immigration or award probabilities are asserted.
- External radar collection remains disabled pending provider configuration/review. The daily source-fingerprint workflow detects changes for review; it does not automatically verify facts. Its authenticated scheduled execution is outside this local browser audit.
- Cloud sync stays off under the existing instruction to continue without Google Auth. Personal progress remains local; export/import is the verified transfer mechanism.

The initial production release was verified at commit `376688e6637a84e1f8a8fabb25e7021ce8b3527a`. The audit corrections use the same Git-connected Vercel project and production domain. The release closeout checks the resulting main deployment and public assets after merge; GitHub checks provide the immutable commit/deployment reference.
