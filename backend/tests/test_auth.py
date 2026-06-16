def signup(client, email="sarah@acme.com", password="password123", name="Sarah", org_name="Acme Inc"):
    return client.post(
        "/auth/signup",
        json={"name": name, "email": email, "password": password, "org_name": org_name},
    )


class TestSignup:
    def test_signup_creates_org_and_admin_user(self, client):
        response = signup(client)

        assert response.status_code == 201
        body = response.json()
        assert body["user"]["email"] == "sarah@acme.com"
        assert body["user"]["name"] == "Sarah"
        assert body["user"]["org_name"] == "Acme Inc"
        assert body["user"]["role"] == "Admin"
        assert body["access_token"]
        assert body["token_type"] == "bearer"

    def test_signup_duplicate_email_returns_409(self, client):
        signup(client, email="dupe@acme.com")
        response = signup(client, email="dupe@acme.com", org_name="A Different Org")

        assert response.status_code == 409

    def test_signup_invalid_email_returns_422(self, client):
        response = signup(client, email="not-an-email")
        assert response.status_code == 422

    def test_signup_short_password_returns_422(self, client):
        response = signup(client, password="short")
        assert response.status_code == 422


class TestLogin:
    def test_login_with_correct_credentials_succeeds(self, client):
        signup(client, email="sarah@acme.com", password="password123")

        response = client.post(
            "/auth/login", json={"email": "sarah@acme.com", "password": "password123"}
        )

        assert response.status_code == 200
        assert response.json()["user"]["email"] == "sarah@acme.com"

    def test_login_with_wrong_password_returns_401(self, client):
        signup(client, email="sarah@acme.com", password="password123")

        response = client.post(
            "/auth/login", json={"email": "sarah@acme.com", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_login_with_unknown_email_returns_same_401_message(self, client):
        # Must match the wrong-password message exactly -- different
        # messages would let an attacker enumerate registered emails.
        response = client.post(
            "/auth/login", json={"email": "nobody@nowhere.com", "password": "whatever123"}
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_login_email_is_case_insensitive(self, client):
        signup(client, email="sarah@acme.com", password="password123")

        response = client.post(
            "/auth/login", json={"email": "SARAH@ACME.COM", "password": "password123"}
        )

        assert response.status_code == 200


class TestMe:
    def test_me_without_token_returns_401(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
        assert response.status_code == 401

    def test_me_with_valid_token_returns_current_user(self, client):
        token = signup(client, email="sarah@acme.com").json()["access_token"]

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        assert response.json()["email"] == "sarah@acme.com"
