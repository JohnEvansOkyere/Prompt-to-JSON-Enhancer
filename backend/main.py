# main.py
"""
FastAPI backend for Prompt-to-JSON Enhancer
Handles API requests and integrates with Claude AI
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging

from models import PromptRequest, EnhancedPromptResponse
from services import PromptEnhancerService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Prompt-to-JSON Enhancer API",
    description="Transform simple prompts into structured JSON format for better AI interactions",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
prompt_service = PromptEnhancerService()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Prompt-to-JSON Enhancer API is running!"}

@app.post("/enhance-prompt", response_model=EnhancedPromptResponse)
async def enhance_prompt(request: PromptRequest):
    """
    Enhance a simple prompt into structured JSON format
    
    Args:
        request: PromptRequest containing the original prompt and optional preferences
        
    Returns:
        EnhancedPromptResponse with structured prompt data
    """
    try:
        logger.info(f"Enhancing prompt: {request.original_prompt[:50]}...")
        
        # Validate input
        if not request.original_prompt or len(request.original_prompt.strip()) < 3:
            raise HTTPException(
                status_code=400, 
                detail="Prompt must be at least 3 characters long"
            )
        
        # Enhance the prompt using Claude AI
        enhanced_data = await prompt_service.enhance_prompt(
            original_prompt=request.original_prompt,
            enhancement_type=request.enhancement_type,
            target_audience=request.target_audience
        )
        
        logger.info("Prompt enhanced successfully")
        return enhanced_data
        
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    
    except Exception as e:
        logger.error(f"Error enhancing prompt: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error. Please try again."
        )

@app.get("/health")
async def health_check():
    """Detailed health check for monitoring"""
    try:
        # Test Claude API connection
        api_status = await prompt_service.test_connection()
        
        return {
            "status": "healthy" if api_status else "degraded",
            "claude_api": "connected" if api_status else "disconnected",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": "Service temporarily unavailable"
            }
        )

@app.get("/templates")
async def get_templates():
    """Get available prompt enhancement templates"""
    return {
        "enhancement_types": [
            {"id": "general", "name": "General Enhancement", "description": "Balanced enhancement for any prompt type"},
            {"id": "creative", "name": "Creative Writing", "description": "Optimized for creative and artistic prompts"},
            {"id": "technical", "name": "Technical/Coding", "description": "Best for programming and technical prompts"},
            {"id": "business", "name": "Business/Marketing", "description": "Tailored for business and marketing prompts"},
            {"id": "educational", "name": "Educational", "description": "Perfect for learning and teaching prompts"}
        ],
        "target_audiences": [
            {"id": "general", "name": "General Audience"},
            {"id": "beginner", "name": "Beginner"},
            {"id": "intermediate", "name": "Intermediate"},
            {"id": "expert", "name": "Expert/Professional"},
            {"id": "student", "name": "Student"},
            {"id": "business", "name": "Business Professional"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)