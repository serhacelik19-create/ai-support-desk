# AI Support Desk

A high-performance, real-time multi-channel customer support platform with AI Copilot response drafting, GDPR/KVKK PII data masking, RAG-powered knowledge base guidelines, and automated agent routing.

Built with **Next.js 15**, **Express + TypeScript**, **Socket.io**, **Prisma + PostgreSQL**, and **Google Gemini**.

---

## Architecture

```mermaid
graph TD
    Client["Next.js 15 Frontend"] <-->|"Socket.io (WebSocket + Rooms)"| Server["Express + TS Server"]
    Webhooks["Inbound Webhooks (WhatsApp / WebChat)"] --> Server
    Server -->|Prisma ORM| DB[(PostgreSQL Database)]
    Server -->|PII Masking & RAG| Masker["GDPR / KVKK Masker"]
    Masker -->|Gemini API (Cost-Effective Models)| AI["Google Gemini API"]
```

Client-server communication leverages bidirectional WebSocket connections (Socket.io) with room segregation for instant ticket updates, live drafts, and typing indicators. REST endpoints handle secure authentication, webhooks, system configuration, knowledge base management, and calculated analytics.

---

## Key Features

### 🚀 Real-Time Multi-Channel Support
- **Live Ticket Gateway:** Incoming messages from WhatsApp and Web Chat widgets arrive instantly via Webhooks and broadcast to connected agents.
- **Smart Auto-Assignment:** Incoming tickets are automatically routed to active agents using **Round-Robin** or **Least-Busy** algorithms.
- **Room Segregation:** Agents subscribe to focused ticket rooms (`ticket:${id}`) for clean, isolated message streams.
- **Typing Indicators & Live Presence:** Real-time typing indicators and agent assignment indicators across the team.
- **Instant Resolution:** One-click ticket resolve with immediate database update and WebSocket broadcast.

### 🧠 AI Copilot with GDPR & RAG
- **Automated Draft Suggestions:** Google Gemini automatically analyzes customer inquiries and conversation history to craft accurate reply suggestions.
- **GDPR / KVKK Data Masking:** Sensitive data (T.C. Identity, Phone, Email, IBAN, Credit Card numbers) is masked via regex before leaving the server.
- **RAG Knowledge Base:** Custom company policies, FAQs, and support guidelines from the Knowledge Base are dynamically injected into the AI's system context.
- **Dynamic Tone Modifiers:** Agents can switch between **Professional**, **Friendly**, **Empathetic**, and **Persuasive** tones, adjusting AI generation temperature.
- **Human-in-the-Loop:** Agents retain 100% control — reviewing, editing, or approving drafts before sending.

### 🔒 Enterprise Security & Resilience
- **JWT Authentication & RBAC:** Role-based access control (Admin vs. Agent) protecting management endpoints.
- **Brute-Force Rate Limiting:** IP-based rate limiting on authentication (`POST /api/auth/login`) via `express-rate-limit`.
- **WebSocket Abuse Prevention:** In-memory socket rate limiters guarding AI redrafting (max 12/min) and message sending (max 30/min).
- **Graceful Shutdown:** Intercepts `SIGTERM` and `SIGINT` signals to safely close HTTP, WebSocket, and PostgreSQL connections without data loss.

### 📊 Real-Time Analytics
- **Live Performance Metrics:** Total tickets, resolution rate, average agent response time, and channel distribution calculated live from PostgreSQL.
- **7-Day Activity Trends:** Dynamically calculated daily ticket volumes from database records.

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Socket.io with Rooms** | Enables low-latency bidirectional communication with room-based broadcast segregation |
| **PostgreSQL + Prisma ORM** | ACID-compliant enterprise database with type-safe schema definitions and relation cascades |
| **Zod Schema Validation** | Enforces strict runtime validation on all incoming WebSocket payloads and REST requests |
| **Client-Side Data Masking** | Prevents PII exposure to third-party LLMs (KVKK / GDPR compliant) |
| **Rate Limiting Layer** | Protects AI billing costs and prevents DDoS / brute-force authentication attacks |
| **Vanilla CSS Design System** | High-performance CSS custom properties, HSL color tokens, dark mode, and zero external CSS overhead |

---

## Code Guide

