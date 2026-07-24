from typing import TypedDict, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
import os

GAMEMASTER_SYSTEM_PROMPT = """You are the Game Master for GitGud, a multiplayer social deduction game where developers debug code together while imposters try to inject plausible bugs."""

class DifficultyAdaptationSchema(BaseModel):
    trend: str = Field(description="easy, normal, hard, or escalating")
    reasoning: str = Field(description="Explanation of the difficulty adjustment recommendation")

class DifficultyState(TypedDict):
    completed_task_count: int
    total_task_count: int
    average_completion_time_seconds: float
    current_round: int
    current_trend: str
    adaptation: Dict[str, Any]

def adapt_difficulty_node(state: DifficultyState) -> DifficultyState:
    completed_task_count = state.get("completed_task_count", 0)
    total_task_count = state.get("total_task_count", 0)
    average_completion_time_seconds = state.get("average_completion_time_seconds", 0.0)
    current_round = state.get("current_round", 1)
    current_trend = state.get("current_trend", "normal")

    if os.getenv("GROQ_API_KEY"):
        llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.3)
    elif os.getenv("GOOGLE_API_KEY"):
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.3)
    else:
        state["adaptation"] = {
            "trend": current_trend if current_trend in ["easy", "normal", "hard", "escalating"] else "normal",
            "reasoning": "No AI available — using default difficulty."
        }
        return state

    structured_llm = llm.with_structured_output(DifficultyAdaptationSchema)

    prompt = ChatPromptTemplate.from_messages([
        ("system", GAMEMASTER_SYSTEM_PROMPT),
        ("user", f"""Analyze the current match progress and recommend a difficulty adjustment.

Match state:
- Tasks completed: {completed_task_count} / {total_task_count}
- Average completion time per task: {average_completion_time_seconds}s
- Current round: {current_round}
- Current difficulty trend: {current_trend}

Decision criteria:
- If players are completing tasks too quickly (under 60s average), escalate difficulty
- If players are struggling (over 180s average or few completions), reduce difficulty
- If pace is normal, maintain current trend
- Later rounds should generally be harder
""")
    ])

    chain = prompt | structured_llm

    try:
        result = chain.invoke({})
        trend = result.trend if result.trend in ["easy", "normal", "hard", "escalating"] else "normal"
        state["adaptation"] = {
            "trend": trend,
            "reasoning": result.reasoning
        }
    except Exception as e:
        print(f"Difficulty adaptation failed: {e}")
        state["adaptation"] = {
            "trend": current_trend if current_trend in ["easy", "normal", "hard", "escalating"] else "normal",
            "reasoning": "Error during adaptation."
        }

    return state

workflow = StateGraph(DifficultyState)
workflow.add_node("adapt_difficulty", adapt_difficulty_node)
workflow.set_entry_point("adapt_difficulty")
workflow.add_edge("adapt_difficulty", END)

difficulty_app = workflow.compile()
