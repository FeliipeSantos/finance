import pyotp


def test_mfa_setup_enable_and_login_flow(api, register_user):
    user = register_user(password="mfa-password")

    setup = api.get("/auth/mfa/setup", token=user["token"])
    assert setup.status_code == 200
    secret = setup.json()["secret"]

    valid_code = pyotp.TOTP(secret).now()
    enable_resp = api.post("/auth/mfa/enable", token=user["token"], json={"code": valid_code})
    assert enable_resp.status_code == 200

    # Login sem otp_token deve sinalizar que MFA é necessário, sem emitir token
    login_no_otp = api.post("/auth/login", json={"email": user["email"], "password": "mfa-password"})
    assert login_no_otp.status_code == 200
    assert login_no_otp.json()["mfaRequired"] is True
    assert login_no_otp.json()["token"] is None

    # Código errado é rejeitado
    login_wrong_otp = api.post(
        "/auth/login", json={"email": user["email"], "password": "mfa-password", "otpToken": "000000"}
    )
    assert login_wrong_otp.status_code == 401

    # Código correto autentica normalmente
    fresh_code = pyotp.TOTP(secret).now()
    login_ok = api.post(
        "/auth/login", json={"email": user["email"], "password": "mfa-password", "otpToken": fresh_code}
    )
    assert login_ok.status_code == 200
    assert login_ok.json()["token"]


def test_mfa_disable_removes_requirement(api, register_user):
    user = register_user(password="mfa-password")
    secret = api.get("/auth/mfa/setup", token=user["token"]).json()["secret"]
    api.post("/auth/mfa/enable", token=user["token"], json={"code": pyotp.TOTP(secret).now()})

    disable_resp = api.post("/auth/mfa/disable", token=user["token"])
    assert disable_resp.status_code == 200

    login_resp = api.post("/auth/login", json={"email": user["email"], "password": "mfa-password"})
    assert login_resp.status_code == 200
    assert login_resp.json()["mfaRequired"] is False
    assert login_resp.json()["token"]
