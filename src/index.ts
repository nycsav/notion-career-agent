declare const process: { env: Record<string, string | undefined> };

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";

const worker = new Worker();
export default worker;

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const PILLARS = ["AI/ML", "Product", "Engineering", "Strategy", "Marketing"] as const;
type Pillar = (typeof PILLARS)[number];

const SOURCE_TIERS = [
  "1: Direct Referral",
  "2: Target Company",
  "3: Recruiter Outreach",
  "4: Job Board",
  "5: Cold Apply",
] as const;
type SourceTier = (typeof SOURCE_TIERS)[number];

const AUTOMATION_MODES = ["copilot", "autopilot", "autonomous"] as const;
type AutomationMode = (typeof AUTOMATION_MODES)[number];

const CADENCES = ["on-demand", "weekly", "daily", "realtime"] as const;
type Cadence = (typeof CADENCES)[number];

const STATUS_FLOW = [
  "New",
  "Review",
  "Materials Ready",
  "Approved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Archived",
] as const;

// ---------------------------------------------------------------------------
// HELPER: Call Claude API
// ---------------------------------------------------------------------------

async function callClaude(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1000
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

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

Be honest. Don't inflate scores. Consider: skills alignment, seniority match, industry fit, and career trajectory.`,
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
    "claude-sonnet-4-5-20241022",
    `You are an expert resume strategist. Given a base resume, target job, and match analysis, produce:

1. A tailored resume in markdown format that:
   - Emphasizes relevant experience using the job listing's language
   - Reframes (never fabricates) existing experience to match requirements
   - Leads with the strongest matching qualification
   - Uses action verbs and quantified results
   - Is ATS-optimized with natural keyword placement

2. A cover letter (3 paragraphs):
   - Para 1: Hook — specific company insight + why this role
   - Para 2: Evidence — 2-3 relevant achievements mapped to requirements
   - Para 3: Close — forward-looking value proposition + call to action

3. ATS keywords: array of keywords from the job listing reflected in your materials

4. Positioning strategy: 1-2 sentences on the narrative angle (how you're framing this candidate)

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
// HELPER: Determine action based on automation mode
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
      notificationMessage: `New match scored ${score}/100. Below auto-generate threshold (${threshold}). Manual review needed.`,
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
// TOOL 1: scanJobs
// Accepts structured job data from Dice/Indeed MCP or manual input
// Scores, decides automation action, returns everything needed for storage
// ---------------------------------------------------------------------------

worker.tool("scanJobs", {
  title: "Scan and score job listings",
  description:
    "Score job listings against the user's career profile. Accepts structured job data from Dice MCP, Indeed MCP, or manual input. Returns match score, pillar classification, automation decision, and notification message based on user's automation settings.",
  schema: j.object({
    jobTitle: j.string().describe("Job title (e.g., 'Head of AI Strategy')"),
    jobCompany: j.string().describe("Company name"),
    jobLocation: j.string().describe("Location or remote status"),
    jobSalary: j.string().describe("Salary range if available, or 'Not listed'"),
    jobRequirements: j.string().describe("Key requirements, qualifications, and responsibilities"),
    jobUrl: j.string().describe("Direct URL to the job listing"),
    jobSource: j.string().describe("Where this listing came from: 'Dice', 'Indeed', 'ZipRecruiter', 'LinkedIn', 'Direct'"),
    userProfile: j.string().describe("User's career profile: skills, experience, goals, and preferences"),
    automationMode: j.string().describe("User's automation setting: 'copilot', 'autopilot', or 'autonomous'"),
    scoreThreshold: j.string().describe("Minimum score for auto-action (default: '85')"),
    sourceTier: j.string().describe("Source quality tier: '1: Direct Referral' through '5: Cold Apply'"),
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
  }): Promise<Record<string, string | number | boolean | string[]>> => {
    try {
      // Score the match
      const match = await scoreJobMatch(jobTitle, jobCompany, jobRequirements, userProfile);

      // Determine automation action
      const mode = (AUTOMATION_MODES.includes(automationMode as AutomationMode)
        ? automationMode
        : "copilot") as AutomationMode;
      const threshold = Math.min(100, Math.max(50, parseInt(scoreThreshold) || 85));
      const decision = determineAction(match.score, mode, threshold);

      return {
        success: true,
        // Job data
        title: jobTitle,
        company: jobCompany,
        location: jobLocation,
        salary: jobSalary,
        url: jobUrl,
        source: jobSource,
        sourceTier: sourceTier || "4: Job Board",
        // Scoring
        matchScore: match.score,
        matchExplanation: match.explanation,
        pillar: match.pillar,
        topStrengths: match.topStrengths,
        gaps: match.gaps,
        // Automation decision
        shouldGenerateMaterials: decision.shouldGenerateMaterials,
        shouldAutoApply: decision.shouldAutoApply,
        nextStatus: decision.nextStatus,
        notificationMessage: decision.notificationMessage,
        automationMode: mode,
        // Requirements passed through for material generation
        requirements: jobRequirements,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: String(err.message || "Unknown error in scanJobs"),
        title: jobTitle,
        company: jobCompany,
      };
    }
  },
});

// ---------------------------------------------------------------------------
// TOOL 2: tailorResume
// Generates resume + cover letter + ATS keywords as Notion page content
// ---------------------------------------------------------------------------

worker.tool("tailorResume", {
  title: "Generate tailored application materials",
  description:
    "Create an ATS-optimized resume and cover letter for a specific role. Returns content formatted for direct insertion into a Notion page. Uses the match analysis to inform positioning strategy.",
  schema: j.object({
    jobTitle: j.string().describe("Title of the target role"),
    jobCompany: j.string().describe("Company name"),
    jobRequirements: j.string().describe("Key requirements from the listing"),
    userResume: j.string().describe("User's base resume (markdown or plain text from their Profile page)"),
    matchExplanation: j.string().describe("The match explanation from scanJobs (informs positioning)"),
  }),
  hints: { readOnlyHint: true },
  execute: async ({
    jobTitle,
    jobCompany,
    jobRequirements,
    userResume,
    matchExplanation,
  }): Promise<Record<string, string | string[]>> => {
    try {
      const materials = await generateTailoredMaterials(
        jobTitle,
        jobCompany,
        jobRequirements,
        userResume,
        matchExplanation
      );

      return {
        success: "true",
        // Resume as Notion page content (markdown)
        resumeContent: materials.resume,
        // Cover letter as Notion page content
        coverLetterContent: materials.coverLetter,
        // ATS keywords for the database property
        atsKeywords: materials.atsKeywords,
        // Strategy explanation
        positioningStrategy: materials.positioningStrategy,
        // Metadata
        generatedFor: `${jobTitle} at ${jobCompany}`,
        status: "Materials Ready",
        attribution: "Generated by Notion Career Agent — Enso Labs (ensolabs.ai)",
      };
    } catch (err: any) {
      return {
        success: "false",
        errorMessage: String(err.message || "Unknown error in tailorResume"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// TOOL 3: getCareerInsight
// Strategic career intelligence — salary, company research, interview prep
// ---------------------------------------------------------------------------

worker.tool("getCareerInsight", {
  title: "Get career intelligence",
  description:
    "Answer strategic career questions: salary negotiation, interview prep, company research, market positioning, career transitions. Uses the user's profile context to personalize advice.",
  schema: j.object({
    question: j.string().describe("Career strategy question"),
    context: j.string().describe("Relevant context: job listing, company info, interview details, or career history"),
    insightType: j.string().describe("Type: 'salary', 'interview_prep', 'company_research', 'market_trends', 'career_strategy'"),
  }),
  hints: { readOnlyHint: true },
  execute: async ({
    question,
    context,
    insightType,
  }): Promise<Record<string, string>> => {
    try {
      const systemPrompts: Record<string, string> = {
        salary:
          "You are a salary negotiation coach. Use market data framing. Give specific ranges and scripts. Lead with the number, then explain leverage points.",
        interview_prep:
          "You are an interview coach for senior professionals. Give specific, actionable prep: likely questions, STAR-format answer frameworks, and company-specific angles.",
        company_research:
          "You are a company intelligence analyst. Assess: culture, growth trajectory, leadership stability, recent news, and how they treat the role being hired for.",
        market_trends:
          "You are a labor market analyst. Give data-driven takes on hiring trends, skill demand, compensation shifts, and timing strategies.",
        career_strategy:
          "You are a senior career strategist. Give direct, actionable advice. No fluff. Lead with the recommendation, explain why, then give the Monday move.",
      };

      const system = systemPrompts[insightType] || systemPrompts.career_strategy;

      const answer = await callClaude(
        "claude-haiku-4-5-20251001",
        system,
        context ? `Question: ${question}\n\nContext:\n${context}` : question,
        1000
      );

      return {
        success: "true",
        insight: answer,
        insightType: insightType || "career_strategy",
        attribution: "Powered by Notion Career Agent — Enso Labs (ensolabs.ai)",
      };
    } catch (err: any) {
      return {
        success: "false",
        errorMessage: String(err.message || "Unknown error"),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// TOOL 4: configureAgent
// Set automation preferences — tier, cadence, threshold, boards, notifications
// ---------------------------------------------------------------------------

worker.tool("configureAgent", {
  title: "Configure Career Agent settings",
  description:
    "Update the user's Career Agent preferences: automation mode, scan cadence, score threshold, active job boards, and notification channels. Returns the confirmed configuration.",
  schema: j.object({
    automationMode: j.string().describe("'copilot' (50% — user controls everything), 'autopilot' (75% — agent prepares, user approves), or 'autonomous' (100% — agent applies above threshold)"),
    cadence: j.string().describe("Scan frequency: 'on-demand', 'weekly' (Mon/Thu), 'daily' (8 AM), or 'realtime' (every 2 hours)"),
    scoreThreshold: j.string().describe("Minimum match score for automated actions (50-100, default 85)"),
    activeBoards: j.string().describe("Comma-separated job boards to scan: 'dice,indeed,ziprecruiter'"),
    notifications: j.string().describe("Comma-separated notification channels: 'slack,notion,email'"),
    targetRoles: j.string().describe("Comma-separated target role keywords (e.g., 'AI Strategy,Product Lead,Head of Engineering')"),
    targetLocations: j.string().describe("Preferred locations (e.g., 'NYC,Remote,SF')"),
    salaryMinimum: j.string().describe("Minimum salary threshold (e.g., '150000')"),
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
  }): Promise<Record<string, string | number | string[]>> => {
    // Validate inputs
    const mode = AUTOMATION_MODES.includes(automationMode as AutomationMode)
      ? automationMode
      : "copilot";
    const freq = CADENCES.includes(cadence as Cadence) ? cadence : "daily";
    const threshold = Math.min(100, Math.max(50, parseInt(scoreThreshold) || 85));
    const boards = (activeBoards || "dice,indeed")
      .split(",")
      .map((b) => b.trim().toLowerCase())
      .filter(Boolean);
    const channels = (notifications || "slack,notion")
      .split(",")
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean);
    const roles = (targetRoles || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    const locations = (targetLocations || "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    const salary = parseInt(salaryMinimum) || 0;

    // Build cron expression for cadence
    const cronMap: Record<string, string> = {
      "on-demand": "manual",
      weekly: "0 8 * * 1,4",
      daily: "0 8 * * *",
      realtime: "0 */2 * * *",
    };

    // Build summary message
    const modeDescriptions: Record<string, string> = {
      copilot: "Agent finds and scores. You review everything.",
      autopilot: `Agent auto-generates materials for matches ${threshold}+. You approve before applying.`,
      autonomous: `Agent auto-applies to matches ${threshold}+. Daily digest to Slack.`,
    };

    return {
      success: "true",
      automationMode: mode,
      modeDescription: modeDescriptions[mode] || "",
      cadence: freq,
      cronExpression: cronMap[freq] || "manual",
      scoreThreshold: threshold,
      activeBoards: boards,
      notificationChannels: channels,
      targetRoles: roles,
      targetLocations: locations,
      salaryMinimum: salary,
      summary: `Career Agent configured: ${mode} mode, scanning ${boards.join(" + ")} ${freq === "on-demand" ? "on demand" : cronMap[freq]}. Threshold: ${threshold}+. Notifications via ${channels.join(" + ")}.`,
      nextStep:
        freq === "on-demand"
          ? "Say 'scan now' to trigger your first search."
          : `First automated scan scheduled: ${freq === "daily" ? "tomorrow at 8 AM" : freq === "weekly" ? "next Monday at 8 AM" : "within 2 hours"}.`,
    };
  },
});

// ---------------------------------------------------------------------------
// TOOL 5: getAgentStatus
// Dashboard summary — pipeline health, recent activity, configuration
// ---------------------------------------------------------------------------

worker.tool("getAgentStatus", {
  title: "Career Agent status dashboard",
  description:
    "Get a summary of the Career Agent's current state: configuration, recent matches, pipeline counts, and next scheduled scan. Use when the user asks 'what's new', 'status', 'how's my search going', or 'dashboard'.",
  schema: j.object({
    timeRange: j.string().describe("Time range for activity: 'today', 'this_week', 'this_month', or 'all'"),
    includeConfig: j.string().describe("Include full configuration in response: 'true' or 'false'"),
  }),
  hints: { readOnlyHint: true },
  execute: async ({
    timeRange,
    includeConfig,
  }): Promise<Record<string, string | number | boolean>> => {
    // This tool returns a structured response that the Custom Agent
    // uses to query the Career Command Center database and build a summary.
    // The actual database query happens in the Custom Agent orchestration layer,
    // not in the Worker (Workers don't have direct Notion API access).
    return {
      success: true,
      timeRange: timeRange || "this_week",
      includeConfig: includeConfig === "true",
      // Instruct the Custom Agent what to fetch
      queryInstructions: "Query the Career Command Center database for jobs added in the specified time range. Count by status. Find the highest-scoring match. Return pipeline summary.",
      responseTemplate: "Format: X new matches | Y materials ready | Z applied | Top match: [title] at [company] (score)",
      configFields: "If includeConfig=true, also return: automation mode, cadence, threshold, active boards, notification channels",
    };
  },
});
