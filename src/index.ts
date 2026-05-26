declare const process: { env: Record<string, string | undefined> };

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import * as Schema from "@notionhq/workers/schema";
import * as Builder from "@notionhq/workers/builder";

const worker = new Worker();
export default worker;

// ---------------------------------------------------------------------------
// MANAGED DATABASE: Career Command Center
// ---------------------------------------------------------------------------

const careerDb = worker.database("careerCommandCenter", {
  type: "managed",
  initialTitle: "Career Command Center",
  primaryKeyProperty: "Job ID",
  schema: {
    databaseIcon: Builder.emojiIcon("🎯"),
    properties: {
      "Job ID": Schema.title(),
      Company: Schema.richText(),
      Role: Schema.richText(),
      Location: Schema.richText(),
      Salary: Schema.richText(),
      URL: Schema.url(),
      Source: Schema.select([
        { name: "Dice", color: "blue" },
        { name: "Indeed", color: "purple" },
        { name: "LinkedIn", color: "default" },
        { name: "ZipRecruiter", color: "green" },
        { name: "Direct", color: "orange" },
        { name: "Referral", color: "yellow" },
      ]),
      "Source Tier": Schema.select([
        { name: "1: Direct Referral", color: "green" },
        { name: "2: Target Company", color: "blue" },
        { name: "3: Recruiter Outreach", color: "purple" },
        { name: "4: Job Board", color: "default" },
        { name: "5: Cold Apply", color: "gray" },
      ]),
      "Match Score": Schema.number("number"),
      Pillar: Schema.select([
        { name: "AI/ML", color: "blue" },
        { name: "Product", color: "purple" },
        { name: "Engineering", color: "green" },
        { name: "Strategy", color: "orange" },
        { name: "Marketing", color: "pink" },
      ]),
      Status: Schema.status({
        groups: [
          {
            name: "To-do",
            options: [{ name: "New" }, { name: "Review" }],
          },
          {
            name: "In progress",
            options: [
              { name: "Materials Ready" },
              { name: "Approved" },
              { name: "Applied" },
              { name: "Interview" },
            ],
          },
          {
            name: "Complete",
            options: [{ name: "Offer" }, { name: "Rejected" }, { name: "Archived" }],
          },
        ],
      }),
      "ATS Keywords": Schema.multiSelect([]),
      "Date Added": Schema.date(),
      "Date Applied": Schema.date(),
    },
  },
});

// ---------------------------------------------------------------------------
// RATE LIMITER for Claude API
// ---------------------------------------------------------------------------

const claudePacer = worker.pacer("claudeApi", {
  allowedRequests: 20,
  intervalMs: 60_000,
});

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const PILLARS = ["AI/ML", "Product", "Engineering", "Strategy", "Marketing"] as const;
type Pillar = (typeof PILLARS)[number];

const AUTOMATION_MODES = ["copilot", "autopilot", "autonomous"] as const;
type AutomationMode = (typeof AUTOMATION_MODES)[number];

const CADENCES = ["on-demand", "weekly", "daily", "realtime"] as const;
type Cadence = (typeof CADENCES)[number];

// ---------------------------------------------------------------------------
// HELPER: Call Claude API (with rate limiting)
// ---------------------------------------------------------------------------

async function callClaude(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1000
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set — add it via: ntn workers env set ANTHROPIC_API_KEY=sk-ant-..."
    );
  }

  await claudePacer.wait();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API ${response.status}: ${err}`);
  }

  const data = (await response.json()) as any;
  return data.content?.[0]?.text || "";
}

// ---------------------------------------------------------------------------
// HELPER: Extract JSON from Claude response
// ---------------------------------------------------------------------------

function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HELPER: Score job match
// ---------------------------------------------------------------------------

interface MatchResult {
  score: number;
  explanation: string;
  pillar: Pillar;
  topStrengths: string[];
  gaps: string[];
}

async function scoreJobMatch(
  jobTitle: string,
  jobCompany: string,
  jobRequirements: string,
  userProfile: string
): Promise<MatchResult> {
  const text = await callClaude(
    "claude-haiku-4-5-20251001",
    `You are a career match scoring engine. Score how well a candidate matches a job.
