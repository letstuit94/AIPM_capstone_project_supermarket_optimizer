# AIPM_capstone_project_supermarket_optimizer

## Prerequisites

- [pyenv](https://github.com/pyenv/pyenv) with Python 3.11.3 installed (`pyenv install 3.11.3` if you don't have it yet)
- Node.js + npm installed
- A `.env` file at the repo root with `SUPABASE_URL`, `SUPABASE_KEY`, and `GEMINI_API_KEY` set. This file is gitignored and never committed — get the values from a teammate if you don't already have them.

## Backend setup

Run from the repo root:

```bash
pyenv local 3.11.3
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

## Run the backend

```bash
uvicorn backend.app.main:app --reload
```

Run this from the repo root too — it loads `backend.app.main` as a module, so running it from inside `backend/` will fail with `ModuleNotFoundError`.

API docs: http://localhost:8000/docs

## Frontend setup and run

In a **second terminal** (the backend needs to keep running in the first one):

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (defaults to http://localhost:5173).

> The backend's CORS config only allows `http://localhost:5173` / `127.0.0.1:5173`. If that port is already taken on your machine, Vite will silently move to 5174+ and the frontend's API calls will fail with CORS errors — either free up 5173 or add the new port to `allow_origins` in `backend/app/main.py`.
