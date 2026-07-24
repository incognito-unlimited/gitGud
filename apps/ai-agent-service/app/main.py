from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os

from app.agents.recap_workflow import recap_app
from app.agents.fault_workflow import fault_app
from app.agents.difficulty_workflow import difficulty_app

# Setup Rate Limiting
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AI Agent Service (LangGraph)")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup SlowAPI Middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

@app.get("/health")
@limiter.limit("5/minute")
async def health_check(request: Request):
    return {"status": "healthy", "service": "ai-agent-service"}

# LangGraph Endpoint for Recap
@app.post("/agent/recap")
@limiter.limit("10/minute")
async def invoke_recap_agent(request: Request, payload: dict):
    # Initial state
    state = {
        "match_id": payload.get("match_id", ""),
        "winner_team": payload.get("winner_team", ""),
        "ending_reason": payload.get("ending_reason", ""),
        "player_role": payload.get("player_role", ""),
        "player_username": payload.get("player_username", ""),
        "tasks": payload.get("tasks", []),
        "events": payload.get("events", []),
        "recap": {}
    }
    
    # Run the workflow
    final_state = recap_app.invoke(state)
    
    return {"recap": final_state.get("recap", {})}

# LangGraph Endpoint for Fault Generation
@app.post("/agent/generate-faults")
@limiter.limit("10/minute")
async def generate_faults_agent(request: Request, payload: dict):
    state = {
        "player_count": payload.get("player_count", 4),
        "current_round": payload.get("current_round", 1),
        "difficulty_trend": payload.get("difficulty_trend", "normal"),
        "completed_task_count": payload.get("completed_task_count", 0),
        "total_task_count": payload.get("total_task_count", 0),
        "faults": []
    }

    final_state = fault_app.invoke(state)
    return {"faults": final_state.get("faults", [])}

# LangGraph Endpoint for Difficulty Adaptation
@app.post("/agent/adapt-difficulty")
@limiter.limit("10/minute")
async def adapt_difficulty_agent(request: Request, payload: dict):
    state = {
        "completed_task_count": payload.get("completed_task_count", 0),
        "total_task_count": payload.get("total_task_count", 0),
        "average_completion_time_seconds": payload.get("average_completion_time_seconds", 0.0),
        "current_round": payload.get("current_round", 1),
        "current_trend": payload.get("current_trend", "normal"),
        "adaptation": {}
    }

    final_state = difficulty_app.invoke(state)
    return final_state.get("adaptation", {"trend": "normal", "reasoning": ""})
