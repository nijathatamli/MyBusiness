# MyBusiness Backend (Flask + PostgreSQL)

This project now includes a Flask backend API with:

- User registration with hashed password
- OTP verification flow
- Login with JWT authentication
- Startup evaluation (`great`, `normal`, `so bad`) using a lightweight ML-style scorer
- Dashboard API with startup counts and percentages

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## PostgreSQL config

Set `DATABASE_URL`:

```bash
export DATABASE_URL='postgresql+psycopg2://postgres:postgres@localhost:5432/mybusiness'
export JWT_SECRET='replace-this-secret'
```

## Run server

```bash
python backend_app.py
```

## Main endpoints

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `POST /api/startups` (auth)
- `GET /api/startups` (auth)
- `GET /api/dashboard` (auth)
