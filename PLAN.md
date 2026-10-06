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

- [x] Define application, recruiter-contact, notes, and follow-up fields.
- [x] Implement create, read, update, archive, restore, and delete workflows with validation.
- [x] Add saved, applied, screening, interview, offer, and rejected stages.
- [x] Add notes, follow-up dates, stage/search filters, and a Tasks & notes view.
- [x] Add optional single-user password authentication with signed HTTP-only sessions.
- [ ] Add activity history, attachments, withdrawn stage, sorting, and CSV export.
- [ ] Add multi-user accounts and per-user ownership boundaries before public deployment.

## Phase 3: Analytics

- [x] Add stage counts and interview-to-offer conversion over selectable date ranges.
- [x] Calculate response rate and average response time from recorded response dates.
- [x] Add trend charts and filters by role, company, and source.
- [x] Verify metric definitions against seeded and representative application histories.
- [ ] Add location filtering and richer conversion cohorts.

## Phase 4: Interview practice

- [x] Build practice prompts from a job description, role, and interview type.
- [x] Support behavioral, technical, role-specific, and case-study practice with a timer and answer capture.
- [x] Add an OpenAI-compatible server-side adapter; credentials stay in environment variables.
- [x] Clearly label AI/demo mode; practice answers are not retained.
- [ ] Test against a user-configured live provider and add provider usage limits.
- [ ] Improve feedback into a tested rubric for relevance, clarity, evidence, and delivery.
- [ ] Add consent controls before storing any practice answers.

## Phase 5: Quality and delivery

- [x] Add backend API tests and frontend workflow tests.
- [x] Add loading, empty, error, and retry states; responsive layouts are defined.
- [x] Check dashboard and interview-practice layouts at mobile width with no horizontal overflow.
- [x] Add GitHub Actions CI for backend tests, frontend tests, and production build.
- [ ] Complete a full keyboard/screen-reader accessibility audit.
- [ ] Add structured logging, database backups, and production deployment configuration.

## Next milestone

Run CI on GitHub, then test the interview coach with a user-configured OpenAI-compatible provider. Do not deploy publicly until multi-user ownership and production security settings are implemented.

## Decisions to confirm

- Which OpenAI-compatible provider and model to configure in the local `.env`.
- Deployment target, data residency, and expected budget.
- Whether contacts, resumes, calendar sync, and email reminders are in the MVP.
