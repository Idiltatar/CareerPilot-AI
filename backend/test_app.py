import pytest

import app as careerpilot_app
from app import create_app, db


@pytest.fixture
def client():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SEED_DEMO_DATA": False,
    })
    with app.app_context():
        db.create_all()
        with app.test_client() as test_client:
            yield test_client
        db.session.remove()
        db.drop_all()


@pytest.fixture
def protected_client():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SEED_DEMO_DATA": False,
        "APP_PASSWORD": "test-password",
        "SECRET_KEY": "test-signing-key",
    })
    with app.app_context():
        db.create_all()
        with app.test_client() as test_client:
            yield test_client
        db.session.remove()
        db.drop_all()


def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json["status"] == "ok"


def test_create_application_and_dashboard_metrics(client):
    response = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
        "source": "Referral",
    })

    assert response.status_code == 201
    assert response.json["stage"] == "Saved"

    dashboard = client.get("/api/dashboard")
    assert dashboard.status_code == 200
    assert dashboard.json["metrics"]["total"] == 1
    assert dashboard.json["metrics"]["response_rate"] == 0
    assert dashboard.json["applications"][0]["company"] == "Northstar"


@pytest.mark.parametrize("payload", [{}, {"company": "Northstar"}, {"role": "Analyst"}])
def test_create_application_requires_company_and_role(client, payload):
    response = client.post("/api/applications", json=payload)

    assert response.status_code == 400
    assert "error" in response.json


def test_update_application_stage(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })

    response = client.patch(
        f"/api/applications/{created.json['id']}",
        json={"stage": "Interview"},
    )

    assert response.status_code == 200
    assert response.json["stage"] == "Interview"


def test_update_application_rejects_invalid_stage(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })

    response = client.patch(
        f"/api/applications/{created.json['id']}",
        json={"stage": "Unknown"},
    )

    assert response.status_code == 400


def test_update_missing_application_returns_not_found(client):
    response = client.patch("/api/applications/999", json={"stage": "Applied"})

    assert response.status_code == 404


def test_list_applications_supports_archived_filter(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })
    application_id = created.json["id"]
    client.patch(f"/api/applications/{application_id}", json={"archived": True})

    assert client.get("/api/applications").json == []
    archived = client.get("/api/applications?include_archived=true")
    assert len(archived.json) == 1
    assert archived.json[0]["id"] == application_id


def test_update_application_fields(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })

    response = client.patch(f"/api/applications/{created.json['id']}", json={
        "company": "Northstar Labs",
        "role": "Senior Analyst",
        "source": "Referral",
        "salary": 95000,
        "notes": "Follow up next week",
    })

    assert response.status_code == 200
    assert response.json["company"] == "Northstar Labs"
    assert response.json["role"] == "Senior Analyst"
    assert response.json["source"] == "Referral"
    assert response.json["salary"] == 95000


def test_archived_application_can_be_restored(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })
    application_id = created.json["id"]

    archived = client.patch(f"/api/applications/{application_id}", json={"archived": True})
    assert archived.status_code == 200
    assert client.get("/api/dashboard").json["metrics"]["total"] == 0
    assert all(stage["count"] == 0 for stage in client.get("/api/dashboard").json["stages"])

    restored = client.patch(f"/api/applications/{application_id}", json={"archived": False})
    assert restored.status_code == 200
    assert client.get("/api/dashboard").json["metrics"]["total"] == 1


def test_update_application_rejects_empty_company(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })

    response = client.patch(f"/api/applications/{created.json['id']}", json={"company": " "})

    assert response.status_code == 400


def test_update_application_rejects_invalid_salary(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })

    response = client.patch(f"/api/applications/{created.json['id']}", json={"salary": "unknown"})

    assert response.status_code == 400


def test_application_saves_contact_notes_and_follow_up(client):
    response = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
        "contact_name": "Jordan Recruiter",
        "contact_email": "jordan@example.com",
        "follow_up_date": "2026-10-12",
        "notes": "Send a short update after the interview.",
    })

    assert response.status_code == 201
    assert response.json["contact_name"] == "Jordan Recruiter"
    assert response.json["contact_email"] == "jordan@example.com"
    assert response.json["follow_up_date"] == "2026-10-12"
    assert response.json["notes"] == "Send a short update after the interview."


def test_create_application_rejects_invalid_follow_up_date(client):
    response = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
        "follow_up_date": "next Monday",
    })

    assert response.status_code == 400


