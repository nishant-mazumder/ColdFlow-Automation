# ColdFlow – Autonomous Multi-Agent Cold Email Engine

<div>
  <h3>Set it and forget it. A fully autonomous cold email engine powered by specialized AI Agents.</h3>
</div>

---

## 🛑 The Problem

Running cold email campaigns at scale is a logistical nightmare. Marketers spend hours manually tracking who to follow up with, accidentally emailing people who already replied, or getting their domains blacklisted by Google for sending too many emails at once. 

Traditional linear scripts fail because they lack dynamic decision-making capabilities. If an email bounces or a lead replies, standard cron-jobs often blindly send the next automated message, resulting in burned leads and permanently damaged sender reputations.

## 💡 The Solution

We built **ColdFlow**, a completely autonomous, "set-it-and-forget-it" cold email sequencing engine powered by a **Multi-Agent System architecture**. 

You simply connect a Google Sheet of leads, define your email templates, and the engine takes over entirely. Instead of a traditional top-to-bottom script, ColdFlow utilizes four distinct, specialized background agents that work in parallel to automate the entire sales pipeline with zero human intervention.

---

## ✨ Features

- **Multi-Agent Architecture:** 4 specialized agents working asynchronously to sanitize, orchestrate, verify, and deliver emails.
- **Dynamic Google Sheets Sync:** Automatically pulls leads, verifies formats, and updates the database.
- **Native Gmail API Integration:** Sends emails directly through real Google accounts, ensuring the highest possible deliverability.
- **Pre-Flight Inbox Scanner:** Automatically scans your inbox for replies and bounces *before* sending follow-ups.
- **Mathematical Queue Engine:** Dynamically balances daily sending quotas between new leads and scheduled follow-ups.
- **A/B Testing:** Round-robins multiple email templates to test high-converting copy.
- **Multi-Sender Distribution:** Rotate through multiple "Burner" Email Accounts to distribute sending loads.
- **Anti-Spam Sleep Delays:** Strict, mathematically randomized sleep-delays between sends to bypass Google velocity filters.

---

## 🏗 Architecture Diagram

```mermaid
graph TD
    subgraph CRM
        GS[Google Sheets API]
    end

    subgraph ColdFlow Agents
        DH((🧠 Data Harvester Agent))
        OA((⚖️ Orchestrator Agent))
        SA((🛡️ Sentinel Agent))
        DE((📨 Delivery Engine Agent))
    end

    subgraph Data Layer
        DB[(PostgreSQL Database)]
    end

    subgraph External APIs
        GMAIL[Google Gmail API]
    end

    GS -- Extracts Leads --> DH
    DH -- Sanitizes & Injects --> DB
    
    DB -- Fetches Quotas & Leads --> OA
    OA -- Generates Daily Queue --> SA
    
    SA -- Reads Inbox for Replies/Bounces --> GMAIL
    GMAIL -- Removes Warm Leads --> SA
    SA -- Approves Safe Leads --> DE
    
    DE -- Delivers Emails with Delays --> GMAIL
    DE -- Updates Metrics --> DB
```

---

## 💻 Tech Stack

### Frontend
- **Framework:** Next.js (React)
- **Styling:** Custom Vanilla CSS with Glassmorphism UI
- **State Management:** React Hooks & Server-Side Fetching

### Backend
- **Framework:** Node.js with Express.js
- **Language:** TypeScript
- **Google Integration:** `googleapis` SDK (Sheets API & Gmail API)

### Database
- **ORM:** Prisma ORM
- **Database:** PostgreSQL

---

## 🤖 Agent Responsibilities

Our Multi-Agent system works in perfect harmony to execute the pipeline:

### 🧠 1. The Data Harvester Agent
This agent acts as the bridge between your CRM and the engine. It dynamically monitors and syncs your connected Google Sheets in real-time. If it detects a bad email format or an empty row, it automatically sanitizes the data before injecting fresh leads into the database payload.

