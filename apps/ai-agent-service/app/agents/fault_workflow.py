from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
import os

GAMEMASTER_SYSTEM_PROMPT = """You are the Game Master for GitGud, a multiplayer social deduction game where developers debug code together while imposters try to inject plausible bugs.

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
- Wrong HTTP status codes or methods"""

TARGET_CODEBASE_CONTEXT = """
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
      headers: { Authorization: `Bearer ${token}` },
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
  const res = await fetch(`/api/posts?page=${page}&limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createPost(data: { title: string; body: string; tags: string[] }): Promise<Post> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

export async function deletePost(postId: string): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`/api/posts/${postId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
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
"""

class LLMFaultSchema(BaseModel):
    title: str = Field(description="Short task title")
    description: str = Field(description="Description of what needs to be fixed")
    difficulty: str = Field(description="easy, medium, or hard")
    isSabotage: bool = Field(description="True if this is an imposter-injected fault")
    faultType: str = Field(description="e.g. off-by-one, null-propagation, missing-await")
    faultReasoning: str = Field(description="Why this fault is plausible and hard to catch")
    targetConcept: str = Field(description="Learning concept this tests")
    codeSnippet: str = Field(description="The broken code the player sees")
    expectedSolution: str = Field(description="The correct version of the code")
    commitMessage: str = Field(description="A plausible-looking commit message")
    syntacticallyValid: Optional[bool] = Field(default=True, description="Does this code look syntactically valid?")
    wouldFailTest: Optional[bool] = Field(default=True, description="Would a test for correct behavior fail?")
    difficultyScore: Optional[float] = Field(default=5.0, description="Granular difficulty 1-10")

class LLMFaultListSchema(BaseModel):
    faults: List[LLMFaultSchema]

class FaultState(TypedDict):
    player_count: int
    current_round: int
    difficulty_trend: str
    completed_task_count: int
    total_task_count: int
    faults: List[Dict[str, Any]]

def static_fault_fallback() -> List[Dict[str, Any]]:
    return [
        {
            "title": "Fix failing integration test",
            "description": "Repair the test path that is preventing the feature branch from merging.",
            "difficulty": "medium",
            "isSabotage": False,
            "faultType": "missing-import",
            "faultReasoning": "A missing import causes the test runner to throw a ReferenceError.",
            "targetConcept": "testing-imports",
            "codeSnippet": 'import { render, screen } from "@testing-library/react";\n// import App from "./App";  <-- missing\n\ntest("renders app", () => {\n  render(<App />);\n  const linkElement = screen.getByText(/learn react/i);\n  expect(linkElement).toBeInTheDocument();\n});',
            "expectedSolution": 'import { render, screen } from "@testing-library/react";\nimport App from "./App";\n\ntest("renders app", () => {\n  render(<App />);\n  const linkElement = screen.getByText(/learn react/i);\n  expect(linkElement).toBeInTheDocument();\n});',
            "commitMessage": "test: add integration test for App component",
            "verificationResult": {"syntacticallyValid": True, "wouldFailTest": True},
            "difficultyScore": 4,
        },
        {
            "title": "Review API payload mismatch",
            "description": "Compare the client contract to the server response and patch the mismatch.",
            "difficulty": "medium",
            "isSabotage": False,
            "faultType": "wrong-property-name",
            "faultReasoning": "The client reads user_id but the server sends userId — snake_case vs camelCase mismatch.",
            "targetConcept": "api-contracts",
            "codeSnippet": 'interface Payload {\n  userId: string;\n  status: "active" | "inactive";\n}\n\nfunction parsePayload(data: any): Payload {\n  return {\n    userId: data.user_id,  // server sends userId, not user_id\n    status: data.is_active ? "active" : "inactive",\n  };\n}',
            "expectedSolution": 'interface Payload {\n  userId: string;\n  status: "active" | "inactive";\n}\n\nfunction parsePayload(data: any): Payload {\n  return {\n    userId: data.userId,\n    status: data.isActive ? "active" : "inactive",\n  };\n}',
            "commitMessage": "fix: align payload parser with server response schema",
            "verificationResult": {"syntacticallyValid": True, "wouldFailTest": True},
            "difficultyScore": 5,
        },
        {
            "title": "Investigate timeout regression",
            "description": "Find the source of the request timeout before the build pipeline fails again.",
            "difficulty": "hard",
            "isSabotage": False,
            "faultType": "missing-abort-cleanup",
            "faultReasoning": "The AbortController timeout is set but clearTimeout is missing in the finally block, causing a resource leak.",
            "targetConcept": "async-resource-management",
            "codeSnippet": 'async function fetchData() {\n  const controller = new AbortController();\n  const timeoutId = setTimeout(() => controller.abort(), 5000);\n  try {\n    const response = await fetch("/api/data", { signal: controller.signal });\n    return await response.json();\n  } catch (e) {\n    throw e;\n  }\n  // clearTimeout missing!\n}',
            "expectedSolution": 'async function fetchData() {\n  const controller = new AbortController();\n  const timeoutId = setTimeout(() => controller.abort(), 5000);\n  try {\n    const response = await fetch("/api/data", { signal: controller.signal });\n    return await response.json();\n  } finally {\n    clearTimeout(timeoutId);\n  }\n}',
            "commitMessage": "feat: add request timeout with abort controller",
            "verificationResult": {"syntacticallyValid": True, "wouldFailTest": True},
            "difficultyScore": 7,
        },
        {
            "title": "Remove hidden sabotage",
            "description": "Identify and patch the realistic fault slipped into the project by the imposter.",
            "difficulty": "hard",
            "isSabotage": True,
            "faultType": "logic-inversion",
            "faultReasoning": "The payment amount is negated before charging, which would issue refunds instead of charges — extremely subtle in a code review.",
            "targetConcept": "security-code-review",
            "codeSnippet": 'function processPayment(amount: number) {\n  if (amount <= 0) throw new Error("Invalid amount");\n  amount = amount * -1;  // <-- sabotage: negates the amount\n  return externalPaymentService.charge(amount);\n}',
            "expectedSolution": 'function processPayment(amount: number) {\n  if (amount <= 0) throw new Error("Invalid amount");\n  return externalPaymentService.charge(amount);\n}',
            "commitMessage": "refactor: clean up payment processing logic",
            "verificationResult": {"syntacticallyValid": True, "wouldFailTest": True},
            "difficultyScore": 8,
        },
    ]

