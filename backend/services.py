# services.py
"""
Business logic and AI integration services
Handles interaction with Grok AI API
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
    """Service for enhancing prompts using Grok AI"""
    
    def __init__(self):
        self.api_key = os.getenv("XAI_API_KEY")
        self.api_url = "https://api.x.ai/v1/chat/completions"
        self.model = "grok-beta"
        
        if not self.api_key:
            raise ValueError("XAI_API_KEY environment variable is required")
    
    async def test_connection(self) -> bool:
        """Test connection to Grok API"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}"
                    },
                    json={
                        "messages": [{"role": "user", "content": "Test"}],
                        "model": self.model,
                        "max_tokens": 10,
                        "temperature": 0.3
                    }
                )
                return response.status_code == 200
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
        Enhance a prompt using Grok AI
        
        Args:
            original_prompt: The original prompt to enhance
            enhancement_type: Type of enhancement to apply
            target_audience: Target audience for the enhanced prompt
            
        Returns:
            EnhancedPromptResponse with all enhancement data
        """
        
        try:
            # Create the enhancement prompt for Grok
            system_prompt = self._create_system_prompt(enhancement_type, target_audience)
            user_prompt = self._create_user_prompt(original_prompt)
            
            # Call Grok API
            grok_response = await self._call_grok_api(system_prompt, user_prompt)
            
            # Parse Grok's response
            enhanced_data = self._parse_grok_response(grok_response)
            
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
    
    def _create_system_prompt(self, enhancement_type: str, target_audience: str) -> str:
        """Create system prompt for Grok based on enhancement type"""
        
        base_prompt = """You are an expert prompt engineer. Your task is to transform a basic prompt into a highly structured and effective prompt that will produce much better AI responses.

You must respond with a JSON object containing these exact fields:
{
    "enhanced_prompt": "The complete, enhanced prompt ready to use",
    "prompt_structure": {
        "context": "Background context and setting",
        "objective": "Clear statement of what needs to be accomplished",
        "requirements": ["list", "of", "specific", "requirements"],
        "target_audience": "Intended audience for the output",
        "output_format": "Expected format and structure",
        "tone_and_style": "Desired tone and writing style",
        "examples": ["optional", "examples"],
        "constraints": ["things", "to", "avoid"]
    },
    "improvement_summary": ["List of key improvements made"],
    "estimated_improvement": 85,
    "usage_tips": ["Tips for using this enhanced prompt effectively"]
}

IMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, code blocks, or explanatory text."""

        type_specific = {
            "creative": "\n\nFocus on: storytelling elements, creative constraints, artistic vision, emotional tone, and imaginative requirements.",
            "technical": "\n\nFocus on: technical specifications, code requirements, system constraints, performance criteria, and implementation details.",
            "business": "\n\nFocus on: business objectives, target market, success metrics, brand voice, and commercial considerations.",
            "educational": "\n\nFocus on: learning objectives, knowledge level, teaching methods, assessment criteria, and pedagogical approach.",
            "general": "\n\nApply balanced enhancement suitable for any domain."
        }
        
        audience_specific = {
            "beginner": "\n\nTailor for beginners: use simple language, provide more context, include step-by-step guidance.",
            "expert": "\n\nTailor for experts: use technical terminology, assume deep knowledge, focus on advanced concepts.",
            "business": "\n\nTailor for business professionals: focus on ROI, efficiency, scalability, and business impact.",
            "student": "\n\nTailor for students: emphasize learning, provide educational context, include practice opportunities.",
            "general": "\n\nMaintain accessibility for a general audience."
        }
        
        return base_prompt + type_specific.get(enhancement_type, type_specific["general"]) + audience_specific.get(target_audience, audience_specific["general"])
    
    def _create_user_prompt(self, original_prompt: str) -> str:
        """Create user prompt for Grok"""
        return f"""Transform this basic prompt into a highly effective, structured prompt:

ORIGINAL PROMPT:
"{original_prompt}"

Remember to respond ONLY with the JSON object as specified. Make sure the enhanced prompt is significantly more detailed, specific, and likely to produce better AI responses."""

    async def _call_grok_api(self, system_prompt: str, user_prompt: str) -> str:
        """Make API call to Grok"""
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}"
                    },
                    json={
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "model": self.model,
                        "max_tokens": 4000,
                        "temperature": 0.3,
                        "stream": False
                    }
                )
                
                if response.status_code != 200:
                    error_detail = response.text
                    logger.error(f"Grok API error {response.status_code}: {error_detail}")
                    raise Exception(f"Grok API error: {response.status_code}")
                
                response_data = response.json()
                return response_data["choices"][0]["message"]["content"]
                
        except httpx.TimeoutException:
            logger.error("Grok API request timeout")
            raise Exception("Request timeout. Please try again.")
        except Exception as e:
            logger.error(f"Grok API call failed: {str(e)}")
            raise
    
    def _parse_grok_response(self, grok_response: str) -> Dict[str, Any]:
        """Parse Grok's JSON response"""
        
        try:
            # Clean up the response text
            response_text = grok_response.strip()
            
            # Remove any markdown code blocks that might wrap the JSON
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            parsed_data = json.loads(response_text)
            
            # Validate required fields
            required_fields = ["enhanced_prompt", "prompt_structure"]
            for field in required_fields:
                if field not in parsed_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate prompt_structure
            structure_fields = ["context", "objective", "requirements", "target_audience", "output_format", "tone_and_style"]
            for field in structure_fields:
                if field not in parsed_data["prompt_structure"]:
                    parsed_data["prompt_structure"][field] = f"Not specified - {field}"
            
            # Set defaults for optional fields
            parsed_data.setdefault("improvement_summary", ["Prompt structure enhanced", "Context and requirements added", "Output format specified"])
            parsed_data.setdefault("estimated_improvement", 75)
            parsed_data.setdefault("usage_tips", ["Use this enhanced prompt as-is", "Adjust requirements based on your specific needs"])
            
            # Ensure requirements is a list
            if not isinstance(parsed_data["prompt_structure"]["requirements"], list):
                parsed_data["prompt_structure"]["requirements"] = [str(parsed_data["prompt_structure"]["requirements"])]
            
            # Ensure optional lists are lists
            for field in ["examples", "constraints"]:
                if field not in parsed_data["prompt_structure"]:
                    parsed_data["prompt_structure"][field] = []
                elif not isinstance(parsed_data["prompt_structure"][field], list):
                    parsed_data["prompt_structure"][field] = [str(parsed_data["prompt_structure"][field])]
            
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Grok response as JSON: {str(e)}")
            logger.error(f"Raw response: {grok_response[:500]}...")
            raise ValueError("Invalid response format from AI service")
        except Exception as e:
            logger.error(f"Error parsing Grok response: {str(e)}")
            raise