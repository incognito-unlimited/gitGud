/**
 * AI Game Master Agent
 * 
 * A multi-step agentic service that dynamically generates code faults
 * by delegating to the FastAPI ai-agent-service over HTTP.
 * 
 * Gracefully degrades to static task templates when the AI service is unreachable or errors.
 */

import { gameEngineEnv } from '../config/env';

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

export class GameMasterAgent {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = gameEngineEnv.aiAgentServiceUrl;
  }

  get isAvailable(): boolean {
    return Boolean(this.serviceUrl);
  }

  /**
   * Generate faults by delegating to the FastAPI ai-agent-service via HTTP.
   */
  async generateFaults(
    playerCount: number,
    currentRound: number,
    difficultyTrend: string,
    completedTaskCount: number,
    totalTaskCount: number,
  ): Promise<GeneratedFault[]> {
    try {
      console.log(`[GameMaster] Requesting faults from AI service (${this.serviceUrl}) for ${playerCount} players, round ${currentRound}, trend: ${difficultyTrend}`);

      const response = await fetch(`${this.serviceUrl}/agent/generate-faults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_count: playerCount,
          current_round: currentRound,
          difficulty_trend: difficultyTrend,
          completed_task_count: completedTaskCount,
          total_task_count: totalTaskCount,
        }),
      });

      if (!response.ok) {
        console.error(`[GameMaster] AI service returned HTTP status ${response.status}`);
        return this.staticFallback();
      }

      const data = (await response.json()) as { faults?: GeneratedFault[] };
      if (!data.faults || !Array.isArray(data.faults) || data.faults.length === 0) {
        console.log('[GameMaster] AI service returned empty faults array — using static fallback');
        return this.staticFallback();
      }

      console.log(`[GameMaster] Generated ${data.faults.length} faults via AI service`);
      return data.faults;
    } catch (error) {
      console.error('[GameMaster] Fault generation failed:', error);
      return this.staticFallback();
    }
  }

  /**
   * Adapt difficulty by delegating to the FastAPI ai-agent-service via HTTP.
   */
  async adaptDifficulty(
    completedTaskCount: number,
    totalTaskCount: number,
    averageCompletionTimeSeconds: number,
    currentRound: number,
    currentTrend: string,
  ): Promise<DifficultyAdaptation> {
    try {
      const response = await fetch(`${this.serviceUrl}/agent/adapt-difficulty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_task_count: completedTaskCount,
          total_task_count: totalTaskCount,
          average_completion_time_seconds: averageCompletionTimeSeconds,
          current_round: currentRound,
          current_trend: currentTrend,
        }),
      });

      if (!response.ok) {
        return { trend: currentTrend as DifficultyAdaptation['trend'], reasoning: 'AI service request failed.' };
      }

      const data = (await response.json()) as DifficultyAdaptation;
      console.log(`[GameMaster] Difficulty adaptation: ${data.trend} — ${data.reasoning}`);
      return data;
    } catch (error) {
      console.error('[GameMaster] Difficulty adaptation failed:', error);
      return { trend: currentTrend as DifficultyAdaptation['trend'], reasoning: 'Error during adaptation.' };
    }
  }

  /**
   * Static fallback when AI service is unreachable or errors.
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
