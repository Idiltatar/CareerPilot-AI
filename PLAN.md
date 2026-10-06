# CareerPilot AI: Project Plan

## Product goal

Help an active job seeker manage 100+ applications from one place, understand pipeline performance, and practice interviews with role-specific AI feedback.

## Phase 1: Product foundation

- [x] Create an independent React + Flask + PostgreSQL project structure.
- [x] Build the responsive dashboard shell and sample application workflow.
- [x] Add Docker Compose for the frontend, API, and database.
- [x] Connect dashboard metrics and applications to the Flask API and PostgreSQL.
- [x] Add synthetic seed records, application-stage updates, and environment-based database configuration.

## Phase 2: Application tracking

 [x] Define application, recruiter-contact, notes, and follow-up fields.
 [x] Implement create, read, update, archive, restore, and delete workflows with validation.
 [x] Add saved, applied, screening, interview, offer, and rejected stages.
 [x] Add notes, follow-up dates, stage/search filters, and a Tasks & notes view.
 [x] Add optional single-user password authentication with signed HTTP-only sessions.
 [ ] Add activity history, attachments, withdrawn stage, sorting, and CSV export.
 [ ] Add multi-user accounts and per-user ownership boundaries before public deployment.

## Phase 3: Analytics

 [x] Add stage counts and interview-to-offer conversion over selectable date ranges.
 [x] Calculate response rate and average response time from recorded response dates.
 [x] Add trend charts and filters by role, company, and source.
- [ ] Add trend charts and filters by role, company, location, and source.
- [ ] Verify metric definitions against representative application histories.

 [x] Build practice prompts from a job description, role, and interview type.
 [x] Support behavioral, technical, role-specific, and case-study practice with a timer and answer capture.
 [x] Add an OpenAI-compatible server-side adapter; credentials stay in environment variables.
- [ ] Build practice sessions from a job description and interview type.
 [x] Clearly label AI/demo mode; practice answers are not retained.
 [ ] Add provider usage limits and consent controls before storing any practice answers.
- [ ] Integrate an LLM provider behind a server-side adapter; keep secrets off the client.
- [ ] Return structured feedback on relevance, clarity, evidence, and delivery with actionable examples.
- [ ] Add consent, retention controls, usage limits, and clear AI-generated-content labeling.
 [x] Add backend API tests and frontend workflow tests.
 [x] Add loading, empty, error, and retry states; responsive layouts are defined.
 [ ] Run accessibility and desktop/mobile browser audits.

- [ ] Add backend unit/API tests and frontend component/workflow tests.
- [ ] Add loading, empty, error, and retry states; check accessibility and mobile layouts.
- [ ] Add structured logging, database backups, and deployment configuration.
- [ ] Add CI for linting, tests, and builds; document production operations.

## Next milestone

Next: complete accessibility and responsive browser checks, test with a user-configured OpenAI-compatible provider, then add CI, logging, backups, and production deployment configuration. Do not publish publicly until multi-user ownership and production security settings are implemented.

## Decisions to confirm

- Authentication approach and whether the first version is single-user.
- Which OpenAI-compatible provider and model to configure in the local `.env`.
- Deployment target, data residency, and expected budget.
- Whether contacts, resumes, calendar sync, and email reminders are in the MVP.
