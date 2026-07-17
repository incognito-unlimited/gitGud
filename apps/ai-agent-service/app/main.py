from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os

from app.agents.recap_workflow import recap_app

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
async def health_check(request):
    return {"status": "healthy", "service": "ai-agent-service"}

# LangGraph Endpoint for Recap
@app.post("/agent/recap")
@limiter.limit("10/minute")
async def invoke_agent(request, payload: dict):
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
