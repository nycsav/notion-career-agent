<p align="center">
  <strong>notion-career-agent</strong><br/>
  <sub>AI career agent for Notion — scans jobs, tailors resumes, tracks applications</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Notion-Developer_Platform-000?style=flat-square&logo=notion" alt="Notion" />
  <img src="https://img.shields.io/badge/Claude-Powered-cc785c?style=flat-square&logo=anthropic&logoColor=white" alt="Claude" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Theme-Workflow_Relay-5ce0d2?style=flat-square" alt="Theme 2" />
</p>

---

## What is this?

A career intelligence agent that lives inside your Notion workspace. It scans job listings, scores them against your profile, generates tailored resumes and cover letters, and tracks your entire pipeline — all without leaving Notion.

**Built for the Notion Developer Platform Hackathon (May 16-17, 2026)**

## The Problem

- Job seekers submit **16 applications per week** but spend <30 min customizing each
- Tailored resumes are **61% more likely** to get interviews, yet deep customization doesn't happen at scale
- Existing tools are either spam cannons (LazyApply: 2.1★) or manual trackers (Huntr, Notion templates)
- **79% of organizations** can't figure out how to make AI work for them

## The Solution

Three Notion Workers that form an end-to-end career pipeline:

```
Gmail/LinkedIn notification → jobSync (parse + score) → Job Tracker DB → tailorResume (agent tool) → Slack notification → Human approves
```

### Worker 1: `scanJobs`
- Parses job listings from LinkedIn email notifications
- Scores fit (0-100) against user's career profile using Claude
- Classifies into career pillars and source tiers
- Returns structured data for the Job Tracker database

### Worker 2: `tailorResume`
- Custom agent tool — trigger manually or auto for 80+ scores
- Reads job requirements + user's base resume
- Generates ATS-optimized resume + cover letter via Claude
- Returns materials ready to save as linked Notion pages

### Worker 3: `getCareerInsight`
- Strategic career Q&A tool for the Notion agent
- Salary negotiation, interview prep, company research
- Direct, actionable advice — no fluff

## Architecture

| Layer | Technology |
|-------|-----------|
| Runtime | Notion Workers (sandboxed TypeScript) |
| AI | Claude API (Haiku for scoring, Sonnet for resume gen) |
| Data | Notion Database (Job Tracker) |
| Notifications | Slack MCP / Webhook |
| Input | Gmail MCP / LinkedIn notifications |
| Approval | Human-in-the-loop via Slack |

## Job Tracker Database Schema

| Property | Type | Purpose |
|----------|------|---------|
| Role | Title | Job title |
| Company | Text | Employer |
| Match Score | Number | AI-scored fit (0-100) |
| Status | Status | New → Scored → Materials Ready → Review → Applied → Interview → Offer |
| Pillar | Select | AI/ML, Product, Engineering, Strategy, Marketing |
| Source Tier | Select | 1: Direct Referral → 5: Cold Apply |
| Salary Range | Text | Compensation data |
| Materials | Relation | Links to tailored resume + cover letter |
| Match Explanation | Text | Why this role fits (or doesn't) |
| Requirements | Text | Parsed key requirements |

## Source Tier System

A prioritization framework that weights applications by how you found the role:

| Tier | Source | Conversion Rate |
|------|--------|-----------------|
| 1 | Direct referral from network | ~50% interview rate |
| 2 | Target company (you sought them) | ~25% |
| 3 | Recruiter outreach | ~15% |
| 4 | Job board (LinkedIn, Indeed) | ~5% |
| 5 | Cold apply | ~2% |

## Quick Start

```bash
# Install Notion CLI
curl -fsSL https://ntn.dev | bash

# Clone and setup
git clone https://github.com/nycsav/notion-career-agent.git
cd notion-career-agent
npm install

# Set secrets
ntn workers secrets set ANTHROPIC_API_KEY

# Deploy
ntn workers deploy
```

## Demo

> "Every morning, my career agent scans my LinkedIn notifications and scores new roles. One command generates a tailored resume. I get pinged when it's ready. I approve or skip. No spreadsheets. No 30-minute-per-app grind. Just signal."

## Why This Wins

- **Not a chatbot, not RAG** — orchestrated workflow with real business logic
- **Full platform utilization** — Workers + Agent Tools + Webhooks + MCP connectors
- **Human-in-the-loop** — approval step before any application goes out
- **Production-grade scoring** — source tiers, match explanations, career pillar classification
- **Zero config for users** — works inside Notion, no API keys or terminal required

## Built By

[Enso Labs](https://ensolabs.ai) — AI transformation studio, NYC

Built with Claude · Deployed on Notion Developer Platform