Return valid JSON with:
- score: 0-100 integer (80+ = strong match, 60-79 = moderate, below 60 = weak)
- explanation: 2 sentences on why this score
- pillar: one of ${PILLARS.join(", ")}
- topStrengths: array of 2-3 matching strengths
- gaps: array of 1-2 skill gaps

Be honest. Don't inflate scores.`,
    `JOB: ${jobTitle} at ${jobCompany}\nREQUIREMENTS:\n${jobRequirements}\n\nCANDIDATE PROFILE:\n${userProfile}`,
    500
  );

  const parsed = extractJson<any>(text);
  if (!parsed) {
    return {
      score: 50,
      explanation: "Could not parse match score",
      pillar: "Strategy",
      topStrengths: [],
      gaps: [],
    };
  }

  return {
    score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
    explanation: String(parsed.explanation || ""),
    pillar: PILLARS.includes(parsed.pillar) ? parsed.pillar : "Strategy",
    topStrengths: Array.isArray(parsed.topStrengths) ? parsed.topStrengths.map(String) : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
  };
}

// ---------------------------------------------------------------------------
// HELPER: Generate tailored materials
// ---------------------------------------------------------------------------

interface TailoredMaterials {
  resume: string;
  coverLetter: string;
  atsKeywords: string[];
  positioningStrategy: string;
}

async function generateTailoredMaterials(
  jobTitle: string,
  jobCompany: string,
  jobRequirements: string,
  userResume: string,
  matchExplanation: string
): Promise<TailoredMaterials> {
  const text = await callClaude(
    "claude-sonnet-4-5-20250514",
    `You are an expert resume strategist. Given a base resume, target job, and match analysis, produce:

1. A tailored resume in markdown that emphasizes relevant experience, uses the job's language, leads with strongest qualifications, and is ATS-optimized.

2. A cover letter (3 paragraphs): Hook (company insight + why), Evidence (2-3 achievements mapped to requirements), Close (value proposition + CTA).

3. ATS keywords: array of keywords from the listing reflected in materials.

4. Positioning strategy: 1-2 sentences on narrative angle.

Return valid JSON with keys: resume, coverLetter, atsKeywords, positioningStrategy.
Never fabricate experience. Reframe and emphasize what exists.`,
    `TARGET: ${jobTitle} at ${jobCompany}\n\nJOB REQUIREMENTS:\n${jobRequirements}\n\nMATCH ANALYSIS:\n${matchExplanation}\n\nBASE RESUME:\n${userResume}`,
    3000
  );

  const parsed = extractJson<any>(text);
  if (!parsed) throw new Error("Failed to generate tailored materials");

  return {
    resume: String(parsed.resume || ""),
    coverLetter: String(parsed.coverLetter || ""),
    atsKeywords: Array.isArray(parsed.atsKeywords) ? parsed.atsKeywords.map(String) : [],
    positioningStrategy: String(parsed.positioningStrategy || ""),
  };
}

// ---------------------------------------------------------------------------
// HELPER: Automation decision engine
// ---------------------------------------------------------------------------

interface AutomationDecision {
  shouldGenerateMaterials: boolean;
  shouldAutoApply: boolean;
  nextStatus: string;
  notificationMessage: string;
}

function determineAction(
  score: number,
  mode: AutomationMode,
  threshold: number
): AutomationDecision {
  if (mode === "copilot") {
    return {
      shouldGenerateMaterials: false,
      shouldAutoApply: false,
      nextStatus: "New",
      notificationMessage: `New match scored ${score}/100. Review in your Career Command Center.`,
    };
  }

  if (mode === "autopilot") {
    if (score >= threshold) {
      return {
        shouldGenerateMaterials: true,
        shouldAutoApply: false,
        nextStatus: "Materials Ready",
        notificationMessage: `High match (${score}/100). Resume + cover letter auto-generated. Approve to apply.`,
      };
    }
    return {
      shouldGenerateMaterials: false,
      shouldAutoApply: false,
      nextStatus: "Review",
      notificationMessage: `Match scored ${score}/100. Below threshold (${threshold}). Manual review needed.`,
    };
  }

  // autonomous
  if (score >= threshold) {
    return {
      shouldGenerateMaterials: true,
      shouldAutoApply: true,
      nextStatus: "Applied",
      notificationMessage: `Auto-applied (${score}/100). Materials generated and submitted.`,
    };
  }
  if (score >= threshold - 10) {
    return {
      shouldGenerateMaterials: true,
      shouldAutoApply: false,
      nextStatus: "Materials Ready",
      notificationMessage: `Near threshold (${score}/100, need ${threshold}). Materials ready — approve manually?`,
    };
  }
  return {
    shouldGenerateMaterials: false,
    shouldAutoApply: false,
    nextStatus: "New",
    notificationMessage: `Low match (${score}/100). Logged but no action taken.`,
  };
}

