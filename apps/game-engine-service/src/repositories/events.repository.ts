import { eq, and } from 'drizzle-orm';

import { db, matchEvents } from '@gitgud/database';

type MatchEventRow = typeof matchEvents.$inferSelect;

export class EventsRepository {
  async logEvent(
    matchId: string,
    userId: string | null,
    eventType: string,
    payload: Record<string, unknown> = {},
  ): Promise<MatchEventRow> {
    const [record] = await db
      .insert(matchEvents)
      .values({
        matchId,
        userId,
        eventType,
        payload,
      })
      .returning();

    return record;
  }

  async getEventsForMatch(matchId: string): Promise<MatchEventRow[]> {
    return db.select().from(matchEvents).where(eq(matchEvents.matchId, matchId));
  }

  async getEventsForPlayer(matchId: string, userId: string): Promise<MatchEventRow[]> {
    return db
      .select()
      .from(matchEvents)
      .where(and(eq(matchEvents.matchId, matchId), eq(matchEvents.userId, userId)));
  }
}
