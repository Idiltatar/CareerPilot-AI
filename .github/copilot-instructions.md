# CareerPilot AI project context

This folder is the standalone CareerPilot AI project. Keep it separate from the CloudPulse project.

At the start of work in this repository, read `README.md` and `PLAN.md`. Treat `PLAN.md` as the source of truth for completed work and the next milestone; update it when project status changes.

## Current implementation

- Frontend: React, TypeScript, and Vite in `frontend/`.
- Backend: Flask and Flask-SQLAlchemy in `backend/app.py`.
- Database: PostgreSQL, started with Docker Compose.
- Dashboard metrics, pipeline stages, application list, adding applications, and changing stages use the API.
- The database seeds 120 synthetic sample applications and interview records on first startup. They are demo data, not real job applications.
- Interview practice supports behavioral, technical, role-specific, and case-study prompts, optional job-description context, and a timer.
- Feedback uses an OpenAI-compatible server-side adapter only when `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` are configured; otherwise it uses local-demo feedback.
- Practice answers are sent for feedback but are not stored in CareerPilot.
- Optional single-user authentication uses `CAREERPILOT_PASSWORD` and `CAREERPILOT_SECRET_KEY`; without a password the local app is open.
- Application CRUD, archive/restore, recruiter contact, notes, follow-up dates, and filtered analytics are implemented.

## Run and verify

- Start the stack from the project root with `docker compose up -d --build`.
- Frontend: `http://localhost:5173`.
- API health: `http://localhost:5001/api/health`. The host mapping uses port 5001 because macOS may reserve port 5000; the API listens on port 5000 inside Docker.
- Build the frontend with `cd frontend && npm run build`.
- Run frontend tests with `cd frontend && npm test`.
- Run backend tests with `docker compose run --rm api pytest -q`.
- Do not remove the PostgreSQL volume or run `docker compose down -v` unless explicitly asked; it deletes local database data.

## Accuracy and scope

- Do not describe seeded sample records as real applications.
- Do not describe interview feedback as live AI-powered until a provider is configured and the live integration has been verified.
- Keep changes scoped to CareerPilot and preserve existing user data and unrequested files.
- A GitHub Actions workflow now runs backend tests, frontend tests, and the frontend production build on pushes and pull requests to `main`.
- Mobile width checks have passed for the dashboard and interview practice. The next milestone is a live provider test, followed by a full keyboard/screen-reader audit and production readiness. Multi-user ownership and production security are required before public deployment. See `PLAN.md` before choosing follow-up work.