# ConversaHub — Quick Verification Guide

Ensure the platform is running by executing `./start.sh` in the project root.
- **Backend API**: `http://localhost:8000`
- **Frontend App**: `http://localhost:3000`

---

## 🔑 Demo Accounts

| Role | Email | Password | Dashboard URL |
|---|---|---|---|
| **Admin** | `admin@demo.com` | `password123` | `/dashboard/admin` |
| **Agent** | `agent@demo.com` | `password123` | `/dashboard/agent` |
| **Customer** | `customer@demo.com` | `password123` | `/dashboard/customer` |

---

## 🧪 Core Tests to Verify the System

### Test 1: AI Chat & Auto-Escalation (Customer Portal)
1. Sign in to `http://localhost:3000` as **Customer** (`customer@demo.com`).
2. Go to **AI Chat** and type: `What is the refund policy?`
   - ✅ Response should answer matching the knowledge base content.
   - ✅ The badge below the message should read **Knowledge Base (RAG)**.
3. Next, type: `I want to talk to a human agent`
   - ✅ Response will state that a ticket has been created.
   - ✅ The badge should show **Ticket Created** with the Ticket ID.

---

### Test 2: Upgraded Document Library (Admin Panel)
1. Sign in as **Admin** (`admin@demo.com`).
2. Head to the **Knowledge Base** tab:
   - ✅ Drag and drop a file (**PDF, DOCX, TXT, or MD**) or click to choose one.
   - ✅ Enter a Title and click **Ingest Document**.
   - ✅ Verify the document appears in the **Document Library table** below showing file type (badge/icon), name, chunk size, uploader, and date.
3. Click the **Delete** button next to a document:
   - ✅ Chunks count should decrease and the document should disappear from the table.

---

### Test 3: Agent Assignment & Unassignment (Admin & Agent Panels)
1. In the **Admin Dashboard** (`/dashboard/admin`), look at the **Recent Tickets** table:
   - ✅ For any **OPEN** ticket, choose an Agent from the dropdown and click **Assign**. The ticket status will update to **ASSIGNED**.
   - ✅ For any **ASSIGNED** ticket, click **Unassign** to release it back to **OPEN**.
2. Sign in as **Agent** (`agent@demo.com`) and navigate to the ticket list:
   - ✅ Find an **OPEN** ticket and click **Assign to Me**.
   - ✅ Inside any **ASSIGNED** ticket, click **Unassign** or **Mark Resolved**.

---

### Test 4: Real-time Live Alerts (WebSockets)
1. Open two browser windows:
   - **Window 1**: Log in as **Agent** (`agent@demo.com`).
   - **Window 2**: Log in as **Customer** (`customer@demo.com`).
2. In Window 2, trigger a human escalation (e.g. type `need human help`).
3. Observe Window 1 (Agent Dashboard) in real-time:
   - ✅ The new ticket should automatically appear in the list **without refreshing**.
   - ✅ The "Open Tickets" counter increments instantly.

---

## 💻 Terminal Command Shortcuts

```bash
# 1. Health check the backend
curl http://localhost:8000/health

# 2. Run all 18 backend tests
source .venv/bin/activate
pytest backend/tests/ -v
```
