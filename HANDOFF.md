# Notion Career Agent — Hackathon Handoff

**Event:** Notion Developer Platform Hackathon (May 16-17, 2026, Notion HQ SF)
**Deadline:** Sunday May 17, 12:00 PM PT — submit on Cerebral Valley
**Theme:** Workflow Relay (Theme 2)
**Repo:** nycsav/notion-career-agent (push as public before submission)

---

## What's Done

### Infrastructure ✅
- Worker deployed with 5 tools: `scanJobs`, `tailorResume`, `getCareerInsight`, `configureAgent`, `getAgentStatus`
- `ANTHROPIC_API_KEY` set via `ntn workers env set`
- Package: `@notionhq/workers` with TypeScript
- Deploy command: `ntn workers deploy` (from project root)
- Dev command: `ntn workers dev`

### Architecture ✅
- **Notion-native** — no Google Drive dependency. Resumes + cover letters stored as Notion pages
- **Sequential orchestration** — each step depends on previous output (not parallel)
- **AI Models:** Haiku for scoring (fast/cheap), Sonnet 4.6 for resume generation (quality)
- **Automation tiers:** Copilot (50%), Autopilot (75%), Autonomous (100%)
- **Cadence scheduler:** on-demand, weekly, daily, realtime

### Code Location
- `~/Projects/ensolabs-site/notion-career-agent/src/index.ts` — main worker file (~370 lines)
- Uses `declare const process` pattern for TypeScript compatibility
- Helper functions: `callClaude()`, `extractJson()`, `scoreJobMatch()`, `generateTailoredMaterials()`, `determineAction()`

---

## What's Left (Priority Order)

### 1. Custom Agent Orchestration Prompt
- Write the agent prompt that ties together: Dice MCP (`search_jobs`) + Indeed MCP (`search_jobs`, `get_job_details`) + Worker tools + Slack notifications
- Sequential flow: Discover → Score → Tailor → Track → Notify
- Must handle automation tier logic (user sets 50/75/100%)

### 2. Career Command Center Database (Notion)
- Create database with schema from user's existing tracker:
  - Priority (select: DREAM/HIGH/MEDIUM/LOW)
  - Fit Score (number, 1-10)
  - Urgent (checkbox)
  - Job Title (title)
  - Company (text)
  - Location (text)
  - Salary Range (text)
  - Fit Reason (rich_text)
  - Job URL (url)
  - Source (select: Dice/Indeed/LinkedIn/Manual)
  - Portfolio Links (url)
  - Resume Link (relation to resume pages)
  - Cover Letter Link (relation to CL pages)
  - Status (select: New/Scoring/Tailoring/Ready/Applied/Interview/Rejected/Offer)
  - Applied Date (date)
  - Automation Tier (select: Copilot/Autopilot/Autonomous)

### 3. Demo Data
Populate 5-6 entries from real tracker:
- Anthropic — Partner Solutions Architect (Score: 10, DREAM)
- BGB Group — SVP AI & Innovation (Score: 9, HIGH)
- Cuesta Partners — Principal, AI & Data (Score: 8, HIGH)
- Pfizer — AI Product Lead (Score: 7, MEDIUM)
- Random low-fit job (Score: 3, LOW) — shows filtering works

### 4. MIT LICENSE
Add standard MIT license file to repo root.

### 5. Push to GitHub
```bash
cd ~/Projects/ensolabs-site/notion-career-agent
git init
git remote add origin https://github.com/nycsav/notion-career-agent.git
git add -A
git commit -m "Notion Career Agent — hackathon submission"
git push -u origin main
```

### 6. Demo Video (1 min)
- Show: Agent scanning → scoring → tailoring resume → updating database → Slack notification
- Record with: ScreenPal, Loom, or QuickTime
- Upload to Cerebral Valley submission form

---

## Judging Criteria (optimize for these)
| Category | Weight | Our Edge |
|----------|--------|----------|
| Technical Demo | 35% | Live Worker with 5 tools, real AI pipeline |
| Implementation Difficulty | 25% | Sequential orchestration, dual-model strategy, automation tiers |
| Creativity | 25% | Only Notion-native career agent with proactive automation |
| Impact | 15% | Solves real pain (user has 60+ entries in manual tracker) |

**5/12 judges are Notion employees** — emphasize Notion-native building blocks
**3/12 judges are Anthropic** — emphasize Claude integration quality

---

## Key Technical Notes

### Worker Constraints
- 30-second timeout per execution
- 128MB memory
- TypeScript only
- Return type: `Record<string, string | number | boolean | string[]>` (no undefined)

### MCP Connectors Available
- **Dice:** `search_jobs` (keyword, location, radius, employment type)
- **Indeed:** `search_jobs`, `get_job_details`
- **Notion:** `create-pages`, `update-page`, `search`, `fetch`
- **Slack:** `slack_send_message`
- **No Greenhouse or Ashby MCP exists** — opportunity for custom tool

### Model Strings
- Scoring: `claude-haiku-4-5-20251001`
- Resume/CL generation: `claude-sonnet-4-6`

### Environment
- API key set: `ANTHROPIC_API_KEY` (via `ntn workers env set`)
- Deploy: `ntn workers deploy`
- CLI install: `curl -fsSL https://ntn.dev | bash`

---

## Prompt for New Thread

Copy-paste this to start the next conversation:

---

I'm at the Notion Developer Platform Hackathon (deadline: Sunday May 17, 12 PM PT). Read `/Users/savbanerjee/Projects/ensolabs-site/notion-career-agent/HANDOFF.md` for full context — it has everything: what's built, what's left, architecture decisions, judging criteria, and technical constraints.

The Worker is deployed with 5 tools and the API key is set. I need to:
1. Write the Custom Agent orchestration prompt
2. Create the Career Command Center database in my Notion workspace
3. Populate demo data
4. Add MIT license, push to GitHub as public
5. Record and submit demo video

Let's start with #1 — the orchestration prompt.

---
