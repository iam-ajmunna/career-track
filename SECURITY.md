# Security

Career Track is a local-first scholarship workspace. The browser stores private progress on the current origin and does not initialize cloud authentication. Exported backups may contain private application information; keep them outside this repository.

Report a vulnerability through GitHub’s private vulnerability reporting feature when available. Otherwise contact the repository owner privately. Do not post private backups, account credentials or provider keys in public issues.

The browser uses same-origin scripts/data and a restrictive CSP. The service worker caches public static assets only. The optional radar job stores its provider key in GitHub Secrets and produces unverified leads for review. Cloud sync and the provider collector require separate configuration/review before activation.

V4 removes earlier committed applicant defaults and captures from the current tree. Git history and repository visibility need separate owner administration; this release does not claim historical erasure.
