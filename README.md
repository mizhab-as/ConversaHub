# ConversaHub 🌿
### Enterprise Conversational AI Platform

[![CI](https://github.com/mizhab-as/ConversaHub/actions/workflows/ci.yml/badge.svg)](https://github.com/mizhab-as/ConversaHub/actions)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-orange)](https://langchain-ai.github.io/langgraph/)
[![Tests](https://img.shields.io/badge/Tests-16%20passing-brightgreen)]()

ConversaHub is a **production-grade, portfolio-quality enterprise SaaS** platform for AI-powered customer support. It combines a stateful LangGraph AI agent, semantic RAG knowledge retrieval (ChromaDB), multi-tenant ticketing, and role-based access control — all deployable with Docker.

---

## ✦ Tech Stack

| Layer | Technology |
|---|---|
| **AI Agent** | LangGraph + Google Gemini (with MockLLM fallback) |
| **RAG Engine** | ChromaDB + LangChain Text Splitters |
| **Backend API** | FastAPI (async) + SQLAlchemy 2.0 |
| **Database** | SQLite (dev) / PostgreSQL (production) |
| **Cache** | Redis (refresh token rotation) |
| **Auth** | JWT Access Tokens + Refresh Token Rotation (RTR) |
| **Frontend** | Next.js 16 (App Router) + Tailwind CSS |
| **Testing** | pytest + httpx AsyncClient (16 integration tests) |
| **CI/CD** | GitHub Actions (lint + test + build on every push) |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js 20+
- (Optional) Redis for refresh token caching

### 1. Clone the repository
```bash
git clone https://github.com/mizhab-as/ConversaHub.git
cd ConversaHub
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (optional — works offline without it)
```

### 3. Start the backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Start the frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 5. Run all tests
```bash
cd backend
PYTHONPATH=. pytest tests/ -v
# ✓ 16 passed
```

---

## 🐳 Docker Deployment (Production)

```bash
# Set your secrets in .env first
cp .env.example .env

# Build and launch all 4 services
docker compose up --build -d

# Services:
# → Frontend:  http://localhost:3000
# → Backend:   http://localhost:8000
# → API Docs:  http://localhost:8000/api/v1/docs
```

---

## 🗂 Project Architecture

```
ConversaHub/
├── backend/                   # FastAPI application
│   ├── app/
│   │   ├── api/v1/            # REST API endpoints
│   │   │   ├── auth.py        # JWT auth + token rotation
│   │   │   ├── chat.py        # AI agent chat endpoint
│   │   │   ├── kb.py          # Knowledge base admin endpoints
│   │   │   └── tickets.py     # Support ticket CRUD
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── repositories/      # Repository pattern (DB queries)
│   │   ├── schemas/           # Pydantic validation schemas
│   │   └── services/
│   │       ├── ai/
│   │       │   ├── agent.py   # LangGraph stateful agent
│   │       │   ├── tools.py   # AI tools (book, escalate)
│   │       │   └── prompts.py # System prompts
│   │       ├── rag_service.py # Chunking + vector search
│   │       └── vector_store.py# ChromaDB client + embeddings
│   └── tests/                 # 16 integration tests
│
├── frontend/                  # Next.js App Router
│   └── src/app/
│       ├── page.tsx           # Landing page
│       ├── login/             # Login page
│       ├── signup/            # Signup + role selector
│       └── dashboard/
│           ├── customer/      # AI chat + ticket view
│           ├── agent/         # Ticket queue management
│           └── admin/         # KB upload + system overview
│
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── docker-compose.yml         # Production orchestration
└── .env.example               # Environment variable template
```

---

## 🔐 Role-Based Access

| Role | Access |
|---|---|
| **Customer** | AI chat, create tickets, view own tickets |
| **Support Agent** | View all tickets, assign to self, mark resolved |
| **Admin** | Upload knowledge base docs, view all tickets, system stats |

---

## 🤖 AI Agent Architecture (LangGraph)

```
Customer Message
      │
      ▼
  ┌─────────┐
  │  Router │ ← Classifies intent: rag / escalate / general
  └────┬────┘
       │
  ┌────▼────────┐        ┌──────────────┐
  │  Retriever  │───────►│   ChromaDB   │ (semantic similarity search)
  └────┬────────┘        └──────────────┘
       │
  ┌────▼──────────┐      ┌────────────────────┐
  │   Responder   │─────►│  Gemini LLM        │ (with tool calling)
  └───────────────┘      └────────┬───────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │  Tools                      │
                    │  ├── book_appointment_tool  │
                    │  └── escalate_to_human_tool │
                    │       └── Creates DB Ticket │
                    └─────────────────────────────┘
```

---

## 🧪 Test Coverage

```
backend/tests/
├── test_auth.py     (6 tests)  — JWT auth, roles, token rotation
├── test_agent.py    (2 tests)  — LangGraph routing, tool execution
├── test_rag.py      (3 tests)  — KB upload permissions, RAG retrieval
├── test_tickets.py  (3 tests)  — RBAC, ticket lifecycle, AI escalation
└── test_main.py     (2 tests)  — Health check, API root
                     ─────────
                     16 tests total ✓
```

---

## 📋 API Documentation

Interactive Swagger UI is available at:
```
http://localhost:8000/api/v1/docs
```

---

## 🔑 Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | JWT signing secret — generate with `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Optional | Google AI API key — falls back to MockLLM if not set |
| `DATABASE_PROVIDER` | — | `sqlite` (default/dev) or `postgres` (production) |
| `POSTGRES_*` | Production | PostgreSQL connection credentials |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL for the Next.js client |

---

## 👨‍💻 Built With

This project was built as a **portfolio-grade enterprise SaaS application** demonstrating:
- Agentic AI system design with LangGraph
- Production FastAPI patterns (async, repository pattern, RBAC)
- Retrieval-Augmented Generation (RAG) with vector databases
- JWT security with Refresh Token Rotation
- Multi-tenant data isolation
- Full-stack TypeScript + Python integration
- Automated CI/CD with GitHub Actions
