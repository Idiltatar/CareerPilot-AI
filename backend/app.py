import os
import random
import hmac
import json
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen
from datetime import date, datetime, timedelta, timezone

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, inspect, text


db = SQLAlchemy()
STAGES = ["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected"]
COMPANIES = [
    "Stripe", "HubSpot", "Shopify", "Intercom", "Workday", "Microsoft",
    "Datadog", "Atlassian", "Toast", "GitLab", "Personio", "Squarespace",
    "Snyk", "Klaviyo", "Figma", "Zendesk", "MongoDB", "Cloudflare", "Wise",
    "Miro", "Notion", "GitHub", "Twilio", "Linear",
]
ROLES = [
    "Software Engineer", "Frontend Engineer", "Data Analyst", "Product Analyst",
    "Platform Engineer", "Backend Developer",
]
SOURCES = ["LinkedIn", "Company site", "Referral", "Recruiter", "Indeed"]


class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(160), nullable=False)
    role = db.Column(db.String(160), nullable=False)
    stage = db.Column(db.String(32), nullable=False, default="Saved")
    applied_date = db.Column(db.Date, nullable=False, default=date.today)
    source = db.Column(db.String(80), nullable=False, default="Direct")
    salary = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=False, default="")
    archived = db.Column(db.Boolean, nullable=False, default=False)
    follow_up_date = db.Column(db.Date, nullable=True)
    contact_name = db.Column(db.String(120), nullable=False, default="")
    contact_email = db.Column(db.String(254), nullable=False, default="")
    responded_date = db.Column(db.Date, nullable=True)


class Interview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("application.id"), nullable=False)
    kind = db.Column(db.String(60), nullable=False)
    scheduled_at = db.Column(db.DateTime(timezone=True), nullable=False)
    outcome = db.Column(db.String(30), nullable=False, default="Upcoming")
    application = db.relationship("Application")


def seed_data():
    if db.session.query(Application.id).first():
        return

    random.seed(17)
    weighted_stages = (
        ["Applied"] * 42 + ["Screening"] * 23 + ["Interview"] * 20
        + ["Offer"] * 8 + ["Rejected"] * 17 + ["Saved"] * 10
    )
    random.shuffle(weighted_stages)
    today = date.today()
    applications = [
        Application(
            company=COMPANIES[index % len(COMPANIES)],
            role=ROLES[(index * 3) % len(ROLES)],
            stage=weighted_stages[index],
            applied_date=today - timedelta(days=(index * 7) % 145),
            source=SOURCES[index % len(SOURCES)],
            salary=65000 + ((index * 1700) % 65000),
            notes="Synthetic portfolio example",
            follow_up_date=today + timedelta(days=index % 10) if index % 4 == 0 else None,
            responded_date=min(today, today - timedelta(days=(index * 7) % 145) + timedelta(days=3 + index % 12))
            if weighted_stages[index] not in ("Saved", "Applied") else None,
        )
        for index in range(len(weighted_stages))
    ]
    db.session.add_all(applications)
    db.session.flush()

    now = datetime.now(timezone.utc)
    interview_apps = [item for item in applications if item.stage == "Interview"][:16]
    for item in interview_apps:
        db.session.add(Interview(
            application_id=item.id,
            kind=["Recruiter screen", "Technical", "Hiring manager"][item.id % 3],
            scheduled_at=now + timedelta(days=(item.id % 12) - 4),
            outcome="Upcoming" if item.id % 3 else "Completed",
        ))
    db.session.commit()


def application_json(item):
    return {
        "id": item.id,
        "company": item.company,
        "role": item.role,
        "stage": item.stage,
        "applied_date": item.applied_date.isoformat(),
        "source": item.source,
        "salary": item.salary,
        "notes": item.notes,
        "archived": item.archived,
        "follow_up_date": item.follow_up_date.isoformat() if item.follow_up_date else None,
        "contact_name": item.contact_name,
        "contact_email": item.contact_email,
    }


