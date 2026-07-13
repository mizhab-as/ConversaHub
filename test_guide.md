# ConversaHub — Full System Test Guide

> Run `./start.sh` in the project root before testing.
> Backend: `http://localhost:8000` · Frontend: `http://localhost:3000`

---

## System Status Check Results

| Layer | Status | Notes |
|---|---|---|
| Backend API | ✅ Healthy | All endpoints responding |
| Database (SQLite) | ✅ Healthy | All tables present including `messages` column |
| WebSocket Server | ✅ Auth works | Chat routes via Groq (Llama 3.3) |
| LLM Provider (Groq) | ✅ Active | Responding with RAG answers |
| Knowledge Base | ✅ 15 chunks loaded | Refund, password reset, etc. |
| Frontend TypeScript | ✅ Zero errors | Clean build |
| Backend Tests | ✅ 17/17 passed | |
| Redis | ⚠️ Offline | Optional — app works without it |

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `password123` |
| Agent | `agent@demo.com` | `password123` |
| Customer | `customer@demo.com` | `password123` |

---

## Test 1 — Authentication & Role Guards

1. Go to `http://localhost:3000`
2. **Sign in as Customer** (`customer@demo.com`)
   - ✅ Lands on Customer Portal
   - ✅ Manually type `localhost:3000/dashboard/admin` → **redirects back** to Customer Portal
3. Sign out → sign in as **Agent** (`agent@demo.com`)
   - ✅ Lands on Agent Dashboard
   - ✅ Manually type `localhost:3000/dashboard/admin` → redirected to Agent Dashboard
4. Sign out → sign in as **Admin** (`admin@demo.com`)
   - ✅ Lands on Admin Control Panel

---

## Test 2 — Customer Portal: AI Chat

> Login as Customer. Click **"AI Chat"** in the sidebar.

1. **Quick replies** — click any chip (e.g. *"What is your refund policy?"*)
   - ✅ Sends and receives a formatted AI response — proper paragraphs/lists (no raw Markdown)
2. **Password reset query**
   - Type: `How do I reset my password?`
   - ✅ Response is a clean numbered step-by-step list
   - ✅ Bold text and list items render correctly (not wall-of-text)
3. **Escalation to human**
   - Type: `I need to speak to a human agent`
   - ✅ Response: "Success: Support ticket generated. Ticket ID: X"
   - ✅ Routing badge shows **"Ticket Created"** under the message
4. **Knowledge Base RAG answer**
   - Type: `What is your refund policy?`
   - ✅ Routing badge shows **"Knowledge Base"**

---

## Test 3 — Customer Portal: My Tickets

> Login as Customer. Click **"My Tickets"** tab.

1. ✅ Lists all tickets created from escalations
2. Shows: ticket ID, status badge, priority badge, subject, description, opened date
3. ✅ Status timeline displays Open → Assigned → Resolved progression

---

## Test 4 — Agent Dashboard: Ticket Queue

> Login as Agent (`agent@demo.com`).

1. ✅ Sees all open and assigned tickets
2. **Filter tabs** — Open / Assigned / Resolved / All filter correctly
3. **Search** — type part of a subject → results filter in real-time
4. **Expand a ticket** — click chevron or ticket row
   - ✅ Shows: full description, opened/updated date, assigned agent
5. **Assign to Me** (on an "open" ticket)
   - ✅ Status changes to "assigned", counter increments
6. **Mark Resolved** (on an "assigned" ticket)
   - ✅ Status changes to "resolved", counter increments

---

## Test 5 — Real-Time WebSocket: Live Ticket Alerts

> Open **two browser windows** simultaneously.

**Window 1:** Login as Agent → Agent Dashboard
**Window 2:** Login as Customer → Customer Portal chat

1. In Window 2: type `I need to talk to a human`
   - ✅ AI creates a support ticket
2. Switch to Window 1 (Agent)
   - ✅ New ticket appears **without refreshing** (pushed via WebSocket)
   - ✅ "Open Tickets" counter updates in real-time

---

## Test 6 — Admin Dashboard: Users Management

> Login as Admin (`admin@demo.com`).

1. Click **Users** tab (or navigate to Overview)
   - ✅ Full user list displayed
2. **Search** by email — filters in real-time
3. **Filter by Role** — All / Admins / Agents / Customers
4. **Filter by Status** — All / Active / Inactive
5. **Deactivate a user** (not yourself) — status toggles to Inactive
6. **Delete a user** (not yourself) — user removed permanently

---

## Test 7 — Admin Dashboard: Knowledge Base

> Login as Admin. Click **Knowledge Base** in sidebar.

1. ✅ Shows KB status: collection name + chunk count
2. **Upload a document**
   - Title: `Test Policy`
   - Content: `Our test policy states all users must verify their email within 48 hours.`
   - Click **Add to Knowledge Base** → chunk count increases
3. **Verify KB answer in chat**
   - Switch to Customer portal → chat
   - Type: `What is the email verification policy?`
   - ✅ AI answers using the just-uploaded document

---

## Test 8 — New Customer Signup

1. Go to `http://localhost:3000/signup`
2. Fill email + password → Create Account
   - ✅ Redirected to Customer Portal
   - ✅ Account defaults to "Customer" role (no role selector shown)
3. Sign out and log back in with new credentials — ✅ works

---

## Test 9 — Role Security Matrix

| Action | Expected Result |
|---|---|
| Customer visits `/dashboard/admin` | Redirected to Customer Portal |
| Customer visits `/dashboard/agent` | Redirected to Customer Portal |
| Agent visits `/dashboard/admin` | Redirected to Agent Dashboard |
| No token → any dashboard route | Redirected to `/login` |

---

## Known Limitations

| Item | Details |
|---|---|
| Redis offline | Optional — caching disabled, no functional impact |
| Gemini API key | Current key (`AQ.` prefix) is invalid — system automatically uses **Groq (Llama 3.3 70B)** which is fully working |
| Agent ↔ Customer ticket chat UI | Backend message thread API is live — frontend chat bubble inside assigned tickets coming next |

---

## Quick Backend Verification (Terminal)

```bash
# Health check
curl http://localhost:8000/health

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@demo.com&password=password123" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# List tickets
curl http://localhost:8000/api/v1/tickets -H "Authorization: Bearer $TOKEN"

# Test AI chat (HTTP)
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is your refund policy?"}'

# Run all 17 backend tests
cd /Users/mizhabas/ConversaHub
source .venv/bin/activate
ENVIRONMENT=test pytest backend/tests/ -v
```