### ⚖️ 2. The Orchestrator Agent (The Brain)
Every 24 hours, the Orchestrator calculates the perfect mathematical balance for your daily sending quota. It autonomously evaluates the database to decide: *"Who needs a Day-3 follow-up today?"* vs *"How many brand-new leads can we introduce?"* It dynamically builds a hyper-optimized daily queue without exceeding your exact sender limits.

### 🛡️ 3. The Sentinel Agent (Reputation Protector)
Before a single email leaves the server, the Sentinel Agent initiates a "Pre-Flight Check." It securely authenticates with the Google Gmail API and scans your actual inbox. If it detects that a lead has already sent a human reply or the email bounced, the Sentinel instantly intercepts the queue and rips that lead out of the pipeline. **Result:** You never accidentally send a robotic follow-up to a warm lead, keeping your domain reputation flawless.

### 📨 4. The Delivery Engine Agent
Once the queue is approved, the Delivery Engine takes over in a persistent background thread. To completely bypass Google’s spam velocity filters, this agent mimics human behavior. It injects a strict sleep-delay (e.g., 3 minutes) between every single email. Furthermore, it autonomously manages **A/B Testing**—round-robining different copy variants to see what converts best, while continuously rotating through different Burner Email Accounts to distribute the load.

---

## 🔒 Security

ColdFlow was built from the ground up to handle sensitive data responsibly:
- **OAuth 2.0 Authentication:** No passwords are saved. All Gmail access is handled via secure, revokable OAuth tokens.
- **Environment Variables:** All secrets and database URLs are strictly contained in `.env` files and completely isolated from the codebase.
- **Inbox Validation:** System strictly enforces daily quotas to prevent account suspension.
- **Reply Detection:** Automatic thread halting protects sender domains from spam reporting.

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/nishant-mazumder/ColdFlow-Automation.git
cd ColdFlow-Automation
```

### 2. Google Cloud API Setup
You must generate OAuth credentials from Google Cloud to allow the engine to send emails.
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to **APIs & Services > Library** and enable:
   - **Gmail API**
   - **Google Sheets API**
4. Navigate to **APIs & Services > Credentials**.
5. Click **Create Credentials > OAuth Client ID** (Choose Web Application).
6. Set the **Authorized redirect URI** to: `http://localhost:5000/api/auth/google/callback`
7. Copy your `Client ID` and `Client Secret`.

### 3. Database Setup (PostgreSQL)
1. Ensure you have a running PostgreSQL instance (Local or Cloud like Supabase/Neon).
2. Copy your PostgreSQL Connection URL.

### 4. Environment Variables
Navigate to the `backend` folder and create a `.env` file based on the example:
```bash
cd backend
cp .env.example .env
```
Open `.env` and fill in your credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/coldflow"
PORT=5000
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
JWT_SECRET="YOUR_SECURE_RANDOM_STRING"
```

### 5. Install Dependencies & Start the Engine

**In Terminal 1 (Backend Engine):**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

**In Terminal 2 (Frontend UI):**
```bash
cd frontend
npm install
npm run dev
```

### 6. Access the Dashboard
Open your browser and navigate to `http://localhost:3000`. Authenticate your Gmail account in the Settings, create a Strategy, sync your Google Sheet, and hit **Approve Today's Queue**!

---

## 📸 Screenshots

### 1. Homepage & Live Timeline
![Homepage](screenshots/Homepage.jpg)

### 2. Active Strategies List
![Active Strategies](screenshots/Active%20Strategies.jpg)

### 3. Queue Calendar
![Calander](screenshots/Calander.png)

### 4. Settings & Configuration
![Settings](screenshots/Settings.jpg)

### 5. Strategy Dashboard
![Strategy Dashboard](screenshots/Strategy%20Dashboard.jpg)

### 6. Email Template Editor
![Email Template](screenshots/Email%20Template.png)

### 7. Next Day's Queue Preview
![Next Day's Queue](screenshots/Next%20Day's%20Queue.png)

### 8. Dynamic Lead Database
![Lead Database](screenshots/Lead%20Database.jpg)
