# FocusLoop Backend

FastAPI backend for the FocusLoop MVP contract.

## Local Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The frontend can call the API at `http://localhost:8000/api/v1`.

## Docker Setup

From the backend directory:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- FastAPI backend on `localhost:8000`
- Vite frontend on `localhost:5173`

The backend container runs Alembic migrations on startup. Demo seed data is inserted only when the database is empty; set `SEED_ON_START=false` to disable seeding.
