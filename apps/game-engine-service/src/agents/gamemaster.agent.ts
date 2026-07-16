/**
 * AI Game Master Agent
 * 
 * A multi-step agentic service that dynamically generates code faults
 * by reasoning over codebase structure, producing plausible bugs,
 * self-verifying they're syntactically valid, and adapting difficulty.
 * 
 * Uses Groq Cloud with llama-3.3-70b-versatile for inference.
 * Gracefully degrades to static task templates when GROQ_API_KEY is not set.
 */

import Groq from 'groq-sdk';
import { gameEngineEnv } from '../config/env';
import {
  GAMEMASTER_SYSTEM_PROMPT,
  buildFaultGenerationPrompt,
  buildDifficultyAdaptationPrompt,
} from './gamemaster.prompts';

const MODEL = 'llama-3.3-70b-versatile';

function getGroqClient(): Groq | null {
  if (!gameEngineEnv.groqApiKey) return null;
  return new Groq({ apiKey: gameEngineEnv.groqApiKey });
}

export interface GeneratedFault {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isSabotage: boolean;
  faultType: string;
  faultReasoning: string;
  targetConcept: string;
  codeSnippet: string;
  expectedSolution: string;
  commitMessage: string;
  verificationResult: {
    syntacticallyValid: boolean;
    wouldFailTest: boolean;
  };
  difficultyScore: number;
}

export interface DifficultyAdaptation {
  trend: 'easy' | 'normal' | 'hard' | 'escalating';
  reasoning: string;
}

const FAULT_GENERATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    faults: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const, description: 'Short task title' },
          description: { type: 'string' as const, description: 'Description of what needs to be fixed' },
          difficulty: { type: 'string' as const, enum: ['easy', 'medium', 'hard'] },
          isSabotage: { type: 'boolean' as const, description: 'True if this is an imposter-injected fault' },
          faultType: { type: 'string' as const, description: 'e.g. off-by-one, null-propagation, missing-await' },
          faultReasoning: { type: 'string' as const, description: 'Why this fault is plausible and hard to catch' },
          targetConcept: { type: 'string' as const, description: 'Learning concept this tests' },
          codeSnippet: { type: 'string' as const, description: 'The broken code the player sees' },
          expectedSolution: { type: 'string' as const, description: 'The correct version of the code' },
          commitMessage: { type: 'string' as const, description: 'A plausible-looking commit message' },
          syntacticallyValid: { type: 'boolean' as const, description: 'Does this code look syntactically valid?' },
          wouldFailTest: { type: 'boolean' as const, description: 'Would a test for correct behavior fail?' },
          difficultyScore: { type: 'number' as const, description: 'Granular difficulty 1-10' },
        },
        required: [
          'title', 'description', 'difficulty', 'isSabotage', 'faultType',
          'faultReasoning', 'targetConcept', 'codeSnippet', 'expectedSolution',
          'commitMessage', 'syntacticallyValid', 'wouldFailTest', 'difficultyScore',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['faults'],
  additionalProperties: false,
};

export class GameMasterAgent {
  private client: Groq | null;

