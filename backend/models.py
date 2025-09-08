# models.py
"""
Pydantic models for request/response validation
Defines the structure of API inputs and outputs
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

class PromptRequest(BaseModel):
    """Request model for prompt enhancement"""
    
    original_prompt: str = Field(
        ..., 
        min_length=3,
        max_length=5000,
        description="The original prompt to be enhanced"
    )
    
    enhancement_type: Optional[str] = Field(
        default="general",
        description="Type of enhancement: general, creative, technical, business, educational"
    )
    
    target_audience: Optional[str] = Field(
        default="general",
        description="Target audience: general, beginner, intermediate, expert, student, business"
    )
    
    include_examples: Optional[bool] = Field(
        default=True,
        description="Whether to include example outputs in the enhanced prompt"
    )
    
    @validator('enhancement_type')
    def validate_enhancement_type(cls, v):
        valid_types = ['general', 'creative', 'technical', 'business', 'educational']
        if v not in valid_types:
            raise ValueError(f'enhancement_type must be one of: {valid_types}')
        return v
    
    @validator('target_audience')
    def validate_target_audience(cls, v):
        valid_audiences = ['general', 'beginner', 'intermediate', 'expert', 'student', 'business']
        if v not in valid_audiences:
            raise ValueError(f'target_audience must be one of: {valid_audiences}')
        return v

class PromptStructure(BaseModel):
    """Structured representation of an enhanced prompt"""
    
    context: str = Field(
        ...,
        description="Background context and setting for the prompt"
    )
    
    objective: str = Field(
        ...,
        description="Clear statement of what needs to be accomplished"
    )
    
    requirements: List[str] = Field(
        default_factory=list,
        description="Specific requirements and constraints"
    )
    
    target_audience: str = Field(
        ...,
        description="Intended audience for the output"
    )
    
    output_format: str = Field(
        ...,
        description="Expected format and structure of the response"
    )
    
    tone_and_style: str = Field(
        ...,
        description="Desired tone, voice, and writing style"
    )
    
    examples: Optional[List[str]] = Field(
        default_factory=list,
        description="Example inputs or outputs to guide the AI"
    )
    
    constraints: Optional[List[str]] = Field(
        default_factory=list,
        description="Things to avoid or limitations to consider"
    )

class EnhancedPromptResponse(BaseModel):
    """Response model for enhanced prompt data"""
    
    original_prompt: str = Field(
        ...,
        description="The original input prompt"
    )
    
    enhanced_prompt: str = Field(
        ...,
        description="The fully enhanced and structured prompt"
    )
    
    prompt_structure: PromptStructure = Field(
        ...,
        description="Breakdown of the prompt components"
    )
    
    improvement_summary: List[str] = Field(
        default_factory=list,
        description="List of improvements made to the original prompt"
    )
    
    estimated_improvement: int = Field(
        ...,
        ge=1,
        le=100,
        description="Estimated improvement percentage (1-100)"
    )
    
    enhancement_type: str = Field(
        ...,
        description="Type of enhancement applied"
    )
    
    word_count_original: int = Field(
        ...,
        description="Word count of original prompt"
    )
    
    word_count_enhanced: int = Field(
        ...,
        description="Word count of enhanced prompt"
    )
    
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when the enhancement was created"
    )
    
    usage_tips: List[str] = Field(
        default_factory=list,
        description="Tips for using the enhanced prompt effectively"
    )

class ErrorResponse(BaseModel):
    """Standard error response model"""
    
    error: str = Field(
        ...,
        description="Error message"
    )
    
    error_code: str = Field(
        ...,
        description="Machine-readable error code"
    )
    
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )
    
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="When the error occurred"
    )

class HealthResponse(BaseModel):
    """Health check response model"""
    
    status: str = Field(
        ...,
        description="Overall health status: healthy, degraded, unhealthy"
    )
    
    claude_api: str = Field(
        ...,
        description="Claude API connection status"
    )
    
    version: str = Field(
        ...,
        description="API version"
    )
    
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Health check timestamp"
    )