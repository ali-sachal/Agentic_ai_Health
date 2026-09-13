import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import backend.config as config
from backend.models.schemas import (
    DynamicQuestionRequest,
    DynamicQuestionResponse,
    TriageAssessmentRequest,
    TriageAssessmentResponse,
)
from backend.agents.orchestrator import process_chat_turn, execute_full_triage

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("healthguard")

app = FastAPI(
    title="HealthGuard API",
    description="Agentic Clinical Risk & Triage Platform backend powered by Google Gemini API & deterministic clinical safety guardrails.",
    version="2.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class KeyUpdateRequest(BaseModel):
    api_key: str


@app.get("/")
def read_root():
    return {
        "service": "HealthGuard — Agentic Clinical Risk & Triage API",
        "version": "2.0.0",
        "status": "online",
        "gemini_configured": bool(config.GEMINI_API_KEY),
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "gemini_configured": bool(config.GEMINI_API_KEY),
        "gemini_model": config.GEMINI_MODEL,
    }


@app.post("/api/config/gemini-key")
def update_gemini_key(payload: KeyUpdateRequest):
    """Allows setting or updating the Gemini API key dynamically during development/testing."""
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")
    config.GEMINI_API_KEY = key
    logger.info("Gemini API key updated successfully at runtime.")
    return {"status": "ok", "message": "Gemini API key updated successfully."}


@app.post("/api/chat/question", response_model=DynamicQuestionResponse)
def get_next_question(payload: DynamicQuestionRequest):
    """
    Evaluates current conversation turn:
    1. Fast-path safety check for emergency red flags.
    2. Dynamic questioning agent generates targeted follow-up or signals ready for assessment.
    """
    try:
        response = process_chat_turn(payload)
        return response
    except Exception as e:
        logger.error(f"Error in dynamic questioning: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Questioning agent error: {str(e)}")


@app.post("/api/triage/assess", response_model=TriageAssessmentResponse)
def assess_triage(payload: TriageAssessmentRequest):
    """
    Multi-agent clinical risk assessment & recommendation pipeline.
    Stratifies urgency into emergency, same-day, soon, or self-care, and creates clinician discussion guides.
    """
    try:
        response = execute_full_triage(payload)
        return response
    except Exception as e:
        logger.error(f"Error in triage assessment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Triage assessment agent error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=config.PORT, reload=True)
