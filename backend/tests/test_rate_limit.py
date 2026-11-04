from app.core.rate_limit import limiter


def test_login_is_rate_limited_after_repeated_attempts(api, register_user):
    # Reseta antes E depois: outros testes deste arquivo também batem em
    # /auth/login e compartilham o mesmo contador em memória por IP (todos os
    # testes rodam a partir de 127.0.0.1), então isolamos este teste para não
    # vazar estado para quem rodar antes/depois na mesma sessão.
    limiter.reset()
    user = register_user(password="rl-password")

    responses = [
        api.post("/auth/login", json={"email": user["email"], "password": "wrong-password"}) for _ in range(11)
    ]
    statuses = [r.status_code for r in responses]

    assert statuses[0] == 401  # primeira tentativa processada normalmente (senha errada)
    assert 429 in statuses  # a partir da 11a dentro do mesmo minuto, bloqueado

    limiter.reset()
