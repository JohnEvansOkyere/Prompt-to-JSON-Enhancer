# services.py
"""
Business logic and AI integration services
Handles interaction with Hugging Face API
"""

import os
import json
import asyncio
import httpx
from typing import Dict, Any, Optional
import logging

from models import EnhancedPromptResponse, PromptStructure

logger = logging.getLogger(__name__)

class PromptEnhancerService:
    """Service for enhancing prompts using Hugging Face API"""
    
    def __init__(self):
        self.api_key = os.getenv("HUGGINGFACE_API_KEY")
        self.api_url = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium"
        # Alternative models you can try:
        # "microsoft/DialoGPT-large"
        # "facebook/blenderbot-400M-distill" 
        # "google/flan-t5-large"
        
        if not self.api_key:
            # Hugging Face API works without key but with rate limits
            logger.warning("HUGGINGFACE_API_KEY not found. Using rate-limited public access.")
            self.api_key = None
    
    async def test_connection(self) -> bool:
        """Test connection to Hugging Face API"""
        try:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json={"inputs": "Test connection"}
                )
                return response.status_code in [200, 503]  # 503 means model is loading
        except Exception as e:
            logger.error(f"API connection test failed: {str(e)}")
            return False
    
    async def enhance_prompt(
        self, 
        original_prompt: str, 
        enhancement_type: str = "general",
        target_audience: str = "general"
    ) -> EnhancedPromptResponse:
        """
        Enhance a prompt using Hugging Face API
        
        Args:
            original_prompt: The original prompt to enhance
            enhancement_type: Type of enhancement to apply
            target_audience: Target audience for the enhanced prompt
            
        Returns:
            EnhancedPromptResponse with all enhancement data
        """
        
        try:
            # Create the enhancement prompt
            enhancement_prompt = self._create_enhancement_prompt(original_prompt, enhancement_type, target_audience)
            
            # Call Hugging Face API
            hf_response = await self._call_huggingface_api(enhancement_prompt)
            
            # Parse response and create enhanced data
            enhanced_data = self._create_enhanced_response(original_prompt, hf_response, enhancement_type, target_audience)
            
            # Calculate metrics
            word_count_original = len(original_prompt.split())
            word_count_enhanced = len(enhanced_data["enhanced_prompt"].split())
            
            # Create response object
            response = EnhancedPromptResponse(
                original_prompt=original_prompt,
                enhanced_prompt=enhanced_data["enhanced_prompt"],
                prompt_structure=PromptStructure(**enhanced_data["prompt_structure"]),
                improvement_summary=enhanced_data.get("improvement_summary", []),
                estimated_improvement=enhanced_data.get("estimated_improvement", 75),
                enhancement_type=enhancement_type,
                word_count_original=word_count_original,
                word_count_enhanced=word_count_enhanced,
                usage_tips=enhanced_data.get("usage_tips", [])
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error in enhance_prompt: {str(e)}")
            raise
    
    def _create_enhancement_prompt(self, original_prompt: str, enhancement_type: str, target_audience: str) -> str:
        """Create enhancement prompt for Hugging Face model"""
        
        enhancement_instructions = {
            "creative": "Focus on storytelling, creativity, and artistic elements.",
            "technical": "Focus on technical precision, code requirements, and implementation details.", 
            "business": "Focus on business objectives, ROI, and professional outcomes.",
            "educational": "Focus on learning objectives and pedagogical clarity.",
            "general": "Provide balanced enhancement suitable for any domain."
        }
        
        audience_instructions = {
            "beginner": "Use simple language and provide more context.",
            "expert": "Use technical terminology and assume deep knowledge.",
            "business": "Focus on business value and professional outcomes.",
            "student": "Emphasize learning and educational value.",
            "general": "Maintain accessibility for a general audience."
        }
        
        return f"""Transform this basic prompt into a highly effective, detailed prompt:

Original: "{original_prompt}"

Enhancement type: {enhancement_instructions.get(enhancement_type, enhancement_instructions['general'])}
Target audience: {audience_instructions.get(target_audience, audience_instructions['general'])}

Enhanced prompt:"""

    async def _call_huggingface_api(self, prompt: str) -> str:
        """Make API call to Hugging Face"""
        
        try:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            # Try multiple models if one fails
            models = [
                "microsoft/DialoGPT-medium",
                "facebook/blenderbot-400M-distill",
                "google/flan-t5-base"
            ]
            
            for model in models:
                try:
                    url = f"https://api-inference.huggingface.co/models/{model}"
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.post(
                            url,
                            headers=headers,
                            json={
                                "inputs": prompt,
                                "parameters": {
                                    "max_new_tokens": 500,
                                    "temperature": 0.7,
                                    "do_sample": True
                                }
                            }
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            if isinstance(result, list) and len(result) > 0:
                                return result[0].get("generated_text", prompt)
                            return str(result)
                        elif response.status_code == 503:
                            # Model is loading, wait and try next
                            continue
                            
                except Exception as e:
                    logger.warning(f"Model {model} failed: {str(e)}")
                    continue
            
            # If all models fail, create a fallback response
            logger.warning("All Hugging Face models failed, using fallback enhancement")
            return self._create_fallback_enhancement(prompt)
                
        except Exception as e:
            logger.error(f"Hugging Face API call failed: {str(e)}")
            return self._create_fallback_enhancement(prompt)
    
    def _create_fallback_enhancement(self, original_prompt: str) -> str:
        """Create a rule-based enhancement when AI models fail"""
        
        # Extract key components and enhance them
        enhanced = f"""**Context**: You are working on a task that requires clear, structured communication.

**Objective**: {original_prompt}

**Requirements**:
- Provide detailed, specific output
- Use clear, professional language  
- Include relevant examples where helpful
- Structure your response logically

**Output Format**: Please provide a comprehensive response that addresses all aspects of the request.

**Additional Instructions**: Take your time to think through the request and provide the most helpful response possible."""

        return enhanced
    
    def _create_enhanced_response(self, original_prompt: str, ai_response: str, enhancement_type: str, target_audience: str) -> Dict[str, Any]:
        """Create structured response from AI output"""
        
        # Clean up the AI response
        enhanced_prompt = ai_response.replace(original_prompt, "").strip()
        if not enhanced_prompt or len(enhanced_prompt) < len(original_prompt):
            enhanced_prompt = self._create_fallback_enhancement(original_prompt)
        
        # Create structured breakdown
        prompt_structure = {
            "context": f"Enhanced prompt for {enhancement_type} use case targeting {target_audience} audience",
            "objective": f"Transform the user's request: '{original_prompt}' into actionable instructions",
            "requirements": [
                "Provide clear, specific guidance",
                "Use appropriate language for target audience", 
                "Include structured format",
                "Maintain original intent while adding clarity"
            ],
            "target_audience": target_audience,
            "output_format": "Detailed response following the enhanced prompt structure",
            "tone_and_style": self._get_tone_for_type(enhancement_type),
            "examples": [],
            "constraints": [
                "Stay true to original request",
                "Avoid unnecessary complexity",
                "Ensure actionable output"
            ]
        }
        
        return {
            "enhanced_prompt": enhanced_prompt,
            "prompt_structure": prompt_structure,
            "improvement_summary": [
                "Added clear structure and context",
                "Specified requirements and format",
                "Tailored language for target audience",
                "Enhanced clarity and specificity"
            ],
            "estimated_improvement": 70,
            "usage_tips": [
                "Use this enhanced prompt as-is for better AI responses",
                "Adjust requirements based on your specific needs",
                "Consider the target audience when using the output"
            ]
        }
    
    def _get_tone_for_type(self, enhancement_type: str) -> str:
        """Get appropriate tone for enhancement type"""
        tones = {
            "creative": "Inspiring, imaginative, and engaging",
            "technical": "Precise, professional, and detailed", 
            "business": "Professional, results-oriented, and strategic",
            "educational": "Clear, supportive, and informative",
            "general": "Balanced, professional, and accessible"
        }
        return tones.get(enhancement_type, tones["general"])