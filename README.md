# ConversaHub 🌿
### Enterprise Conversational AI & Multi-Tenant Support Platform

[![CI](https://github.com/mizhab-as/ConversaHub/actions/workflows/ci.yml/badge.svg)](https://github.com/mizhab-as/ConversaHub/actions)
[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-orange)](https://langchain-ai.github.io/langgraph/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20DB-purple)](https://www.trychroma.com/)
[![Tests](https://img.shields.io/badge/Tests-20%20passing-brightgreen)]()

ConversaHub is a **production-grade enterprise SaaS platform** designed for AI-driven customer support automation. Powered by a stateful **LangGraph AI agent**, **ChromaDB RAG semantic search**, **WebSockets real-time alert dispatch**, and **Refresh Token Rotation (RTR)** security, ConversaHub seamlessly orchestrates automated AI responses with real-time human escalation workflows.

---

## ✦ Technical Highlights & Architecture

- 🤖 **Stateful LangGraph AI Agent**: Intent classification router (RAG query vs. human escalation vs. general chat) with autonomous tool calling.
- 📚 **Multi-Format Document Library**: Ingests PDF, DOCX, TXT, and Markdown files into ChromaDB vector store with chunking, metadata tracking, and document library deletion.
- ⚡ **Real-Time WebSocket Notifications**: Instant ticket dispatch to connected Support Agent dashboards without manual browser refreshes.
- 🔐 **Zero-Trust Security & RBAC**: Strict Role-Based Access Control (Customer, Agent, Admin) backed by JWT access tokens and Redis Refresh Token Rotation (RTR).
- 🧹 **Cascading Data Integrity**: Automated DB cleanup handling user/agent deletions, unassigning orphan tickets, and purging stale records on server boot.

---

## 🛠 Tech Stack Matrix

| Layer | Technology | Key Details |
|---|---|---|
| **AI Orchestration** | LangGraph + Google Gemini / MockLLM | Intent routing, tool execution, stateful conversation graph |
| **RAG Retrieval Engine**| ChromaDB + LangChain | Recursive character chunking, embedding similarity search, multi-format loaders (PDF, DOCX, TXT, MD) |
| **Backend Framework** | FastAPI (Python 3.12) | Fully asynchronous, Repository Pattern, Dependency Injection |
| **Databases** | SQLite (Dev) / PostgreSQL (Prod) | Async SQLAlchemy 2.0 ORM, strict foreign key cascading |
| **Caching & Real-Time**| Redis + WebSockets | Token blacklisting, session state, real-time alert sockets |
| **Authentication** | OAuth2 JWT + RTR | Access token expiration, RTR replay detection & token revocation |
| **Frontend UI** | Next.js 16 (App Router) + React | TypeScript, Tailwind CSS, lucide-react, reactive socket listeners |
| **Automated Testing** | Pytest + HTTPX AsyncClient | 20 comprehensive integration tests covering end-to-end user flows |
| **Containerization** | Docker + Docker Compose | Multi-container orchestration (Frontend, Backend, Redis, Chroma) |

---

## 🔑 Demo Accounts & Rapid Testing

Run `./start.sh` in the repository root to start all services, then log in using the pre-configured demo credentials:

| Role | Email Credentials | Password | Default Portal URL |
|---|---|---|---|
| 👑 **Admin** | `admin@demo.com` | `password123` | [`http://localhost:3000/dashboard/admin`](http://localhost:3000/dashboard/admin) |
| 🎧 **Support Agent** | `agent@demo.com` | `password123` | [`http://localhost:3000/dashboard/agent`](http://localhost:3000/dashboard/agent) |
| 👤 **Customer** | `customer@demo.com` | `password123` | [`http://localhost:3000/dashboard/customer`](http://localhost:3000/dashboard/customer) |

---

## 🤖 AI Agent & RAG Pipeline Architecture

```
                       [ Customer Chat Input ]
                                  │
                                  ▼
                      ┌───────────────────────┐
                      │   LangGraph Router    │
                      └───────────┬───────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │ Intent: RAG Query     │ Intent: Escalation    │ Intent: General
          ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ ChromaDB RAG     │    │ Escalate Tool    │    │ Gemini Response  │
│ Vector Retrieval │    │ Creates DB Ticket│    │ Direct LLM Chat  │
└────────┬─────────┘    └────────┬─────────┘    └──────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Context Synthesis│    │ WebSockets Alert │
│ & Source Badging │    │ Dispatched to    │
└──────────────────┘    │ Agent Dashboards │
                        └──────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Configure
```bash
git clone https://github.com/mizhab-as/ConversaHub.git
cd ConversaHub
cp .env.example .env
```

### 2. Start Backend Service
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend App
```bash
cd frontend
npm install
npm run dev
# App launched at http://localhost:3000
```

### 4. Execute Backend Integration Tests
```bash
cd backend
PYTHONPATH=. pytest tests/ -v
# ✓ 20 passed
```

---

## 🐳 Docker Production Deployment

Deploy the full microservices stack with a single command:

```bash
docker compose up --build -d
```

| Service | Access Endpoint | Description |
|---|---|---|
| **Frontend Web App** | `http://localhost:3000` | Next.js App Router client |
| **Backend REST API** | `http://localhost:8000` | FastAPI application server |
| **Interactive API Docs** | `http://localhost:8000/api/v1/docs` | OpenAPI / Swagger UI |

---

## 🗂 Workspace Directory Structure

```
ConversaHub/
├── backend/                   # FastAPI Application Server
│   ├── app/
│   │   ├── api/v1/            # API Route Controllers (Auth, Chat, KB, Tickets, Users)
│   │   ├── models/            # SQLAlchemy 2.0 Database Models
│   │   ├── repositories/      # Data Access Layer & DB Repository Pattern
│   │   ├── schemas/           # Pydantic Schemas & DTO Validation
│   │   └── services/
│   │       ├── ai/            # LangGraph Agent, Custom Tools & Prompts
│   │       ├── rag_service.py # Document Chunking & Text Extraction
│   │       └── vector_store.py# ChromaDB Vector Store Integration
│   └── tests/                 # 20 Integration Tests (Pytest + AsyncClient)
│
├── frontend/                  # Next.js 16 Web Application
│   └── src/app/
│       ├── login/ & signup/   # Authentication & Role Registration Pages
│       └── dashboard/         # Role-Scoped Dashboards (Customer, Agent, Admin)
│
├── test_guide.md              # System Verification Guide & Step-by-Step Scenarios
├── docker-compose.yml         # Production Container Orchestration
└── start.sh                   # One-Click Platform Launcher Script
```

---

## 🧪 Comprehensive Test Coverage (20 Integration Tests)

```
backend/tests/
├── test_auth.py     (6 tests)  — Signup, login, invalid credentials, RTR token rotation & replay detection
├── test_agent.py    (2 tests)  — LangGraph router classification, end-to-end agent chat tool flow
├── test_rag.py      (4 tests)  — KB upload RBAC, direct vector search, RAG chat context, multi-format doc delete
├── test_tickets.py  (4 tests)  — Ticket CRUD, RBAC restrictions, AI escalation ticket creation, ticket deletion
├── test_users.py    (2 tests)  — Admin user management flow, cascading ticket unassignment on user deletion
└── test_main.py     (2 tests)  — System health checks, root endpoint responses
                     ─────────
                     20 passed in 9.68s ✓
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `SECRET_KEY` | ✅ Yes | JWT signature key | `generate with openssl rand -hex 32` |
| `GEMINI_API_KEY` | Optional | Google Gemini LLM API key | `AIzaSy...` (Falls back to MockLLM) |
| `DATABASE_PROVIDER` | Optional | DB backend type (`sqlite` or `postgres`) | `sqlite` |
| `POSTGRES_SERVER` | Production | PostgreSQL host | `db` |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL for Next.js client | `http://localhost:8000` |

---

## 📜 Verification & Testing Manual

For a complete step-by-step walkthrough covering manual verification of RAG search, multi-format document uploads, ticket assignment/unassignment flows, and WebSocket alerts, refer to [`test_guide.md`](test_guide.md).

---

## 👨‍💻 Engineering Highlights

ConversaHub is engineered as a **portfolio-grade enterprise SaaS codebase**, demonstrating industry best practices:
- **Agentic AI Graph Architecture**: Stateful routing and modular tool execution with fallback handling.
- **RAG Data Ingestion Pipeline**: Document parsing across heterogeneous formats (PDF, DOCX, TXT, MD) with ChromaDB persistence.
- **Production API Design**: Async FastAPI with repository abstraction layer and clean separation of concerns.
- **Security-First Auth**: Access token short lifetimes combined with Redis Refresh Token Rotation (RTR) and replay detection.
