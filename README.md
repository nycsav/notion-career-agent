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

## The Problem

Job seekers submit **16 applications per week** but spend less than 30 minutes customizing each. Tailored resumes are **61% more likely** to land interviews, yet nobody customizes at scale. Existing tools are either spam cannons (LazyApply: 2.1 stars) or passive trackers that don't do the work for you.

## What JobRelay Does

JobRelay is a **Notion-native career agent** that automates the entire job application pipeline using Notion Workers and Claude AI:

```
Job Boards → DISCOVER → SCORE → DECIDE → TAILOR → TRACK → NOTIFY → Human Approves
```

**Six-step sequential pipeline** — each step depends on the output of the previous one:

| Step | What Happens | Tool / Model |
|------|-------------|--------------|
| 1. Discover | Scan Dice + Indeed for matching roles | `scanJobs` + MCP connectors |
| 2. Score | Rate each role 0-100 against your profile | Claude Haiku 4.5 (fast) |
| 3. Decide | Route based on automation tier + threshold | `configureAgent` settings |
| 4. Tailor | Generate ATS-optimized resume + cover letter | Claude Sonnet 4.6 (quality) |
| 5. Track | Update Career Command Center database | Notion Database API |
| 6. Notify | Ping Slack for human approval | Slack MCP |

## Architecture

<p align="center">
  <img src="docs/architecture.svg" alt="Pipeline Architecture" width="800"/>
</p>

### Dual-Model AI Strategy

| Model | Role | Why |
|-------|------|-----|
| **Claude Haiku 4.5** | Scoring (Step 2) | Fast, cheap — scores dozens of jobs in seconds |
| **Claude Sonnet 4.6** | Generation (Step 4) | Quality resume + cover letter writing |

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

The Notion database that tracks your entire pipeline:

<p align="center">
  <em>Career Command Center — database view with AI-scored entries, automation tiers, and ATS keywords</em>
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

## Quick Start

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
│   └── architecture.svg  # Pipeline architecture diagram
├── AGENT_PROMPT.md        # Custom Agent orchestration prompt
├── package.json
├── tsconfig.json
└── LICENSE                # MIT
```

## Technical Highlights

- **Sequential orchestration** — not parallel; each step's output feeds the next
- **Dual-model strategy** — Haiku for speed scoring, Sonnet for quality generation
- **Notion-native** — zero external infrastructure; everything lives in your workspace
- **Human-in-the-loop** — approval step before any application goes out
- **Production-grade scoring** — source tiers, match explanations, gap analysis, ATS keyword extraction
- **Configurable cadence** — on-demand, daily, weekly, or realtime scanning

## Built For

**Notion Developer Platform Hackathon** (May 16-17, 2026)
Theme 2: Workflow Relay

## Built By

[Enso Labs](https://ensolabs.ai) — AI transformation studio, NYC

Built with [Claude](https://anthropic.com) · Deployed on [Notion Developer Platform](https://developers.notion.com)