| File / Directory | Description |
|------------------|-------------|
| [`server.ts`](backend/src/server.ts) | Express server, Socket.io gateway, authentication, rate limits, REST endpoints, and webhooks |
| [`geminiService.ts`](backend/src/services/geminiService.ts) | Gemini AI client, prompt engineering, RAG context injection, tone temperatures, and fallback logic |
| [`masker.ts`](backend/src/services/masker.ts) | Regex-based GDPR / KVKK PII masking engine (TC, phone, email, IBAN, credit cards) |
| [`settingsService.ts`](backend/src/services/settingsService.ts) | Persistent system settings, routing algorithm selection, and Gemini model configurations |
| [`validation.ts`](backend/src/lib/validation.ts) | Zod schemas for runtime WebSocket payload and request validation |
| [`schema.prisma`](backend/prisma/schema.prisma) | PostgreSQL database schema definitions and relationship models |
| [`seed.ts`](backend/src/seed.ts) | Database seeder for default Admin, Agents, and initial Knowledge Base rules |
| [`server.test.ts`](backend/src/server.test.ts) | Jest integration test suite covering REST APIs, webhooks, and auth workflows |
| [`useSocket.ts`](frontend/src/hooks/useSocket.ts) | Custom React hook managing WebSocket connections, room subscriptions, and real-time state |

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Running locally or via remote URL (e.g. Supabase, Railway, Docker)
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the environment configuration file:
   ```bash
   cp .env.example .env
   ```

3. Configure your `.env` variables:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/ai_support_desk?schema=public"
   PORT=5002
   NODE_ENV=development
   JWT_SECRET=super-secret-token-key-321
   API_AUTH_TOKEN=demo-auth-token-123
   CLIENT_ORIGIN=http://localhost:3000,http://localhost:3001
   WHATSAPP_VERIFY_TOKEN=whatsapp-webhook-secret-token
   ```

4. Install dependencies, generate Prisma client, push database schema, and seed initial data:
   ```bash
   npm install
   npx prisma db push
   npx ts-node src/seed.ts
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *Backend runs on `http://localhost:5002` (Health check: `http://localhost:5002/api/health`).*

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Frontend is accessible at `http://localhost:3001`.*

---

### Default Login Credentials

| Role | Email | Password | Access Scope |
|------|-------|----------|--------------|
| **👑 Admin (Owner)** | `admin@company.com` | `admin123` | Full Access (Tickets, Analytics, Settings, Team, Knowledge Base) |
| **🎧 Agent 1** | `temsilci1@company.com` | `agent123` | Support Console & Messaging |
| **🎧 Agent 2** | `temsilci2@company.com` | `agent123` | Support Console & Messaging |

---

### Running Tests

Run the backend integration test suite:
```bash
cd backend
npm run test
```

---

## API Reference

### REST Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:-------------:|-------------|
| `GET` | `/api/health` | No | Server health status and timestamp |
| `POST` | `/api/auth/login` | No (Rate-Limited) | User login, returns JWT token and user profile |
| `GET` | `/api/analytics` | Yes | Real-time performance metrics and 7-day activity data |
| `GET` | `/api/settings` | Yes | Retrieve system settings and AI configuration |
| `POST` | `/api/settings` | Yes (Admin) | Update system settings, routing algorithm, or Gemini API key |
| `GET` | `/api/users` | Yes (Admin) | List all registered team members |
| `POST` | `/api/users` | Yes (Admin) | Register a new agent or admin user |
| `DELETE` | `/api/users/:id` | Yes (Admin) | Remove a team member |
| `GET` | `/api/knowledge` | Yes | List all RAG Knowledge Base rules |
| `POST` | `/api/knowledge` | Yes (Admin) | Create a new Knowledge Base entry |
| `DELETE` | `/api/knowledge/:id` | Yes (Admin) | Delete a Knowledge Base entry |
| `GET` | `/api/webhooks/whatsapp` | No | Meta Graph API WhatsApp webhook verification challenge |
| `POST` | `/api/webhooks/whatsapp` | No (Rate-Limited) | Ingest incoming WhatsApp messages and trigger AI drafting |
| `POST` | `/api/webhooks/webchat` | No (Rate-Limited) | Ingest incoming Web Chat messages and trigger AI drafting |

---

### Socket.io Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `ticket:list` | Client → Server | - | Request all active conversations |
| `ticket:list:response` | Server → Client | `Conversation[]` | Emits all conversations with messages and assigned agents |
| `ticket:join` | Client → Server | `conversationId` | Subscribes socket to ticket-specific room |
| `ticket:leave` | Client → Server | `conversationId` | Unsubscribes socket from ticket-specific room |
| `ticket:assign` | Client → Server | `{ conversationId, userId }` | Assigns ticket to an agent |
| `ticket:resolve` | Client → Server | `conversationId` | Marks ticket as resolved and updates all clients |
| `ticket:updated` | Server → Client | `Conversation` | Broadcasts conversation updates to all connected agents |
| `message:send` | Client → Server | `{ conversationId, content }` | Agent sends a message (Rate-limited: 30/min) |
| `message:new` | Server → Client | `{ conversationId, message }` | Broadcasts newly received or sent message |
| `ai:redraft` | Client → Server | `{ conversationId, lastMessageId, tone }` | Requests AI regeneration in chosen tone (Rate-limited: 12/min) |
| `message:draft:updated` | Server → Client | `{ conversationId, messageId, draftReply }` | Broadcasts newly generated AI draft |
| `typing:status` | Bidirectional | `{ conversationId, isTyping }` | Synchronizes typing indicator state |

---

## License

MIT License. Open source and ready for enterprise customization.