def create_app(config=None):
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///careerpilot.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SEED_DEMO_DATA=os.getenv("SEED_DEMO_DATA", "true").lower() == "true",
        SECRET_KEY=os.getenv("CAREERPILOT_SECRET_KEY", "careerpilot-local-development-key"),
        APP_PASSWORD=os.getenv("CAREERPILOT_PASSWORD", ""),
        AI_BASE_URL=os.getenv("AI_BASE_URL", "").rstrip("/"),
        AI_API_KEY=os.getenv("AI_API_KEY", ""),
        AI_MODEL=os.getenv("AI_MODEL", ""),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
    )
    if config:
        app.config.update(config)
    CORS(app)
    db.init_app(app)

    @app.before_request
    def require_login():
        public_endpoints = {"health", "auth_status", "login"}
        if (
            not app.config["APP_PASSWORD"]
            or request.endpoint in public_endpoints
            or request.method == "OPTIONS"
        ):
            return None
        if not session.get("authenticated"):
            return jsonify({"error": "Authentication required."}), 401
        return None

    with app.app_context():
        db.create_all()
        application_columns = {
            column["name"] for column in inspect(db.engine).get_columns("application")
        }
        migrations = {
            "archived": "BOOLEAN NOT NULL DEFAULT FALSE",
            "follow_up_date": "DATE",
            "contact_name": "VARCHAR(120) NOT NULL DEFAULT ''",
            "contact_email": "VARCHAR(254) NOT NULL DEFAULT ''",
            "responded_date": "DATE",
        }
        for column_name, column_definition in migrations.items():
            if column_name not in application_columns:
                db.session.execute(text(
                    f"ALTER TABLE application ADD COLUMN {column_name} {column_definition}"
                ))
        db.session.commit()
        if app.config["SEED_DEMO_DATA"]:
            seed_data()

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "careerpilot-api"})

    @app.get("/api/auth/status")
    def auth_status():
        required = bool(app.config["APP_PASSWORD"])
        return jsonify({
            "required": required,
            "authenticated": not required or bool(session.get("authenticated")),
        })

    @app.post("/api/auth/login")
    def login():
        password = str((request.get_json(silent=True) or {}).get("password", ""))
        configured_password = app.config["APP_PASSWORD"]
        if not configured_password or not hmac.compare_digest(password, configured_password):
            return jsonify({"error": "Invalid password."}), 401
        session.clear()
        session["authenticated"] = True
        return jsonify({"authenticated": True})

    @app.post("/api/auth/logout")
    def logout():
        session.clear()
        return jsonify({"authenticated": not bool(app.config["APP_PASSWORD"])})

    @app.get("/api/dashboard")
    def dashboard():
        applications = Application.query.order_by(
            Application.applied_date.desc(), Application.id.desc()
        ).filter_by(archived=False).all()
        total = len(applications)
        stage_counts = dict(
            db.session.query(Application.stage, func.count(Application.id))
            .filter(Application.archived.is_(False))
            .group_by(Application.stage)
            .all()
        )
        all_interviews = Interview.query.order_by(Interview.scheduled_at.asc()).all()
        now = datetime.now(timezone.utc)
        interviews = []
        for interview in all_interviews:
            scheduled_at = interview.scheduled_at
            if scheduled_at.tzinfo is None:
                scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
            if scheduled_at >= now:
                interviews.append(interview)
        responded = sum(item.stage not in ("Applied", "Saved") for item in applications)
        return jsonify({
            "metrics": {
                "total": total,
                "active": sum(item.stage in ("Applied", "Screening", "Interview") for item in applications),
                "interviews": len(interviews),
                "response_rate": round(responded / total * 100) if total else 0,
                "offers": stage_counts.get("Offer", 0),
                "follow_ups": sum(item.follow_up_date is not None for item in applications),
            },
            "stages": [{"stage": stage, "count": stage_counts.get(stage, 0)} for stage in STAGES],
            "applications": [application_json(item) for item in applications],
            "interviews": [{
                "id": item.id,
                "company": item.application.company,
                "role": item.application.role,
                "kind": item.kind,
                "scheduled_at": item.scheduled_at.isoformat(),
                "outcome": "Upcoming",
            } for item in interviews],
        })

    @app.get("/api/analytics")
    def analytics():
        try:
            days = int(request.args.get("days", "180"))
        except ValueError:
            return jsonify({"error": "Days must be one of 30, 90, 180, or 365."}), 400
        if days not in (30, 90, 180, 365):
            return jsonify({"error": "Days must be one of 30, 90, 180, or 365."}), 400

        start_date = date.today() - timedelta(days=days - 1)
        applications = Application.query.filter(
            Application.archived.is_(False),
            Application.applied_date >= start_date,
        ).all()
        role_filter = request.args.get("role", "").strip().casefold()
        company_filter = request.args.get("company", "").strip().casefold()
        source_filter = request.args.get("source", "").strip().casefold()
        if role_filter:
            applications = [item for item in applications if role_filter in item.role.casefold()]
        if company_filter:
            applications = [item for item in applications if company_filter in item.company.casefold()]
        if source_filter:
            applications = [item for item in applications if source_filter in item.source.casefold()]

        stage_counts = {stage: 0 for stage in STAGES}
        for application in applications:
            stage_counts[application.stage] = stage_counts.get(application.stage, 0) + 1
        responded = [
            item for item in applications
            if item.responded_date and item.responded_date <= date.today()
        ]
        response_times = [
            (item.responded_date - item.applied_date).days
            for item in responded
            if item.responded_date >= item.applied_date
        ]
        buckets = []
        bucket_count = min(12, max(1, (days + 29) // 30))
        for bucket_index in range(bucket_count):
            bucket_start = start_date + timedelta(days=bucket_index * 30)
            bucket_end = min(date.today(), bucket_start + timedelta(days=29))
            bucket_applications = [
                item for item in applications
                if bucket_start <= item.applied_date <= bucket_end
            ]
            buckets.append({
                "period": bucket_start.strftime("%b %d"),
                "applications": len(bucket_applications),
                "responses": sum(
                    item.responded_date is not None and item.responded_date <= date.today()
                    for item in bucket_applications
                ),
            })
        offer_and_interview = stage_counts.get("Offer", 0) + stage_counts.get("Interview", 0)
        return jsonify({
            "days": days,
            "start_date": start_date.isoformat(),
            "total": len(applications),
            "response_count": len(responded),
            "response_rate": round(len(responded) / len(applications) * 100) if applications else 0,
            "average_response_days": round(sum(response_times) / len(response_times), 1) if response_times else None,
            "interview_to_offer_rate": round(stage_counts.get("Offer", 0) / offer_and_interview * 100) if offer_and_interview else 0,
            "stages": [{"stage": stage, "count": stage_counts.get(stage, 0)} for stage in STAGES],
            "trend": buckets,
        })

    @app.post("/api/applications")
    def create_application():
        payload = request.get_json(silent=True) or {}
        company = str(payload.get("company", "")).strip()
        role = str(payload.get("role", "")).strip()
        if not company or not role:
            return jsonify({"error": "Company and role are required."}), 400
        try:
            salary = max(0, int(payload.get("salary") or 0))
            follow_up_date = date.fromisoformat(payload["follow_up_date"]) if payload.get("follow_up_date") else None
        except (TypeError, ValueError):
            return jsonify({"error": "Salary or follow-up date is invalid."}), 400
        contact_email = str(payload.get("contact_email") or "").strip()
        if contact_email and "@" not in contact_email:
            return jsonify({"error": "Enter a valid contact email."}), 400
        application = Application(
            company=company,
            role=role,
            stage="Saved",
            source=str(payload.get("source") or "Direct").strip(),
            salary=salary,
            notes=str(payload.get("notes") or "").strip(),
            contact_name=str(payload.get("contact_name") or "").strip(),
            contact_email=contact_email,
            follow_up_date=follow_up_date,
        )
        db.session.add(application)
        db.session.commit()
        return jsonify(application_json(application)), 201

    @app.get("/api/applications")
    def list_applications():
        include_archived = request.args.get("include_archived", "false").lower() == "true"
        query = Application.query
        if not include_archived:
            query = query.filter_by(archived=False)
        applications = query.order_by(
            Application.applied_date.desc(), Application.id.desc()
        ).all()
        return jsonify([application_json(item) for item in applications])

    @app.patch("/api/applications/<int:application_id>")
    def update_application(application_id):
        application = db.session.get(Application, application_id)
        if application is None:
            return jsonify({"error": "Application not found."}), 404
        payload = request.get_json(silent=True) or {}
        if "company" in payload:
            company = str(payload["company"]).strip()
            if not company:
                return jsonify({"error": "Company is required."}), 400
            application.company = company
        if "role" in payload:
            role = str(payload["role"]).strip()
            if not role:
                return jsonify({"error": "Role is required."}), 400
            application.role = role
        if "stage" in payload:
            if payload["stage"] not in STAGES:
                return jsonify({"error": "Choose a supported application stage."}), 400
            application.stage = payload["stage"]
        if "source" in payload:
            application.source = str(payload["source"]).strip() or "Direct"
        if "salary" in payload:
            try:
                application.salary = max(0, int(payload["salary"] or 0))
            except (TypeError, ValueError):
                return jsonify({"error": "Salary must be a non-negative number."}), 400
        if "notes" in payload:
            application.notes = str(payload["notes"]).strip()
        if "contact_name" in payload:
            application.contact_name = str(payload["contact_name"]).strip()
        if "contact_email" in payload:
            contact_email = str(payload["contact_email"]).strip()
            if contact_email and "@" not in contact_email:
                return jsonify({"error": "Enter a valid contact email."}), 400
            application.contact_email = contact_email
        if "follow_up_date" in payload:
            try:
                application.follow_up_date = (
                    date.fromisoformat(payload["follow_up_date"])
                    if payload["follow_up_date"] else None
                )
            except (TypeError, ValueError):
                return jsonify({"error": "Follow-up date must use YYYY-MM-DD."}), 400
        if "stage" in payload:
            if application.stage in ("Saved", "Applied"):
                application.responded_date = None
            elif application.responded_date is None:
                application.responded_date = date.today()
        if "archived" in payload:
            if not isinstance(payload["archived"], bool):
                return jsonify({"error": "Archived must be true or false."}), 400
            application.archived = payload["archived"]
        db.session.commit()
        return jsonify(application_json(application))

    @app.delete("/api/applications/<int:application_id>")
    def delete_application(application_id):
        application = db.session.get(Application, application_id)
        if application is None:
            return jsonify({"error": "Application not found."}), 404
        Interview.query.filter_by(application_id=application.id).delete()
        db.session.delete(application)
        db.session.commit()
        return "", 204

    def generate_practice_question(role, interview_type, job_description):
        role = role or "this role"
        question_sets = {
            "Behavioral": [
                f"Tell me about a difficult situation relevant to {role}. What did you do and what changed?",
                f"Describe a time you received critical feedback as a {role}. How did you respond?",
                f"Tell me about a disagreement with a teammate and how you moved the work forward as a {role}.",
            ],
            "Technical": [
                f"Walk me through a technical decision you made in a project relevant to {role}.",
                f"Describe how you would investigate a production issue in a {role} position.",
                f"Tell me about a complex problem you solved and the trade-offs you considered as a {role}.",
            ],
            "Case study": [
                f"A key project is behind schedule. How would you diagnose the cause and reset the plan as a {role}?",
                f"How would you prioritize competing requests from stakeholders in a {role} position?",
                f"What information would you gather before recommending a solution to a difficult {role} problem?",
            ],
        }
        if interview_type == "Role-specific":
            question = f"What would your first 30 days look like in a {role} role, and how would you measure progress?"
        else:
            question = random.choice(question_sets.get(interview_type, question_sets["Behavioral"]))
        if job_description:
            focus = next((line.strip(" -*\t") for line in job_description.splitlines() if len(line.strip()) > 20), "")
            if focus:
                question += f" Relate your answer to this role requirement: {focus[:220]}"
        return question

    @app.get("/api/practice/question")
    def practice_question():
        role = request.args.get("role", "this role").strip() or "this role"
        question = generate_practice_question(role, "Behavioral", "")
        return jsonify({"question": question, "mode": "local-demo"})

    @app.post("/api/practice/sessions")
    def create_practice_session():
        payload = request.get_json(silent=True) or {}
        role = str(payload.get("role", "")).strip()[:160] or "this role"
        interview_type = str(payload.get("interview_type", "Behavioral")).strip()
        if interview_type not in ("Behavioral", "Technical", "Role-specific", "Case study"):
            return jsonify({"error": "Choose a supported interview type."}), 400
        job_description = str(payload.get("job_description", "")).strip()
        if len(job_description) > 6000:
            return jsonify({"error": "Job description is too long."}), 413
        question = generate_practice_question(role, interview_type, job_description)
        ai_ready = bool(app.config["AI_BASE_URL"] and app.config["AI_API_KEY"] and app.config["AI_MODEL"])
        return jsonify({
            "question": question,
            "role": role,
            "interview_type": interview_type,
            "mode": "ai" if ai_ready else "local-demo",
            "answers_stored": False,
        })

    @app.get("/api/practice/status")
    def practice_status():
        enabled = bool(app.config["AI_BASE_URL"] and app.config["AI_API_KEY"] and app.config["AI_MODEL"])
        return jsonify({"mode": "ai" if enabled else "local-demo", "configured": enabled})

    @app.post("/api/practice/feedback")
    def practice_feedback():
        payload = request.get_json(silent=True) or {}
        answer = str(payload.get("answer", "")).strip()
        question = str(payload.get("question", "")).strip()
        if not answer:
            return jsonify({"error": "An answer is required."}), 400
        if len(answer) > 12000 or len(question) > 4000:
            return jsonify({"error": "The practice answer or question is too long."}), 413
        job_description = str(payload.get("job_description", "")).strip()[:6000]

        base_url = app.config["AI_BASE_URL"]
        api_key = app.config["AI_API_KEY"]
        model = app.config["AI_MODEL"]
        if base_url and api_key and model:
            endpoint = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"
            request_body = json.dumps({
                "model": model,
                "temperature": 0.3,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a practical interview coach. Give concise, specific feedback on relevance, personal actions, evidence, and outcome. Do not invent facts or rewrite the answer as if events happened.",
                    },
                    {
                        "role": "user",
                        "content": f"Interview question: {question or 'Not provided'}\n\nRole context:\n{job_description or 'Not provided'}\n\nCandidate answer:\n{answer}",
                    },
                ],
            }).encode("utf-8")
            provider_request = Request(
                endpoint,
                data=request_body,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            try:
                with urlopen(provider_request, timeout=30) as provider_response:
                    result = json.loads(provider_response.read().decode("utf-8"))
                feedback = result["choices"][0]["message"]["content"]
                if not isinstance(feedback, str) or not feedback.strip():
                    raise ValueError("AI provider returned an empty response")
                return jsonify({"feedback": feedback.strip(), "mode": "ai"})
            except (HTTPError, URLError, TimeoutError, KeyError, IndexError, ValueError, json.JSONDecodeError):
                return jsonify({"error": "The configured interview coach is temporarily unavailable."}), 502

        if len(answer.split()) < 35:
            feedback = "Add a specific example: set the context, explain your own actions, and finish with a concrete result or lesson."
        else:
            feedback = "Your answer has useful detail. Make the result explicit, distinguish your contribution from the team's, and end with what you learned."
        return jsonify({"feedback": feedback, "mode": "local-demo"})

    return app


app = create_app()
