# 🔄 Dynamic Workflow Management System — Payload CMS

A fully dynamic, reusable multi-stage approval workflow engine built inside **Payload CMS v3** with TypeScript, MongoDB, and custom React admin components.

---

## 📋 Table of Contents

- [Challenge Execution Overview](#challenge-execution-overview)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Architecture](#architecture)
- [Sample Workflows](#sample-workflows)
- [REST API Reference](#rest-api-reference)
- [Demo Credentials](#demo-credentials)
- [Deployment Guide (Vercel)](#deployment-guide-vercel)

---

## Challenge Execution Overview
1. ✅ **Dynamic Workflow Engine:** Workflows can be created via the Admin UI, assigned to roles/users, with conditional field evaluations (e.g., `amount > 10000`). Nested/bonus branching between outcomes (`onApprove` / `onReject`) is supported.
2. ✅ **Dynamic Injection into Admin UI:** A custom React component (`WorkflowPanel`) is injected into the edit view of watched collections, displaying progress, logs, and inline action buttons.
3. ✅ **Audit Trail Collection:** A strictly immutable `WorkflowLogs` collection records every action (who, what, when, comments).
4. ✅ **Custom Plugin (Core & Bonus):** A custom Payload plugin automatically hooks into target collections without hardcoding their names. It evaluates step conditions, triggers SLA escalations (bonus - running every 15 minutes), and simulates email notifications.
5. ✅ **Provide APIs:** Exposes `/api/workflows/trigger` and `/api/workflows/status/:docId`.

---

## Prerequisites

- **Node.js** `>= 18.20.2` (tested on v24)
- **npm** `>= 9`
- **MongoDB** — either:
  - [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally on `mongodb://127.0.0.1/workflow-cms`
  - **OR** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier (for cloud/Vercel)

---

## Setup Instructions

### 1. Clone and navigate

```bash
git clone <your-repo-url>
cd workflow-cms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# MongoDB connection string
DATABASE_URL=mongodb://127.0.0.1/workflow-cms

# Random secret for Payload auth (any long random string is fine)
PAYLOAD_SECRET=your_super_secret_key_here_change_me_in_prod

# App URL
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### 4. Start the development server

```bash
npm run dev
```

The admin panel is at: **http://localhost:3000/admin**

*(Note: `npm run dev` automatically generates Payload types on start.)*

### 5. Seed demo data (recommended)

In a separate terminal (while the dev server is **not** running):

```bash
npm run seed
```

This creates:
- 4 demo users (admin, editor, manager, reviewer)
- 2 workflow templates (Blog Review Flow, Contract Approval Flow)
- 1 sample blog post
- 1 sample contract ($15,000 — triggers high-value condition)

---

## Architecture

### Folder/File Structure

```text
src/
├── collections/
│   ├── Users.ts              # Users with role-based access (admin/manager/editor/reviewer)
│   ├── Workflows.ts          # Workflow templates with dynamic steps, conditions, SLAs
│   ├── WorkflowInstances.ts  # Live per-document workflow state tracking
│   ├── WorkflowLogs.ts       # Immutable audit trail (update/delete always blocked)
│   ├── Blog.ts               # Sample content collection
│   └── Contracts.ts          # Sample content collection with amount field for conditionals
│
├── engine/
│   ├── workflowEngine.ts     # Core orchestrator: find → evaluate → advance → log → notify
│   ├── stepEvaluator.ts      # Safe condition parser: >, <, ==, !=, >=, <=, AND
│   ├── notifier.ts           # Email simulation via console.log
│   └── escalationJob.ts      # SLA monitoring: auto-escalates overdue steps
│
├── plugins/
│   └── workflowPlugin.ts     # Payload plugin: dynamically hooks into selected collections
│
├── endpoints/
│   ├── triggerWorkflow.ts    # POST /api/workflows/trigger
│   ├── workflowStatus.ts     # GET /api/workflows/status/:docId
│   └── workflowAction.ts     # POST /api/workflows/action (approve/reject/comment)
│
├── components/
│   └── WorkflowPanel/
│       └── WorkflowPanel.tsx # React admin UI: injected component for progress & actions
│
├── payload.config.ts         # Central config: registers collections, plugins, endpoints
└── seed.ts                   # Demo data seeder script
```

### Plugin Logic

The `workflowPlugin` operates dynamically. It does **not** hardcode any collection names (`blogs`, `contracts`, etc.). Instead:
1. It queries the database for all enabled target collections defined in active `Workflows`.
2. It dynamically injects `afterChange` and `afterRead` hooks into those targeted collections.
3. When a document is saved, the hook triggers `workflowEngine.findWorkflowsForCollection()`.
4. Conditions are evaluated using `stepEvaluator`. If conditions metricate (e.g. `amount > 10000`), the step activates. Otherwise, it auto-advances.
5. The UI dynamically populates based on `afterRead` injected data, rendering `WorkflowPanel.tsx` efficiently.

---

## Sample Workflows

Below are the two built-in workflows created automatically by the `npm run seed` script:

### 1. Blog Review Flow
Attached to the `blogs` collection. A simple two-step sequential flow:

| Step | ID | Type | Assigned Role | SLA |
|------|----|------|--------------|-----|
| 1. | `editor-review` | Review | editor | 24h |
| 2. | `manager-approval` | Approval | manager | 12h |

**Flow:** Blog saved → editor is notified → editor approves → manager is notified → manager approves → workflow complete ✅

### 2. Contract Approval Flow
Attached to the `contracts` collection. A three-stage flow with a **conditional step**:

| Step | ID | Type | Role | Condition | SLA |
|------|----|------|------|-----------|-----|
| 1. | `reviewer-check` | Review | reviewer | — | 48h |
| 2. | `high-value-manager` | Sign-off | manager | `amount > 10000` | 24h |
| 3. | `final-admin-approval` | Approval | admin | — | 12h |

**Execution with conditions:**
- **$15,000 Contract:** Reviewer checks → `amount > 10000` passes → Manager signs off → Admin approves → Complete ✅
- **$5,000 Contract:** Reviewer checks → `amount > 10000` fails → Step 2 is **auto-skipped** → Admin approves → Complete ✅

---

## REST API Reference

All endpoints natively require Payload authentication (JWT/Cookie/Token).

### Trigger Workflow
- **POST** `/api/workflows/trigger`
- **Body:** `{ "collectionSlug": "blogs", "documentId": "123..." }`
- Manually trigger or restart a workflow on a document.

### Get Status
- **GET** `/api/workflows/status/:docId?collection=blogs`
- Returns full state: current status, active step, all steps, and historical logs.

### Submit Action
- **POST** `/api/workflows/action`
- **Body:** `{ "instanceId": "...", "action": "approved", "comment": "Valid." }`
- **Actions:** `approved`, `rejected`, `commented`

---

## Demo Credentials

The `npm run seed` command provisions the following test accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@demo.com` | `Admin1234!` |
| **Manager** | `manager@demo.com` | `Manager1234!` |
| **Editor** | `editor@demo.com` | `Editor1234!` |
| **Reviewer** | `reviewer@demo.com` | `Review1234!` |

---

## Deployment Guide (Vercel)

### Option A: Vercel + MongoDB Atlas (Recommended)

1. **Create a MongoDB Atlas cluster** ([free tier](https://www.mongodb.com/cloud/atlas)):
   - Sign up → Create a free M0 cluster.
   - Database Access: Create a user.
   - Network Access: Add IP `0.0.0.0/0` (allow all so Vercel can connect).
   - Get the connection string: `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/workflow-cms`

2. **Push to GitHub** (keep it as a private repository).

3. **Import to Vercel:**
   - Go to Vercel → New Project → Import your repo.
   - Framework preset should auto-detect **Next.js**.

4. **Set Environment Variables in Vercel:**
   ```env
   DATABASE_URL=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net
   PAYLOAD_SECRET=<your_secure_random_string>
   ```

5. **Deploy!** Vercel builds the Next.js/Payload bundle automatically.

6. **Post-deploy:** Visit your Vercel URL `/admin/first-register` to create the initial admin, or run a seed script remotely if configured.

### Option B: Docker (Self-Hosted)

A `Dockerfile` and `docker-compose.yml` are included.

```bash
docker-compose up --build
```
This boots both the MongoDB instance and the Payload application container locally.
