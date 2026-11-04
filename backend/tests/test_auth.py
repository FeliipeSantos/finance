def test_login_with_unknown_email_returns_generic_message(api):
    resp = api.post("/auth/login", json={"email": "nobody@nowhere.com", "password": "whatever"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "E-mail ou senha inválidos"


def test_login_with_wrong_password_returns_same_generic_message(api, register_user):
    user = register_user(password="correct-password")
    resp = api.post("/auth/login", json={"email": user["email"], "password": "wrong-password"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "E-mail ou senha inválidos"


def test_login_with_correct_credentials_succeeds(api, register_user):
    user = register_user(password="correct-password")
    resp = api.post("/auth/login", json={"email": user["email"], "password": "correct-password"})
    assert resp.status_code == 200
    assert resp.json()["token"]


def test_register_rejects_short_password(api):
    resp = api.post(
        "/auth/register",
        json={"email": "shortpw@test.com", "password": "abc", "fullName": "Short"},
    )
    assert resp.status_code == 422


def test_register_rejects_duplicate_email(api, register_user):
    user = register_user()
    resp = api.post(
        "/auth/register",
        json={"email": user["email"], "password": "123456", "fullName": "Duplicate"},
    )
    assert resp.status_code == 400
