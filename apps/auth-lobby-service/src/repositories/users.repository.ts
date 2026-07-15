import { eq } from 'drizzle-orm';

import { db, users } from '@gitgud/database';
import type { GitHubProfile } from '../contracts';

export class UsersRepository {
  async upsertGitHubUser(profile: GitHubProfile) {
    const [record] = await db
      .insert(users)
      .values({
        githubId: profile.githubId,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        displayName: profile.displayName,
      })
      .onConflictDoUpdate({
        target: users.githubId,
        set: {
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          displayName: profile.displayName,
        },
      })
      .returning();

    return record;
  }

  async findById(userId: string) {
    const [record] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return record ?? null;
  }

  async listRecentMatches(userId: string) {
    // We join matchResults, matches, and lobbyPlayers to find matches this user was in
    // This is a simplified query just to return the recent matches for the dashboard.
    // In Drizzle we can query matchResults, inner join matches on match_id, inner join lobby_players on lobby_id
    // But since lobbyPlayers doesn't strictly persist if deleted? No, lobbyPlayers persists.
    return []; // For now, let's return an empty array until we have full match data structure, or we can write the drizzle query.
  }

  async findByGitHubId(githubId: string) {
    const [record] = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
    return record ?? null;
  }
}