// ---------------------------------------------------------------------------
// SYNC: Job Board Scanner
// Syncs job listings from external sources into the Career Command Center
// ---------------------------------------------------------------------------

worker.sync("jobBoardSync", {
  database: careerDb,
  schedule: "1d",
  execute: async (state) => {
    const lastSyncDate = (state as any)?.lastSyncDate || "1970-01-01";
    const now = new Date().toISOString().split("T")[0];

    const hasJobBoardKeys = !!(process.env.DICE_API_KEY || process.env.INDEED_API_KEY);
    if (!hasJobBoardKeys) {
      return { changes: [], hasMore: false, state: { lastSyncDate: now } };
    }

    const jobs = await fetchJobsFromBoards(lastSyncDate);
    const userProfile = process.env.USER_PROFILE || "";

    const changes = [];
    for (const job of jobs) {
      const match = await scoreJobMatch(job.title, job.company, job.requirements, userProfile);
      const jobId = `${job.source}-${job.externalId}`;

      changes.push({
        key: jobId,
        type: "upsert" as const,
        properties: {
          "Job ID": Builder.title(jobId),
          Company: Builder.richText(job.company),
          Role: Builder.richText(job.title),
          Location: Builder.richText(job.location),
          Salary: Builder.richText(job.salary || "Not listed"),
          URL: Builder.url(job.url),
          Source: Builder.select(job.source),
          "Source Tier": Builder.select("4: Job Board"),
          "Match Score": Builder.number(match.score),
          Pillar: Builder.select(match.pillar),
          Status: Builder.status("New"),
          "Date Added": Builder.date(now),
        },
      });
    }

    return { changes, hasMore: false, state: { lastSyncDate: now } };
  },
});

// Placeholder: implement real job board API calls
interface ExternalJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  requirements: string;
  source: string;
  externalId: string;
}

async function fetchJobsFromBoards(_since: string): Promise<ExternalJob[]> {
  // TODO: Implement real job board API calls when keys are configured
  // - Dice: POST https://marketplace.dice.com/v2/jobs/search
  // - Indeed: GET https://api.indeed.com/ads/apisearch
  return [];
}

// ---------------------------------------------------------------------------
// WEBHOOK: Inbound Job Alerts
// Receives job alerts from email parsers, Zapier, or direct integrations
// ---------------------------------------------------------------------------

worker.webhook("inboundJobAlert", {
  title: "Inbound Job Alert",
  description:
    "Receives job listing data from external services (Zapier, email parsers, or direct API calls). POST JSON with: title, company, url, requirements.",
  execute: async (events) => {
    for (const event of events) {
      const body = event.body as any;
      if (!body?.title || !body?.company) continue;

      const userProfile = process.env.USER_PROFILE || "";
      const match = await scoreJobMatch(
        body.title,
        body.company,
        body.requirements || "",
        userProfile
      );

      console.log(
        `[JobRelay] Webhook: ${body.title} at ${body.company} — Score: ${match.score}/100`
      );
    }
  },
});

// ---------------------------------------------------------------------------
// AUTOMATION: Status Change Handler
// ---------------------------------------------------------------------------

worker.automation("onStatusChange", {
  title: "Job Status Update Handler",
  description:
    "Fires when a job's status changes. Logs transitions and triggers downstream actions.",
  execute: async (event) => {
    const { pageId, pageData } = event;
    if (!pageData) return;

    const statusProp = pageData.properties?.["Status"];
    const currentStatus = (statusProp as any)?.status?.name;

    if (currentStatus === "Approved") {
      console.log(`[JobRelay] Job ${pageId} approved — materials generation queued.`);
    }
    if (currentStatus === "Interview") {
      console.log(`[JobRelay] Job ${pageId} → Interview. Prep resources available.`);
    }
  },
});

