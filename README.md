# Career Track v2

Career Track v2 is a persistent, profile-aware scholarship research and application workspace for students. It is designed to run locally with a local AI model or as a public web service with cloud infrastructure.

> Branch: `version-2`  
> The `main` branch remains the original personal scholarship dashboard and is intentionally untouched.

## What v2 does

- Student account registration and sign-in.
- Persistent academic profile and scholarship progress.
- CV upload (PDF, DOCX, TXT) with text extraction.
- Local AI-assisted profile extraction through an Ollama-compatible API.
- Profile-aware scholarship discovery from public web search.
- Respectful page retrieval with robots.txt checks.
- Structured scholarship extraction from public pages.
- AI-assisted fit analysis with a 0–100 evidence-fit score.
- Automatic persistence of researched opportunities.
- Saved/application status tracking.
- Per-scholarship application checklists.
- Search history.
- Local SQLite by default; PostgreSQL supported for production.
- Docker-based local deployment.
- Static frontend served by the FastAPI application.
- CI checks for backend compilation, frontend syntax, and API smoke tests.

## Architecture

```text
career-track/
├── app/
│   ├── __init__.py
│   ├── ai.py            # Ollama-compatible extraction + fit analysis
│   ├── config.py        # Environment-driven settings
│   ├── cv.py            # PDF/DOCX/TXT extraction
│   ├── db.py            # SQLAlchemy engine/session
│   ├── discovery.py     # Search, robots, safe scraping, extraction
│   ├── main.py          # FastAPI routes + frontend serving
│   ├── models.py        # Persistent data model
│   └── security.py      # Argon2 passwords + HttpOnly JWT sessions
├── web/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tests/
│   └── test_api.py
├── scripts/
│   └── bootstrap-local.sh
├── data/
│   └── .gitkeep
├── .github/workflows/
│   └── v2-ci.yml
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── requirements-dev.txt
```

### Runtime flow

```text
Student
  │
  ├─ creates account
  ├─ builds/edits profile
  └─ uploads CV
        │
        ▼
CV Parser ──► Local AI (Ollama)
        │          │
        └────► structured profile
                   │
                   ▼
Scholarship query ──► public search
                         │
                         ▼
                  URL safety checks
                         │
                  robots.txt policy
                         │
                         ▼
                    page extraction
                         │
                         ▼
               structured opportunity
                         │
                         ▼
                profile-fit analysis
                         │
                         ▼
               persistent dashboard
```

## Local installation

### Option A — Docker + local Ollama

Requirements:

- Docker
- Docker Compose
- Enough RAM for the selected Ollama model

```bash
git clone -b version-2 https://github.com/iam-ajmunna/career-track.git
cd career-track
cp .env.example .env

docker compose up -d --build
docker compose exec ollama ollama pull qwen2.5:7b
```

Open:

```text
http://localhost:8000
```

Or use:

```bash
chmod +x scripts/bootstrap-local.sh
./scripts/bootstrap-local.sh
```

### Option B — Python + an existing Ollama installation

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

ollama pull qwen2.5:7b
uvicorn app.main:app --reload
```

Open `http://localhost:8000`.

## AI behavior

The default configuration uses an Ollama-compatible API:

```env
AI_ENABLED=true
AI_BASE_URL=http://127.0.0.1:11434
AI_MODEL=qwen2.5:7b
```

The application does **not** require AI to boot. If the AI service is unavailable:

- CV extraction still works.
- Basic keyword/profile extraction is used.
- Scholarship discovery still works.
- A conservative heuristic fit score is returned.
- The UI clearly reports fallback mode.

For a stronger local model, change `AI_MODEL` to any model your Ollama server provides.

## Scholarship discovery

Discovery combines:

1. the student's saved profile,
2. their explicit search query,
3. public web search,
4. safe page retrieval,
5. text extraction,
6. local-AI structured extraction,
7. profile-specific fit analysis.

Examples:

- `MEXT master's scholarship`
- `Erasmus Mundus fully funded master's`
- `fully funded AI master's scholarship in Germany`
- `Commonwealth master's scholarship Bangladesh`

