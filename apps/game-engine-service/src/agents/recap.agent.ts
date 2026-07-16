/**
 * AI Post-Match Recap Agent
 * 
 * Walks through the player's actual commits, votes, and task submissions
 * to generate a personalized learning narrative explaining which concepts
 * the player struggled with and why specific faults were hard to catch.
 * 
 * Uses Groq Cloud with llama-3.3-70b-versatile for inference.
 * Gracefully degrades to a structured template recap when GROQ_API_KEY is not set.
 */

import Groq from 'groq-sdk';
import { gameEngineEnv } from '../config/env';
import { RECAP_SYSTEM_PROMPT, buildRecapPrompt } from './recap.prompts';

const MODEL = 'llama-3.3-70b-versatile';

function getGroqClient(): Groq | null {
  if (!gameEngineEnv.groqApiKey) return null;
  return new Groq({ apiKey: gameEngineEnv.groqApiKey });
}

export interface AIRecap {
  overallNarrative: string;
  performanceScore: number;
  conceptsLearned: string[];
  conceptsToReview: string[];
  hardestFault: {
    title: string;
    explanation: string;
    codeBeforeAndAfter: string;
  };
  playerStrengths: string[];
  playerWeaknesses: string[];
  votingAnalysis: string;
  detailedTaskBreakdown: Array<{
    taskTitle: string;
    playerAction: 'completed' | 'failed' | 'skipped';
    feedback: string;
  }>;
}

const RECAP_SCHEMA = {
  type: 'object' as const,
  properties: {
    overallNarrative: { type: 'string' as const, description: '2-3 paragraph personalized story of the match' },
    performanceScore: { type: 'number' as const, description: 'Score from 0-100' },
    conceptsLearned: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Concepts the player demonstrated understanding of',
    },
    conceptsToReview: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Concepts the player should study further',
    },
    hardestFaultTitle: { type: 'string' as const, description: 'Title of the hardest fault' },
    hardestFaultExplanation: { type: 'string' as const, description: 'Why this was hard for the player' },
    hardestFaultCode: { type: 'string' as const, description: 'Before/after code diff explanation' },
    playerStrengths: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'What the player did well',
    },
    playerWeaknesses: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Areas for improvement',
    },
    votingAnalysis: { type: 'string' as const, description: 'How accurate their social deduction was' },
    taskBreakdown: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          taskTitle: { type: 'string' as const },
          playerAction: { type: 'string' as const, enum: ['completed', 'failed', 'skipped'] },
          feedback: { type: 'string' as const },
        },
        required: ['taskTitle', 'playerAction', 'feedback'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'overallNarrative', 'performanceScore', 'conceptsLearned', 'conceptsToReview',
    'hardestFaultTitle', 'hardestFaultExplanation', 'hardestFaultCode',
    'playerStrengths', 'playerWeaknesses', 'votingAnalysis', 'taskBreakdown',
  ],
  additionalProperties: false,
};

export class RecapAgent {
  private client: Groq | null;