  constructor() {
    this.client = getGroqClient();
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Step 1-3: Generate faults by reasoning over the codebase.
   * The LLM analyzes the codebase, generates plausible bugs,
   * and self-verifies they're syntactically valid but would fail tests.
   */
  async generateFaults(
    playerCount: number,
    currentRound: number,
    difficultyTrend: string,
    completedTaskCount: number,
    totalTaskCount: number,
  ): Promise<GeneratedFault[]> {
    if (!this.client) {
      console.log('[GameMaster] No Groq API key — using static fallback');
      return this.staticFallback();
    }

    try {
      console.log(`[GameMaster] Generating faults for ${playerCount} players, round ${currentRound}, trend: ${difficultyTrend}`);

      const userPrompt = buildFaultGenerationPrompt(
        playerCount, currentRound, difficultyTrend, completedTaskCount, totalTaskCount,
      );

      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: GAMEMASTER_SYSTEM_PROMPT + '\n\nYou must respond with a JSON object matching this schema: ' + JSON.stringify(FAULT_GENERATION_SCHEMA) },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_completion_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('[GameMaster] Empty response from Groq');
        return this.staticFallback();
      }

      const parsed = JSON.parse(content);
      const faults: GeneratedFault[] = (parsed.faults || []).map((f: any) => ({
        title: f.title,
        description: f.description,
        difficulty: f.difficulty,
        isSabotage: f.isSabotage,
        faultType: f.faultType,
        faultReasoning: f.faultReasoning,
        targetConcept: f.targetConcept,
        codeSnippet: f.codeSnippet,
        expectedSolution: f.expectedSolution,
        commitMessage: f.commitMessage,
        verificationResult: {
          syntacticallyValid: f.syntacticallyValid ?? true,
          wouldFailTest: f.wouldFailTest ?? true,
        },
        difficultyScore: f.difficultyScore ?? 5,
      }));

      console.log(`[GameMaster] Generated ${faults.length} faults`);
      return faults;
    } catch (error) {
      console.error('[GameMaster] Fault generation failed:', error);
      return this.staticFallback();
    }
  }

  /**
   * Step 4: Adapt difficulty based on match progress.
   */
  async adaptDifficulty(
    completedTaskCount: number,
    totalTaskCount: number,
    averageCompletionTimeSeconds: number,
    currentRound: number,
    currentTrend: string,
  ): Promise<DifficultyAdaptation> {
    if (!this.client) {
      return { trend: 'normal', reasoning: 'No AI available — using default difficulty.' };
    }

    try {
      const prompt = buildDifficultyAdaptationPrompt(
        completedTaskCount, totalTaskCount, averageCompletionTimeSeconds,
        currentRound, currentTrend,
      );

      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: GAMEMASTER_SYSTEM_PROMPT },
          { role: 'user', content: prompt + '\n\nYou must respond with a JSON object matching this schema: ' + JSON.stringify({
            type: 'object',
            properties: {
              trend: { type: 'string', enum: ['easy', 'normal', 'hard', 'escalating'] },
              reasoning: { type: 'string' },
            },
            required: ['trend', 'reasoning']
          }) },
        ],
        temperature: 0.3,
        max_completion_tokens: 256,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return { trend: 'normal', reasoning: 'Empty response.' };

      const parsed = JSON.parse(content);
      console.log(`[GameMaster] Difficulty adaptation: ${parsed.trend} — ${parsed.reasoning}`);
      return parsed;
    } catch (error) {
      console.error('[GameMaster] Difficulty adaptation failed:', error);
      return { trend: currentTrend as DifficultyAdaptation['trend'], reasoning: 'Error during adaptation.' };
    }
  }

  /**
   * Static fallback when Groq API key is not available.
   * Returns the same static tasks the old buildTaskTemplates() produced.
   */
  private staticFallback(): GeneratedFault[] {
    return [
      {
        title: 'Fix failing integration test',
        description: 'Repair the test path that is preventing the feature branch from merging.',
        difficulty: 'medium',
        isSabotage: false,
        faultType: 'missing-import',
        faultReasoning: 'A missing import causes the test runner to throw a ReferenceError.',
        targetConcept: 'testing-imports',
        codeSnippet: 'import { render, screen } from "@testing-library/react";\n// import App from "./App";  <-- missing\n\ntest("renders app", () => {\n  render(<App />);\n  const linkElement = screen.getByText(/learn react/i);\n  expect(linkElement).toBeInTheDocument();\n});',
        expectedSolution: 'import { render, screen } from "@testing-library/react";\nimport App from "./App";\n\ntest("renders app", () => {\n  render(<App />);\n  const linkElement = screen.getByText(/learn react/i);\n  expect(linkElement).toBeInTheDocument();\n});',
        commitMessage: 'test: add integration test for App component',
        verificationResult: { syntacticallyValid: true, wouldFailTest: true },
        difficultyScore: 4,
      },
      {
        title: 'Review API payload mismatch',
        description: 'Compare the client contract to the server response and patch the mismatch.',
        difficulty: 'medium',
        isSabotage: false,
        faultType: 'wrong-property-name',
        faultReasoning: 'The client reads user_id but the server sends userId — snake_case vs camelCase mismatch.',
        targetConcept: 'api-contracts',
        codeSnippet: 'interface Payload {\n  userId: string;\n  status: "active" | "inactive";\n}\n\nfunction parsePayload(data: any): Payload {\n  return {\n    userId: data.user_id,  // server sends userId, not user_id\n    status: data.is_active ? "active" : "inactive",\n  };\n}',
        expectedSolution: 'interface Payload {\n  userId: string;\n  status: "active" | "inactive";\n}\n\nfunction parsePayload(data: any): Payload {\n  return {\n    userId: data.userId,\n    status: data.isActive ? "active" : "inactive",\n  };\n}',
        commitMessage: 'fix: align payload parser with server response schema',
        verificationResult: { syntacticallyValid: true, wouldFailTest: true },
        difficultyScore: 5,
      },
      {
        title: 'Investigate timeout regression',
        description: 'Find the source of the request timeout before the build pipeline fails again.',
        difficulty: 'hard',
        isSabotage: false,
        faultType: 'missing-abort-cleanup',
        faultReasoning: 'The AbortController timeout is set but clearTimeout is missing in the finally block, causing a resource leak.',
        targetConcept: 'async-resource-management',
        codeSnippet: 'async function fetchData() {\n  const controller = new AbortController();\n  const timeoutId = setTimeout(() => controller.abort(), 5000);\n  try {\n    const response = await fetch("/api/data", { signal: controller.signal });\n    return await response.json();\n  } catch (e) {\n    throw e;\n  }\n  // clearTimeout missing!\n}',
        expectedSolution: 'async function fetchData() {\n  const controller = new AbortController();\n  const timeoutId = setTimeout(() => controller.abort(), 5000);\n  try {\n    const response = await fetch("/api/data", { signal: controller.signal });\n    return await response.json();\n  } finally {\n    clearTimeout(timeoutId);\n  }\n}',
        commitMessage: 'feat: add request timeout with abort controller',
        verificationResult: { syntacticallyValid: true, wouldFailTest: true },
        difficultyScore: 7,
      },
      {
        title: 'Remove hidden sabotage',
        description: 'Identify and patch the realistic fault slipped into the project by the imposter.',
        difficulty: 'hard',
        isSabotage: true,
        faultType: 'logic-inversion',
        faultReasoning: 'The payment amount is negated before charging, which would issue refunds instead of charges — extremely subtle in a code review.',
        targetConcept: 'security-code-review',
        codeSnippet: 'function processPayment(amount: number) {\n  if (amount <= 0) throw new Error("Invalid amount");\n  amount = amount * -1;  // <-- sabotage: negates the amount\n  return externalPaymentService.charge(amount);\n}',
        expectedSolution: 'function processPayment(amount: number) {\n  if (amount <= 0) throw new Error("Invalid amount");\n  return externalPaymentService.charge(amount);\n}',
        commitMessage: 'refactor: clean up payment processing logic',
        verificationResult: { syntacticallyValid: true, wouldFailTest: true },
        difficultyScore: 8,
      },
    ];
  }
}

export const gameMasterAgent = new GameMasterAgent();