### Safety and source integrity

- Only `http` and `https` public destinations are fetched.
- Private, loopback, link-local, reserved and multicast IP targets are rejected.
- `robots.txt` is checked before page retrieval.
- Redirects are bounded.
- Scraped content is explicitly treated as untrusted data in the AI extraction prompt.
- Scholarship data remains source-linked.
- Students are instructed to verify eligibility, funding and deadlines on the source page.

This is a research assistant, not an admissions authority.

## Persistence model

### User

Authentication identity only.

### Profile

Reusable academic context:

- nationality / residence,
- degree and institution,
- GPA/CGPA,
- graduation year,
- interests and skills,
- publications,
- experience,
- achievements,
- target degrees/countries,
- language-test status,
- CV text.

### Scholarship

Normalized opportunity discovered from the public web.

### UserScholarship

Per-student state:

- fit score and explanation,
- strengths / gaps,
- saved state,
- application status,
- checklist,
- notes.

### SearchRun

Persistent scholarship research history.

## Public cloud deployment

The container is cloud-ready. For a public deployment, use:

- the provided Docker image/application container,
- managed PostgreSQL,
- HTTPS,
- a strong `SECRET_KEY`,
- `COOKIE_SECURE=true`,
- a fixed production `CORS_ORIGINS`,
- persistent/private file storage or a mounted encrypted volume,
- a private Ollama service or another Ollama-compatible model endpoint.

Example production environment:

```env
SECRET_KEY=<long-random-secret>
DATABASE_URL=postgresql+psycopg://user:password@postgres-host/careertrack
COOKIE_SECURE=true
CORS_ORIGINS=https://scholarships.example.org
UPLOAD_DIR=/var/lib/career-track/uploads

AI_ENABLED=true
AI_BASE_URL=http://private-ollama-service:11434
AI_MODEL=qwen2.5:7b
```

The backend Python source is never served as a static asset. Browser clients receive only the files under `web/`.

### Important production storage note

The current v2 implementation stores uploaded CV files on the configured filesystem and CV text in the database. A multi-instance cloud deployment should replace filesystem uploads with object storage (S3/GCS/R2) or use a shared persistent volume.

## Security baseline

- Argon2 password hashing.
- Signed JWT sessions.
- Session JWT stored in an `HttpOnly`, `SameSite=Lax` cookie.
- Optional Bearer authentication for API clients.
- Configurable secure cookies.
- CORS allow-list.
- File type and upload-size restrictions.
- Server-side filename randomization.
- SSRF-oriented public-IP validation for discovery URLs.
- robots.txt compliance.
- Bounded HTTP timeouts and redirects.
- No secret/API key embedded in frontend JavaScript.
- Scraped pages treated as untrusted AI input.

## Development verification

```bash
pip install -r requirements-dev.txt
python -m compileall -q app tests
node --check web/app.js
pytest -q
```

The `Version 2 CI` GitHub workflow performs these checks on pushes and pull requests involving `version-2`.

## Known v2 boundaries

This is a production-oriented MVP, not the final global scholarship intelligence platform.

Current boundaries:

- Public search quality depends on the upstream search provider.
- Search engines and scholarship websites can change markup or block automated retrieval.
- Some sites explicitly disallow crawling; Career Track skips them.
- AI extraction can be imperfect; official sources remain authoritative.
- Uploaded files currently use filesystem storage.
- No email verification/password-reset flow yet.
- No admin moderation workflow for globally shared scholarship records yet.
- There is no scheduled re-verification of deadlines yet.

## Recommended v2.1 work

1. S3/R2/GCS storage abstraction for CVs.
2. Email verification and password reset.
3. Admin moderation and canonical scholarship deduplication.
4. Scheduled deadline/funding re-verification.
5. University/program database and official-source adapters.
6. Notification engine for upcoming deadlines.
7. Personal statement / document workspace.
8. GDPR-style export/delete-account workflow.
9. Rate limiting, abuse protection and observability.
10. Background workers for large discovery jobs.

## License

See `LICENSE`.
