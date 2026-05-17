<p align="center">
  <img src="docs/architecture.svg" alt="JobRelay Architecture" width="800"/>
</p>

<h1 align="center">JobRelay</h1>

<p align="center">
  <strong>AI-powered job application agent for Notion</strong><br/>
  <sub>Scans job boards, scores roles with Claude, generates tailored resumes, tracks your pipeline — all inside Notion.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Notion-Workers-000?style=flat-square&logo=notion" alt="Notion Workers" />
  <img src="https://img.shields.io/badge/Claude-Haiku_%2B_Sonnet-cc785c?style=flat-square&logo=anthropic&logoColor=white" alt="Claude" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Theme_2-Workflow_Relay-5ce0d2?style=flat-square" alt="Workflow Relay" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

> **🏆 Built for the [Notion Developer Platform Hackathon](https://lu.ma/fyuf7) (May 16–17, 2026) — Theme 2: Workflow Relay**

<!-- 🎥 **[Watch the 60-Second Demo →](#)** -->

---

## Table of Contents

- [The Problem](#the-problem)
- [What JobRelay Does](#what-jobrelay-does)
- [How to Use JobRelay](#how-to-use-jobrelay)
- [Architecture](#architecture)
- [Career Command Center](#career-command-center)
- [Why This Architecture](#why-this-architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Why Notion — The Business Case](#why-notion--the-business-case)
- [Scale & Impact](#scale--impact--why-this-matters-beyond-the-demo)

---

## The Problem

**238 million people** use job boards every month. The vast majority are already Notion users — managing notes, projects, and personal workflows. But when they start looking for work, they leave Notion entirely for fragmented, frustrating tools that don't talk to each other.

| Metric | Data Point | Source |
|--------|-----------|--------|
| Applications to get one interview | **42 on average** | ResuTrack 2026 |
| Generic application → interview rate | **2–3%** | Resume Genius 2026 |
| Tailored application → interview rate | **7–9%** (2.1× higher) | TopCV 2026 |
| Applications per job posting | **250 avg** (400+ for entry-level) | HiringThing 2026 |
| Time spent customizing each application | **< 30 minutes** | Huntr 2026 |

**The market is polarized between two broken approaches:**

| Tool Type | Example | Problem |
|-----------|---------|---------|
| Spam cannons | LazyApply (2.4★ Trustpilot, 56% one-star) | Triggers spam filters, gets accounts banned, 34% accuracy on complex ATS |
| Passive trackers | Teal, Huntr | Organize your pipeline but don't do the work — you still write every resume |
| **Missing middle** | **JobRelay** | Scores, generates, tracks — with human approval before submit |

> **The insight:** Notion's 100M users already have their professional identity in Notion — work samples, project docs, career notes. The missing piece isn't *another* app; it's an agent that puts that context to work. JobRelay turns Notion from a place where users *organize their life* into where they *advance their career* — without ever leaving the workspace.

## What JobRelay Does

JobRelay is a **Notion-native career agent** that automates the entire job application pipeline using Notion Workers and Claude AI:

<p align="center">
  <img src="docs/demo-flow.svg" alt="User Experience Flow" width="900"/>
</p>

**Six-step sequential pipeline** — each step depends on the output of the previous one:

| Step | What Happens | Tool / Model |
|------|-------------|--------------|
| 1. Discover | Scan Dice + Indeed for matching roles | `scanJobs` + MCP connectors |
| 2. Score | Rate each role 0-100 against your profile | Claude Haiku 4.5 (fast) |
| 3. Decide | Route based on automation tier + threshold | `configureAgent` settings |
| 4. Tailor | Generate ATS-optimized resume + cover letter | Claude Sonnet 4.5 (quality) |
| 5. Track | Update Career Command Center database | Notion Database API |
| 6. Notify | Ping Slack for human approval | Slack MCP |

## How to Use JobRelay

JobRelay is designed to feel like chatting with a helpful colleague — no code, no jargon, no setup wizards. Just open Notion AI and start talking.

<p align="center">
  <img src="docs/user-flow.svg" alt="Three-step user flow: Say Hello → Set Preferences → Scan and Track" width="900"/>
</p>

### Step 1: Say Hello

Open Notion AI chat, select **JobRelay**, and ask what it can do. The agent introduces itself in plain English and offers to set up your profile.

### Step 2: Set Your Preferences

The agent asks simple questions — no forms, no settings pages:
- *"What roles are you targeting?"*
- *"What locations work for you?"*
- *"What's your minimum salary?"*
- *"How hands-on do you want to be?"* (Copilot / Autopilot / Autonomous)

### Step 3: Scan and Track

Say **"scan for jobs"** and watch results flow into your Career Command Center. Each role gets a match score (0-100), fit explanation, and — for strong matches — a tailored resume generated automatically.

> **Design principle:** Following [Notion's best practices for Custom Agents](https://www.notion.com/help/best-practices-for-creating-and-optimizing-a-custom-agent) — start simple, build gradually, keep instructions clear, and never overwhelm the user with complexity.

### What Makes the UX Different

Unlike passive trackers (Teal, Huntr) or spam cannons (LazyApply), JobRelay's conversational design follows 2026 NLP best practices:

- **Lead with value, not features** — First message is a status update ("3 new matches since yesterday"), not a feature list
- **One question at a time** — Progressive disclosure during onboarding, never a form dump
- **Constraint-driven** — Users set exclusions and dealbreakers to reduce noise, increasing trust
- **Proactive re-engagement** — "5 new roles posted since Tuesday" brings users back without guilt
- **Close with action** — Every response ends with a clear next step ("Want me to generate a resume for this one?")

---

## Architecture

<p align="center">
  <img src="docs/architecture.svg" alt="Pipeline Architecture" width="800"/>
</p>

### Agent in Action

<p align="center">
  <img src="docs/agent-chat.svg" alt="JobRelay Agent Chat" width="520"/>
</p>

### Dual-Model AI Strategy — Sequential Agent Orchestration

JobRelay uses a **sequential agent pipeline** where Claude models are orchestrated in a relay pattern — the output of one model becomes the input of the next, with routing logic in between. This mirrors how a real recruitment team operates: a junior analyst screens candidates fast, then passes top matches to a senior writer for crafting personalized outreach.

| Model | Role | Why |
|-------|------|-----|
| **Claude Haiku 4.5** | Scoring (Step 2) | Fast, cheap — scores dozens of jobs in seconds. Structured JSON output with match score, fit reason, gap analysis, and ATS keywords. |
| **Claude Sonnet 4.5** | Generation (Step 4) | Quality resume + cover letter writing. Only invoked for roles above the user's score threshold — smart cost control. |

This dual-model relay is the core technical insight: **use the right model for the right task**, with a routing layer that prevents expensive Sonnet calls on low-quality matches. A full 20-job scan costs ~$0.03 in Haiku scoring; only the top 3–5 trigger Sonnet generation.

### Three Automation Tiers

Users control how much the agent does autonomously:

| Tier | Automation | Behavior |
|------|-----------|----------|
| **Copilot** | 50% | Agent scores — you review everything |
| **Autopilot** | 75% | Agent generates materials — you approve before submit |
| **Autonomous** | 100% | Full pipeline for roles above your threshold score |

### Five Worker Tools

| Tool | Purpose |
|------|---------|
| `scanJobs` | Discover and parse job listings from connected boards |
| `tailorResume` | Generate ATS-optimized resume + cover letter for a specific role |
| `getCareerInsight` | Strategic career Q&A — salary data, interview prep, company research |
| `configureAgent` | Set automation tier, scoring thresholds, job sources, cadence |
| `getAgentStatus` | Report current configuration and last-run state |

## Career Command Center

The Notion database that tracks your entire pipeline. Below is a live example showing the agent scoring roles for a senior AI/ML professional targeting Anthropic, Stripe, McKinsey, OpenAI, and Scale AI — with fit scores ranging from 94 (DREAM match) to 42 (auto-skipped):

<p align="center">
  <img src="docs/command-center.svg" alt="Career Command Center" width="900"/>
</p>

| Property | Type | Purpose |
|----------|------|---------|
| Job Title | Title | Role name |
| Company | Text | Employer |
| Fit Score | Number | AI-scored match (0-100) |
| Priority | Select | DREAM / HIGH / MEDIUM / LOW |
| Status | Select | New → Scoring → Tailoring → Ready → Applied → Interview → Offer |
| Fit Reason | Rich Text | Why this role matches (or doesn't) |
| ATS Keywords | Rich Text | Extracted keywords for resume optimization |
| Source | Select | Dice / Indeed / LinkedIn / Manual |
| Automation Tier | Select | Copilot / Autopilot / Autonomous |
| Resume Link | Relation | Linked tailored resume page |
| Cover Letter Link | Relation | Linked cover letter page |
| Applied Date | Date | When application was submitted |

## Source Tier System

A prioritization framework that weights applications by discovery channel:

| Tier | Source | Typical Interview Rate |
|------|--------|----------------------|
| 1 | Direct referral from network | ~50% |
| 2 | Target company (you sought them) | ~25% |
| 3 | Recruiter outreach | ~15% |
| 4 | Job board (LinkedIn, Indeed) | ~5% |
| 5 | Cold apply | ~2% |

## Why This Architecture

Design decisions and tradeoffs that shaped JobRelay — and why this is more than a few AI prompts:

| Decision | Rationale | Implementation Depth |
|----------|-----------|---------------------|
| **Sequential pipeline** (not parallel) | Each step's output feeds the next — you can't tailor a resume without scoring first | 6-step relay with structured data contracts between stages |
| **Dual-model strategy** | Haiku is 10× cheaper for scoring bulk jobs; Sonnet produces higher-quality generation | Cost-aware routing: score threshold gates expensive Sonnet calls |
| **Notion-native** | Zero external infrastructure — no databases, no servers, no Docker | Workers runtime + Notion Database API — the platform *is* the backend |
| **Human-in-the-loop** | The agent never submits without approval. Trust is earned one application at a time | Three automation tiers let users dial trust up gradually |
| **Source tier weighting** | A referral (50% interview rate) shouldn't be scored the same as a cold apply (2%) | 5-tier prioritization framework baked into scoring prompts |
| **Structured output contracts** | Every tool returns typed JSON, not free-text — so the next stage can parse reliably | Haiku returns `{score, fitReason, gaps, atsKeywords}`; Sonnet returns `{resume, coverLetter}` |

> **What makes this hard to recreate:** The challenge isn't calling Claude — it's building a reliable multi-step pipeline where structured outputs chain correctly, scoring thresholds gate expensive operations, and the entire state flows into a Notion database with the right schema. Each tool (~100 lines avg) encodes domain logic, not just a prompt wrapper.

## Quick Start

### Prerequisites

- Node.js 18+
- [Notion CLI](https://ntn.dev) (`ntn`)
- [Anthropic API key](https://console.anthropic.com)
- Notion workspace with Custom Agents enabled

### Install & Deploy

```bash
# Install Notion CLI
curl -fsSL https://ntn.dev | bash

# Clone and setup
git clone https://github.com/nycsav/notion-career-agent.git
cd notion-career-agent
npm install

# Set your Anthropic API key
ntn workers env set ANTHROPIC_API_KEY

# Deploy to Notion
ntn workers deploy
```

Then open Notion AI chat and ask **JobRelay** to scan for jobs.

## Project Structure

```
notion-career-agent/
├── src/
│   └── index.ts          # Worker with 5 tools (~590 lines)
├── docs/
│   ├── architecture.svg  # Pipeline architecture diagram
│   ├── demo-flow.svg     # End-to-end user flow
│   ├── command-center.svg # Career Command Center mockup
│   └── agent-chat.svg    # Agent chat interaction
├── AGENT_PROMPT.md        # Custom Agent orchestration prompt
├── package.json
├── tsconfig.json
└── LICENSE                # MIT
```

## Technical Highlights

- **Sequential agent orchestration** — not parallel; each step's output feeds the next in a relay chain
- **Dual-model Claude strategy** — Haiku for speed scoring, Sonnet for quality generation, with cost-aware routing
- **Notion-native** — zero external infrastructure; the platform is the backend, the database is the UI
- **Human-in-the-loop** — approval step before any application goes out; three autonomy tiers
- **Production-grade scoring** — source tiers, match explanations, gap analysis, ATS keyword extraction
- **Structured output contracts** — typed JSON between every pipeline stage for reliable chaining
- **~590 lines of TypeScript** — lean, readable, no framework bloat

## Scale & Impact — Why This Matters Beyond the Demo

JobRelay addresses a **universal consumer need** inside a platform with **100M existing users**. Unlike vertical SMB tools (voice agents for individual businesses, CRM bots for specific industries), career search is a horizontal problem that touches every professional — regardless of role, industry, or seniority.

| Dimension | Vertical SMB Tool | JobRelay |
|-----------|-------------------|----------|
| Addressable users | Hundreds per business | **5–8M Notion users** actively job searching |
| Engagement pattern | Transactional (one-time setup) | **Daily check-ins** during career transition |
| Content generation | Minimal (scripts, responses) | **60–100 pages** per job search pipeline |
| Platform value | External integration | **Native Notion** — drives retention, engagement, and Workers revenue |
| Growth mechanism | Sales-driven (one customer at a time) | **Template sharing** — organic viral growth through Notion's marketplace |

> Every Notion user will search for a job at some point. When that moment comes, JobRelay makes Notion the place they do it — not LinkedIn, not Teal, not a spreadsheet. That's a retention moat.

## Why Notion — The Business Case

The strategic question isn't "should Notion have a career tool?" It's: **why are millions of Notion power users leaving the workspace for inferior tools during the highest-stakes workflow of their professional lives?**

| Metric | Value |
|--------|-------|
| Notion total users | **100M+** (2026) |
| Primary demographic | 17–35 year olds — peak career transition years |
| Active job seekers in US alone (BLS) | **6.5M** monthly |
| Estimated Notion users actively job searching | **5–8M** (5–8% of base) |
| Career management TAM | **$15B** globally (LinkedIn, Indeed, Teal, Huntr) |

**The loyalty case — keep users in Notion instead of losing them to fragmented tools:**

- **Daily engagement hook** — Job seekers check their pipeline *daily*. A Career Command Center makes Notion the first tab opened every morning, driving DAU during a user's highest-engagement life phase. This is retention when it matters most — people in career transitions are the most likely to churn to a competitor's workspace.
- **Workspace expansion** — Each job application generates 3–5 new Notion pages (resume, cover letter, company research, interview prep, offer comparison). A 20-application pipeline creates 60–100 pages of content — deepening the user's investment in Notion.
- **Workers monetization** — JobRelay demonstrates the Workers compute model: AI-heavy workloads (scoring + generation) that justify per-run credit pricing. A power user running daily scans = steady compute revenue. This is the use case that proves Workers aren't just for developers — they create value for *every* Notion user.
- **Platform stickiness** — Once your career history, tailored materials, and interview notes live in Notion, switching costs are high. This is the "second brain" use case applied to the highest-stakes personal workflow.
- **Template marketplace growth** — Career Command Center becomes a shareable template, driving organic acquisition. Every user who shares their job-tracking setup brings new users into the Notion ecosystem.

> **The bottom line:** JobRelay isn't a standalone product — it's a proof of concept for how Notion Workers and Custom Agents can turn Notion from a productivity tool into an *action platform* where AI agents do real work on behalf of users. Career search is just the first vertical.

---

<p align="center">
  Built by <a href="https://ensolabs.ai">Enso Labs</a> · Powered by <a href="https://anthropic.com">Claude</a> · Deployed on <a href="https://developers.notion.com">Notion Developer Platform</a>
</p>