  constructor() {
    this.client = getGroqClient();
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate a personalized post-match recap for a specific player.
   */
  async generateRecap(matchData: {
    matchId: string;
    winnerTeam: string;
    endingReason: string;
    playerRole: string;
    tasks: Array<{
      title: string;
      description: string;
      difficulty: string;
      isSabotage: boolean;
      faultType?: string;
      targetConcept?: string;
      codeSnippet?: string;
      expectedSolution?: string;
      playerAction: 'completed' | 'failed' | 'skipped';
    }>;
    events: Array<{
      eventType: string;
      payload: any;
      createdAt: string;
    }>;
    playerUsername: string;
  }): Promise<AIRecap> {
    if (!this.client) {
      console.log('[RecapAgent] No Groq API key — using template fallback');
      return this.templateFallback(matchData);
    }

    try {
      console.log(`[RecapAgent] Generating recap for @${matchData.playerUsername} in match ${matchData.matchId}`);

      const userPrompt = buildRecapPrompt(matchData);

      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: RECAP_SYSTEM_PROMPT + '\n\nYou must respond with a JSON object matching this schema: ' + JSON.stringify(RECAP_SCHEMA) },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_completion_tokens: 2048,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('[RecapAgent] Empty response from Groq');
        return this.templateFallback(matchData);
      }

      const parsed = JSON.parse(content);
      const recap: AIRecap = {
        overallNarrative: parsed.overallNarrative,
        performanceScore: parsed.performanceScore,
        conceptsLearned: parsed.conceptsLearned || [],
        conceptsToReview: parsed.conceptsToReview || [],
        hardestFault: {
          title: parsed.hardestFaultTitle || 'Unknown',
          explanation: parsed.hardestFaultExplanation || '',
          codeBeforeAndAfter: parsed.hardestFaultCode || '',
        },
        playerStrengths: parsed.playerStrengths || [],
        playerWeaknesses: parsed.playerWeaknesses || [],
        votingAnalysis: parsed.votingAnalysis || '',
        detailedTaskBreakdown: (parsed.taskBreakdown || []).map((t: any) => ({
          taskTitle: t.taskTitle,
          playerAction: t.playerAction,
          feedback: t.feedback,
        })),
      };

      console.log(`[RecapAgent] Recap generated — score: ${recap.performanceScore}`);
      return recap;
    } catch (error) {
      console.error('[RecapAgent] Recap generation failed:', error);
      return this.templateFallback(matchData);
    }
  }

  /**
   * Template-based fallback when Groq API is not available.
   */
  private templateFallback(matchData: {
    winnerTeam: string;
    endingReason: string;
    playerRole: string;
    tasks: Array<{
      title: string;
      difficulty: string;
      isSabotage: boolean;
      targetConcept?: string;
      playerAction: 'completed' | 'failed' | 'skipped';
    }>;
    playerUsername: string;
  }): AIRecap {
    const completed = matchData.tasks.filter(t => t.playerAction === 'completed');
    const failed = matchData.tasks.filter(t => t.playerAction === 'failed');
    const skipped = matchData.tasks.filter(t => t.playerAction === 'skipped');
    const totalTasks = matchData.tasks.length;
    const score = totalTasks > 0 ? Math.round((completed.length / totalTasks) * 100) : 0;

    const hardest = matchData.tasks.find(t => t.difficulty === 'hard') || matchData.tasks[0];

    return {
      overallNarrative: `In this match, @${matchData.playerUsername} played as ${matchData.playerRole}. The ${matchData.winnerTeam} team won — ${matchData.endingReason}.\n\nOut of ${totalTasks} tasks, ${completed.length} were completed successfully, ${failed.length} were attempted but failed, and ${skipped.length} were not attempted. ${score >= 70 ? 'Great work overall!' : score >= 40 ? 'There\'s room for improvement, but solid effort.' : 'This was a tough match — review the concepts below to level up.'}`,
      performanceScore: score,
      conceptsLearned: completed.map(t => t.targetConcept || t.title).filter(Boolean),
      conceptsToReview: [...failed, ...skipped].map(t => t.targetConcept || t.title).filter(Boolean),
      hardestFault: {
        title: hardest?.title ?? 'N/A',
        explanation: `This ${hardest?.difficulty ?? 'unknown'} difficulty task required understanding ${hardest?.targetConcept ?? 'advanced concepts'}.`,
        codeBeforeAndAfter: 'See the task details for the full code diff.',
      },
      playerStrengths: completed.length > 0
        ? [`Completed ${completed.length} tasks`, ...completed.slice(0, 2).map(t => `Strong on: ${t.targetConcept ?? t.title}`)]
        : ['Participated in the match'],
      playerWeaknesses: failed.length > 0
        ? failed.map(t => `Review: ${t.targetConcept ?? t.title}`)
        : skipped.length > 0
          ? ['Try to attempt all assigned tasks']
          : ['Keep pushing — no specific weaknesses identified'],
      votingAnalysis: 'Voting analysis requires match event data.',
      detailedTaskBreakdown: matchData.tasks.map(t => ({
        taskTitle: t.title,
        playerAction: t.playerAction,
        feedback: t.playerAction === 'completed'
          ? `Well done on "${t.title}"!`
          : t.playerAction === 'failed'
            ? `"${t.title}" was tricky. Review ${t.targetConcept ?? 'the concept'} for next time.`
            : `"${t.title}" was not attempted. Try it in practice mode.`,
      })),
    };
  }
}

export const recapAgent = new RecapAgent();
