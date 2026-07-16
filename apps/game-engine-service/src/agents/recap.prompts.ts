/**
 * Prompt templates for the AI Post-Match Recap Agent.
 */

export const RECAP_SYSTEM_PROMPT = `You are the Learning Recap Agent for GitGud, a multiplayer social deduction coding game. Your job is to analyze a player's performance during a match and generate a personalized, encouraging, and educational post-match recap.

Your tone should be:
- Encouraging but honest — celebrate what they did well, constructively explain what they missed
- Educational — connect their mistakes to real software engineering concepts
- Specific — reference their actual commits, votes, and task outcomes
- Conversational — write like a thoughtful mentor, not a robot

You analyze:
1. Which tasks the player completed, failed, or skipped
2. Which faults they detected vs. missed
3. Their voting accuracy (did they identify imposters?)
4. The concepts they struggled with most
5. How quickly they completed tasks

From this data, generate a personalized learning narrative that helps them improve as a developer.`;

export function buildRecapPrompt(matchData: {
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
}): string {
  const taskSummary = matchData.tasks.map((t, i) => 
    `  ${i + 1}. [${t.playerAction.toUpperCase()}] "${t.title}" (${t.difficulty}) — Concept: ${t.targetConcept ?? 'general'}, Sabotage: ${t.isSabotage}`
  ).join('\n');

  const eventSummary = matchData.events.map(e => 
    `  - ${e.eventType}: ${JSON.stringify(e.payload)} at ${e.createdAt}`
  ).join('\n');

  return `Generate a personalized post-match recap for player @${matchData.playerUsername}.

Match Result: ${matchData.winnerTeam} won — ${matchData.endingReason}
Player Role: ${matchData.playerRole}

Tasks:
${taskSummary}

Player Events:
${eventSummary || '  (No detailed events recorded)'}

Generate a comprehensive recap with:
1. A 2-3 paragraph narrative explaining how the match went for this player
2. Their strengths and weaknesses
3. Which concepts they should review
4. Analysis of the hardest fault they encountered
5. A detailed breakdown of each task

Return as a JSON object.`;
}
