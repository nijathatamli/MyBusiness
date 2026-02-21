# MyBusiness Backend (Flask + PostgreSQL)

This backend provides:
- Register / OTP verify / login APIs
- JWT-protected startup APIs
- Startup scoring labels: `great`, `normal`, `so bad`
- Dashboard stats API

## 1) Install Python packages

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Start PostgreSQL (required)

You got the error because PostgreSQL was not running on `localhost:5432`.

### Option A — Docker (quickest)

```bash
docker run --name mybusiness-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mybusiness \
  -p 5432:5432 \
  -d postgres:16
```

### Option B — Local PostgreSQL service

Install and start postgres, then create DB/user:

```bash
sudo -u postgres psql -c "CREATE DATABASE mybusiness;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

## 3) Configure environment

```bash
export DATABASE_URL='postgresql+psycopg2://postgres:postgres@localhost:5432/mybusiness'
export JWT_SECRET='replace-this-secret'
```

## 4) Run backend

```bash
python3 backend_app.py
```

If DB is unreachable, app now prints a short fix guide instead of a long traceback.

## 5) Test quickly

```bash
curl http://127.0.0.1:5000/health
```

## API endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `POST /api/startups` (Bearer token)
- `GET /api/startups` (Bearer token)
- `GET /api/dashboard` (Bearer token)


## Frontend routing

Open frontend from Flask server:

```bash
http://127.0.0.1:5000/
```

Dashboard route is also available and currently serves the same SPA page:

```bash
http://127.0.0.1:5000/dashboard
```

API health endpoint:

```bash
http://127.0.0.1:5000/api/health
```
