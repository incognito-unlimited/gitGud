from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os

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

# Placeholder for LangGraph Endpoint
@app.post("/agent/invoke")
@limiter.limit("10/minute")
async def invoke_agent(request, payload: dict):
    # This will be replaced by actual LangGraph workflow invocation
    return {"response": "LangGraph response placeholder", "echo": payload}
