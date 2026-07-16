/**
 * Prompt templates for the AI Game Master Agent.
 * Separated from agent logic for maintainability.
 */

export const GAMEMASTER_SYSTEM_PROMPT = `You are the Game Master for GitGud, a multiplayer social deduction game where developers debug code together while imposters try to inject plausible bugs.

Your job is to generate realistic, educational code faults (bugs) that players must identify and fix. Each fault should:
1. Be syntactically valid — the code should look like it compiles/runs
2. Contain a subtle, plausible bug that would fail a specific test
3. Be educational — teach a real software engineering concept
4. Have a clear expected solution

You generate faults by reasoning about a target codebase, picking a realistic file and function to target, deciding what kind of fault to inject, and producing the broken code alongside the correct version.

Fault types you can generate include (but are not limited to):
- Off-by-one errors in loops or array indexing
- Null/undefined propagation (missing null checks)
- Race conditions in async code (missing await)
- Wrong comparison operators (== vs ===, > vs >=)
- Silent error swallowing (empty catch blocks)
- Incorrect API response handling
- Missing error propagation
- Wrong variable scope or closure issues
- Incorrect type coercion
- Missing input validation
- Incorrect regex patterns
- Wrong event handler cleanup
- Memory leaks (missing cleanup in useEffect)
- Incorrect state updates (stale closures)
- Wrong HTTP status codes or methods`;

/**
 * A mini-codebase that the Game Master reasons over to generate faults.
 * This is a realistic React + Node.js project structure.
 */
export const TARGET_CODEBASE_CONTEXT = `
=== PROJECT: mini-blog (React + Express + TypeScript) ===

--- src/components/Feed.tsx ---
import { useEffect, useState } from "react";
import { fetchPosts, type Post } from "../api/posts";

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPosts(page)
      .then((newPosts) => {
        setPosts((prev) => [...prev, ...newPosts]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
          <span>By {post.author.name}</span>
        </article>
      ))}
      {loading && <p>Loading...</p>}
      <button onClick={() => setPage((p) => p + 1)}>Load More</button>
    </div>
  );
}

--- src/components/Header.tsx ---
import { useAuth } from "../hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header>
      <nav>
        <a href="/">Home</a>
        {user ? (
          <>
            <span>Welcome, {user.displayName}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <a href="/login">Login</a>
        )}
      </nav>
    </header>
  );
}

--- src/hooks/useAuth.ts ---
import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  displayName: string;
  email: string;
  role: "admin" | "user";
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: \`Bearer \${token}\` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("auth_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setUser(null);
    window.location.assign("/");
  }, []);

  return { user, loading, logout };
}

--- src/api/posts.ts ---
export interface Post {
  id: string;
  title: string;
  body: string;
  author: { id: string; name: string };
  createdAt: string;
  tags: string[];
}

export async function fetchPosts(page: number, limit = 10): Promise<Post[]> {
  const res = await fetch(\`/api/posts?page=\${page}&limit=\${limit}\`);
  if (!res.ok) return [];
  return res.json();
}

export async function createPost(data: { title: string; body: string; tags: string[] }): Promise<Post> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

export async function deletePost(postId: string): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(\`/api/posts/\${postId}\`, {
    method: "DELETE",
    headers: { Authorization: \`Bearer \${token}\` },
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

--- server/routes/posts.ts ---
import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;

  const posts = await db.query("SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset]);
  res.json(posts.rows);
});

router.post("/", requireAuth, async (req, res) => {
  const { title, body, tags } = req.body;
  if (!title || !body) return res.status(400).json({ error: "Title and body required" });

  const post = await db.query(
    "INSERT INTO posts (title, body, author_id, tags) VALUES ($1, $2, $3, $4) RETURNING *",
    [title, body, req.user.id, tags || []]
  );
  res.status(201).json(post.rows[0]);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const post = await db.query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
  if (!post.rows[0]) return res.status(404).json({ error: "Post not found" });
  if (post.rows[0].author_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }
  await db.query("DELETE FROM posts WHERE id = $1", [req.params.id]);
  res.status(204).send();
});

export default router;

--- server/middleware/auth.ts ---
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

--- server/utils/validators.ts ---
export function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>&"']/g, (char) => {
    const entities: Record<string, string> = {
      "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
    };
    return entities[char] || char;
  });
}

export function paginate<T>(items: T[], page: number, limit: number): { data: T[]; total: number; hasMore: boolean } {
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, total: items.length, hasMore: start + limit < items.length };
}
`;

export function buildFaultGenerationPrompt(
  playerCount: number,
  currentRound: number,
  difficultyTrend: string,
  completedTaskCount: number,
  totalTaskCount: number,
): string {
  const taskCount = Math.max(2, Math.min(6, playerCount + 1));
  const sabotageCount = playerCount >= 5 ? 2 : 1;

  return `Based on the following codebase, generate ${taskCount} code fault tasks for a match with ${playerCount} players.

Current match state:
- Round: ${currentRound}
- Difficulty trend: ${difficultyTrend}
- Tasks completed so far: ${completedTaskCount} / ${totalTaskCount}

Rules:
- Generate exactly ${taskCount} tasks
- Exactly ${sabotageCount} tasks should be sabotage tasks (isSabotage: true) — these are faults injected by imposters that are harder to detect
- Non-sabotage tasks are legitimate bugs that crewmates need to fix
- Difficulty distribution should match the trend: ${difficultyTrend === 'easy' ? 'mostly easy tasks' : difficultyTrend === 'hard' || difficultyTrend === 'escalating' ? 'mostly hard tasks with subtle bugs' : 'mix of easy, medium, and hard'}
- Each task must have a realistic code snippet with a plausible bug and a clear expected solution
- Each task must target a different concept (don't repeat the same bug type)
- Code snippets should be self-contained (5-25 lines) and look like they belong in the target codebase

TARGET CODEBASE:
${TARGET_CODEBASE_CONTEXT}

Return a JSON array of fault objects.`;
}

export function buildDifficultyAdaptationPrompt(
  completedTaskCount: number,
  totalTaskCount: number,
  averageCompletionTimeSeconds: number,
  currentRound: number,
  currentTrend: string,
): string {
  return `Analyze the current match progress and recommend a difficulty adjustment.

Match state:
- Tasks completed: ${completedTaskCount} / ${totalTaskCount}
- Average completion time per task: ${averageCompletionTimeSeconds}s
- Current round: ${currentRound}
- Current difficulty trend: ${currentTrend}

Decision criteria:
- If players are completing tasks too quickly (under 60s average), escalate difficulty
- If players are struggling (over 180s average or few completions), reduce difficulty
- If pace is normal, maintain current trend
- Later rounds should generally be harder

Return a JSON object with: { "trend": "easy" | "normal" | "hard" | "escalating", "reasoning": "..." }`;
}