// ---------------------------------------------------------------------------
// TOOL 1: scanJobs
// ---------------------------------------------------------------------------

worker.tool("scanJobs", {
  title: "Scan and score job listings",
  description:
    "Score job listings against the user's career profile. Returns match score, pillar, automation decision, and notification.",
  schema: j.object({
    jobTitle: j.string().describe("Job title"),
    jobCompany: j.string().describe("Company name"),
    jobLocation: j.string().describe("Location or remote status"),
    jobSalary: j.string().describe("Salary range or 'Not listed'"),
    jobRequirements: j.string().describe("Key requirements and responsibilities"),
    jobUrl: j.string().describe("Direct URL to listing"),
    jobSource: j.string().describe("Source: 'Dice', 'Indeed', 'LinkedIn', 'Direct'"),
    userProfile: j.string().describe("User's career profile"),
    automationMode: j.string().describe("'copilot', 'autopilot', or 'autonomous'"),
    scoreThreshold: j.string().describe("Minimum score for auto-action (default: '85')"),
    sourceTier: j.string().describe("'1: Direct Referral' through '5: Cold Apply'"),
  }),
  hints: { readOnlyHint: true },
  execute: async ({
    jobTitle,
    jobCompany,
    jobLocation,
    jobSalary,
    jobRequirements,
    jobUrl,
    jobSource,
    userProfile,
    automationMode,
    scoreThreshold,
    sourceTier,
  }) => {
    const match = await scoreJobMatch(jobTitle, jobCompany, jobRequirements, userProfile);
    const mode = (
      AUTOMATION_MODES.includes(automationMode as AutomationMode)
        ? automationMode
        : "copilot"
    ) as AutomationMode;
    const threshold = Math.min(100, Math.max(50, parseInt(scoreThreshold) || 85));
    const decision = determineAction(match.score, mode, threshold);

    return {
      success: true,
      title: jobTitle,
      company: jobCompany,
      location: jobLocation,
      salary: jobSalary,
      url: jobUrl,
      source: jobSource,
      sourceTier: sourceTier || "4: Job Board",
      matchScore: match.score,
      matchExplanation: match.explanation,
      pillar: match.pillar,
      topStrengths: match.topStrengths,
      gaps: match.gaps,
      shouldGenerateMaterials: decision.shouldGenerateMaterials,
      shouldAutoApply: decision.shouldAutoApply,
      nextStatus: decision.nextStatus,
      notificationMessage: decision.notificationMessage,
      automationMode: mode,
      requirements: jobRequirements,
    };
  },
});

// ---------------------------------------------------------------------------
// TOOL 2: tailorResume
// ---------------------------------------------------------------------------

worker.tool("tailorResume", {
  title: "Generate tailored application materials",
  description:
    "Create ATS-optimized resume and cover letter for a specific role.",
  schema: j.object({
    jobTitle: j.string().describe("Target role title"),
    jobCompany: j.string().describe("Company name"),
    jobRequirements: j.string().describe("Key requirements"),
    userResume: j.string().describe("Base resume (markdown/text)"),
    matchExplanation: j.string().describe("Match explanation from scanJobs"),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ jobTitle, jobCompany, jobRequirements, userResume, matchExplanation }) => {
    const materials = await generateTailoredMaterials(
      jobTitle,
      jobCompany,
      jobRequirements,
      userResume,
      matchExplanation
    );
    return {
      success: "true",
      resumeContent: materials.resume,
      coverLetterContent: materials.coverLetter,
      atsKeywords: materials.atsKeywords,
      positioningStrategy: materials.positioningStrategy,
      generatedFor: `${jobTitle} at ${jobCompany}`,
      status: "Materials Ready",
    };
  },
});

// ---------------------------------------------------------------------------
// TOOL 3: getCareerInsight
// ---------------------------------------------------------------------------