def generate_faults_node(state: FaultState) -> FaultState:
    player_count = state.get("player_count", 4)
    current_round = state.get("current_round", 1)
    difficulty_trend = state.get("difficulty_trend", "normal")
    completed_task_count = state.get("completed_task_count", 0)
    total_task_count = state.get("total_task_count", 0)

    if os.getenv("GROQ_API_KEY"):
        llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.8)
    elif os.getenv("GOOGLE_API_KEY"):
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.8)
    else:
        state["faults"] = static_fault_fallback()
        return state

    structured_llm = llm.with_structured_output(LLMFaultListSchema)

    task_count = max(2, min(6, player_count + 1))
    sabotage_count = 2 if player_count >= 5 else 1

    prompt = ChatPromptTemplate.from_messages([
        ("system", GAMEMASTER_SYSTEM_PROMPT),
        ("user", f"""Based on the following codebase, generate {task_count} code fault tasks for a match with {player_count} players.

Current match state:
- Round: {current_round}
- Difficulty trend: {difficulty_trend}
- Tasks completed so far: {completed_task_count} / {total_task_count}

Rules:
- Generate exactly {task_count} tasks
- Exactly {sabotage_count} tasks should be sabotage tasks (isSabotage: true) — these are faults injected by imposters that are harder to detect
- Non-sabotage tasks are legitimate bugs that crewmates need to fix
- Difficulty distribution should match the trend: {'mostly easy tasks' if difficulty_trend == 'easy' else 'mostly hard tasks with subtle bugs' if difficulty_trend in ['hard', 'escalating'] else 'mix of easy, medium, and hard'}
- Each task must have a realistic code snippet with a plausible bug and a clear expected solution
- Each task must target a different concept (don't repeat the same bug type)
- Code snippets should be self-contained (5-25 lines) and look like they belong in the target codebase

TARGET CODEBASE:
{TARGET_CODEBASE_CONTEXT}
""")
    ])

    chain = prompt | structured_llm

    try:
        result = chain.invoke({})
        formatted_faults = []
        for f in result.faults:
            formatted_faults.append({
                "title": f.title,
                "description": f.description,
                "difficulty": f.difficulty,
                "isSabotage": f.isSabotage,
                "faultType": f.faultType,
                "faultReasoning": f.faultReasoning,
                "targetConcept": f.targetConcept,
                "codeSnippet": f.codeSnippet,
                "expectedSolution": f.expectedSolution,
                "commitMessage": f.commitMessage,
                "verificationResult": {
                    "syntacticallyValid": f.syntacticallyValid if f.syntacticallyValid is not None else True,
                    "wouldFailTest": f.wouldFailTest if f.wouldFailTest is not None else True,
                },
                "difficultyScore": f.difficultyScore if f.difficultyScore is not None else 5.0,
            })
        state["faults"] = formatted_faults
    except Exception as e:
        print(f"Fault generation failed: {e}")
        state["faults"] = static_fault_fallback()

    return state

workflow = StateGraph(FaultState)
workflow.add_node("generate_faults", generate_faults_node)
workflow.set_entry_point("generate_faults")
workflow.add_edge("generate_faults", END)

fault_app = workflow.compile()