def test_analytics_reports_real_response_and_stage_metrics(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })
    client.patch(f"/api/applications/{created.json['id']}", json={"stage": "Interview"})

    response = client.get("/api/analytics?days=30&role=analyst")

    assert response.status_code == 200
    assert response.json["total"] == 1
    assert response.json["response_count"] == 1
    assert response.json["response_rate"] == 100
    assert response.json["stages"] == [
        {"stage": "Saved", "count": 0},
        {"stage": "Applied", "count": 0},
        {"stage": "Screening", "count": 0},
        {"stage": "Interview", "count": 1},
        {"stage": "Offer", "count": 0},
        {"stage": "Rejected", "count": 0},
    ]


@pytest.mark.parametrize("days", ["0", "31", "many"])
def test_analytics_rejects_unsupported_windows(client, days):
    response = client.get(f"/api/analytics?days={days}")

    assert response.status_code == 400


def test_auth_status_and_protected_endpoints(protected_client):
    status = protected_client.get("/api/auth/status")
    dashboard = protected_client.get("/api/dashboard")

    assert status.json == {"required": True, "authenticated": False}
    assert dashboard.status_code == 401


def test_login_rejects_invalid_password(protected_client):
    response = protected_client.post("/api/auth/login", json={"password": "wrong"})

    assert response.status_code == 401


def test_login_unlocks_api_and_logout_relocks_it(protected_client):
    login = protected_client.post("/api/auth/login", json={"password": "test-password"})
    dashboard = protected_client.get("/api/dashboard")
    logout = protected_client.post("/api/auth/logout")
    relocked = protected_client.get("/api/dashboard")

    assert login.status_code == 200
    assert dashboard.status_code == 200
    assert logout.status_code == 200
    assert relocked.status_code == 401


def test_configured_ai_coach_uses_server_side_provider(monkeypatch):
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SEED_DEMO_DATA": False,
        "AI_BASE_URL": "https://ai.example.test/v1",
        "AI_API_KEY": "test-token",
        "AI_MODEL": "test-model",
    })

    class ProviderResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            return b'{"choices":[{"message":{"content":"Name your measurable result."}}]}'

    def fake_urlopen(provider_request, timeout):
        assert provider_request.full_url == "https://ai.example.test/v1/chat/completions"
        assert provider_request.get_header("Authorization") == "Bearer test-token"
        assert timeout == 30
        return ProviderResponse()

    monkeypatch.setattr(careerpilot_app, "urlopen", fake_urlopen)
    with app.test_client() as test_client:
        response = test_client.post("/api/practice/feedback", json={
            "question": "What did you improve?",
            "answer": "I improved the release process.",
        })

    assert response.status_code == 200
    assert response.json == {"feedback": "Name your measurable result.", "mode": "ai"}


def test_delete_application(client):
    created = client.post("/api/applications", json={
        "company": "Northstar",
        "role": "Data Analyst",
    })

    response = client.delete(f"/api/applications/{created.json['id']}")

    assert response.status_code == 204
    assert client.get("/api/applications").json == []


def test_practice_question_uses_requested_role(client):
    response = client.get("/api/practice/question?role=Data%20Analyst")

    assert response.status_code == 200
    assert "Data Analyst" in response.json["question"]
    assert response.json["mode"] == "local-demo"


def test_practice_feedback_requires_answer(client):
    response = client.post("/api/practice/feedback", json={"answer": " "})

    assert response.status_code == 400


def test_practice_feedback_returns_guidance(client):
    response = client.post("/api/practice/feedback", json={
        "answer": "I mapped the issue, coordinated with my team, and measured the improvement after delivery.",
    })

    assert response.status_code == 200
    assert response.json["feedback"]
    assert response.json["mode"] == "local-demo"


def test_practice_session_uses_role_type_and_job_description(client):
    response = client.post("/api/practice/sessions", json={
        "role": "Data Analyst",
        "interview_type": "Technical",
        "job_description": "Build reliable reporting pipelines for business teams.",
    })

    assert response.status_code == 200
    assert "Data Analyst" in response.json["question"]
    assert "Build reliable reporting pipelines" in response.json["question"]
    assert response.json["interview_type"] == "Technical"
    assert response.json["answers_stored"] is False


def test_practice_session_rejects_unsupported_type(client):
    response = client.post("/api/practice/sessions", json={"interview_type": "Trivia"})

    assert response.status_code == 400