worker.tool("getCareerInsight", {
  title: "Get career intelligence",
  description:
    "Strategic career advice: salary negotiation, interview prep, company research, market trends.",
  schema: j.object({
    question: j.string().describe("Career strategy question"),
    context: j.string().describe("Relevant context"),
    insightType: j
      .string()
      .describe("'salary', 'interview_prep', 'company_research', 'market_trends', 'career_strategy'"),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ question, context, insightType }) => {
    const systemPrompts: Record<string, string> = {
      salary: "You are a salary negotiation coach. Give specific ranges and scripts.",
      interview_prep:
        "You are an interview coach. Give likely questions, STAR answers, and company angles.",
      company_research:
        "You are a company analyst. Assess culture, growth, leadership, and news.",
      market_trends:
        "You are a labor market analyst. Data-driven takes on hiring and compensation.",
      career_strategy: "You are a career strategist. Direct, actionable advice. No fluff.",
    };

    const system = systemPrompts[insightType] || systemPrompts.career_strategy;
    const answer = await callClaude(
      "claude-haiku-4-5-20251001",
      system,
      context ? `Question: ${question}\n\nContext:\n${context}` : question,
      1000
    );

    return { success: "true", insight: answer, insightType: insightType || "career_strategy" };
  },
});

// ---------------------------------------------------------------------------
// TOOL 4: configureAgent
// ---------------------------------------------------------------------------

worker.tool("configureAgent", {
  title: "Configure JobRelay settings",
  description: "Update automation mode, cadence, threshold, boards, and notifications.",
  schema: j.object({
    automationMode: j.string().describe("'copilot', 'autopilot', or 'autonomous'"),
    cadence: j.string().describe("'on-demand', 'weekly', 'daily', or 'realtime'"),
    scoreThreshold: j.string().describe("Minimum match score (50-100)"),
    activeBoards: j.string().describe("Comma-separated boards"),
    notifications: j.string().describe("Comma-separated channels"),
    targetRoles: j.string().describe("Target roles (comma-separated)"),
    targetLocations: j.string().describe("Locations (comma-separated)"),
    salaryMinimum: j.string().describe("Minimum salary"),
  }),
  hints: { readOnlyHint: false },
  execute: async ({
    automationMode,
    cadence,
    scoreThreshold,
    activeBoards,
    notifications,
    targetRoles,
    targetLocations,
    salaryMinimum,
  }) => {
    const mode = AUTOMATION_MODES.includes(automationMode as AutomationMode)
      ? automationMode
      : "copilot";
    const freq = CADENCES.includes(cadence as Cadence) ? cadence : "daily";
    const threshold = Math.min(100, Math.max(50, parseInt(scoreThreshold) || 85));
    const boards = (activeBoards || "dice,indeed").split(",").map((b) => b.trim().toLowerCase()).filter(Boolean);
    const channels = (notifications || "slack,notion").split(",").map((n) => n.trim().toLowerCase()).filter(Boolean);

    const cronMap: Record<string, string> = {
      "on-demand": "manual",
      weekly: "0 8 * * 1,4",
      daily: "0 8 * * *",
      realtime: "0 */2 * * *",
    };

    return {
      success: "true",
      automationMode: mode,
      cadence: freq,
      cronExpression: cronMap[freq] || "manual",
      scoreThreshold: threshold,
      activeBoards: boards,
      notificationChannels: channels,
      targetRoles: (targetRoles || "").split(",").map((r) => r.trim()).filter(Boolean),
      targetLocations: (targetLocations || "").split(",").map((l) => l.trim()).filter(Boolean),
      salaryMinimum: parseInt(salaryMinimum) || 0,
      summary: `JobRelay: ${mode} mode, scanning ${boards.join("+")} ${cronMap[freq]}. Threshold: ${threshold}+.`,
    };
  },
});

// ---------------------------------------------------------------------------
// TOOL 5: getAgentStatus
// ---------------------------------------------------------------------------

worker.tool("getAgentStatus", {
  title: "JobRelay status dashboard",
  description:
    "Pipeline summary. Use when user asks 'status', 'dashboard', or 'how's my search'.",
  schema: j.object({
    timeRange: j.string().describe("'today', 'this_week', 'this_month', or 'all'"),
    includeConfig: j.string().describe("'true' or 'false'"),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ timeRange, includeConfig }) => ({
    success: true,
    timeRange: timeRange || "this_week",
    includeConfig: includeConfig === "true",
    queryInstructions:
      "Query Career Command Center for jobs in range. Count by status. Find top match.",
    responseTemplate:
      "X new | Y materials ready | Z applied | Top: [title] at [company] (score)",
  }),
});
