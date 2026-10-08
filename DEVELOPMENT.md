# Agentic OS — Development & Contributor Guide

## 1. Local Development Setup

### Backend (FastAPI + Python 3.13)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run development server
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js 14 App Router)
```bash
cd frontend
npm install
npm run dev
```

---

## 2. Running Automated Tests

```bash
cd backend

# Run all 71 tests
pytest -v

# Run specific phase tests
pytest tests/test_phase8_e2e_demo.py -vv
pytest tests/test_memory_and_replanning.py -vv
pytest tests/test_approvals.py -vv
```

---

## 3. Creating Database Migrations

When modifying SQLAlchemy models in `app/models/`:
```bash
cd backend
alembic revision --autogenerate -m "describe_changes"
alembic upgrade head
```

---

## 4. Environment Switching

- **Offline / Mock Development**:
  ```env
  LLM_PROVIDER=mock
  EMBEDDING_PROVIDER=mock
  DATABASE_URL=sqlite+aiosqlite:///./agentic_os.db
  ```
- **Live Cloud LLM / Production**:
  ```env
  LLM_PROVIDER=claude
  ANTHROPIC_API_KEY=sk-ant-api03-...
  EMBEDDING_PROVIDER=openai
  OPENAI_API_KEY=sk-proj-...
  DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/agentic_os
  ```
