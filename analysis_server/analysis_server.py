#!/usr/bin/env python
# coding: utf-8

import os
import time
import json
import google.generativeai as genai
from typing import Dict, Any
import PyPDF2
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, date
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Create FastAPI app
app = FastAPI(title="SafeDrive Chatbot API", 
              description="API for the SafeDrive Admin Assistant chatbot")

# Add CORS middleware to allow cross-origin requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimplifiedRiskAnalyzer:
    def __init__(self, api_key: str):
        """
        Initialize Gemini API client with provided API key
        
        :param api_key: Your Google AI Studio API key
        """
        try:
            # Configure the Gemini API with the provided key
            genai.configure(api_key=api_key)
            
            # Select the Gemini Pro model
            self.model = genai.GenerativeModel('gemini-1.5-pro-latest')
        
        except Exception as e:
            print(f"API Configuration Error: {e}")
            self.model = None

    def calculate_age(self, birth_date: str) -> int:
        """
        Calculate age based on birth date
        
        :param birth_date: Birth date in YYYY-MM-DD format
        :return: Age in years
        """
        try:
            birth = datetime.strptime(birth_date, "%Y-%m-%d").date()
            today = date.today()
            age = today.year - birth.year
            
            # Adjust age if birthday hasn't occurred this year
            if (today.month, today.day) < (birth.month, birth.day):
                age -= 1
            
            return age
        except Exception:
            return None

    def analyze_risk(self, driver_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simplified risk analysis using binary risk factors
        
        :param driver_data: Driver and vehicle information with binary risk factors
        :return: Detailed risk analysis
        """
        # Calculate driver's age
        driver_age = self.calculate_age(driver_data.get('birth_date'))
        
        # Extract binary risk factors
        drowsiness = driver_data.get('drowsiness_state', 0)  # 0 or 1
        overspeeding = driver_data.get('overspeeding', 0)  # 0 or 1
        
        # Prepare detailed risk profile
        risk_profile = {
            'personal_details': {
                'name': driver_data.get('driver_name', 'N/A'),
                'age': driver_age,
                'gender': driver_data.get('gender', 'N/A'),
            },
            'vehicle_details': {
                'vehicle_number': driver_data.get('vehicle_number', 'N/A'),
                'vehicle_model': driver_data.get('vehicle_model', 'N/A'),
                'model_name': driver_data.get('model_name', 'N/A'),
            },
            'risk_factors': {
                'drowsiness': drowsiness,
                'overspeeding': overspeeding
            }
        }
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(risk_profile)
        
        # Generate Gemini-powered risk reasoning
        risk_reasoning = self._generate_gemini_reasoning(risk_profile)
        
        # Determine insurance recommendation
        insurance_recommendation = self._generate_insurance_recommendation(risk_score, risk_profile)
        
        return {
            'personal_details': risk_profile['personal_details'],
            'vehicle_details': risk_profile['vehicle_details'],
            'risk_score': risk_score,
            'risk_level': self._classify_risk_level(risk_score),
            'gemini_insights': risk_reasoning,
            'insurance_recommendation': insurance_recommendation
        }

    def _calculate_risk_score(self, risk_profile: Dict[str, Any]) -> float:
        """
        Calculate simplified risk score based on binary factors
        
        :param risk_profile: Risk profile dictionary
        :return: Calculated risk score
        """
        # Extract binary risk factors
        drowsiness = risk_profile['risk_factors']['drowsiness']
        overspeeding = risk_profile['risk_factors']['overspeeding']
        
        # Define weights for each factor
        drowsiness_weight = 0.6  # Highest weight due to critical safety impact
        overspeeding_weight = 0.4
        
        # Calculate weighted score
        risk_components = [
            # Each factor is either 0 or 1, multiplied by its weight
            drowsiness * drowsiness_weight,
            overspeeding * overspeeding_weight,
            
            # Add age-based risk
            self._calculate_age_risk(risk_profile['personal_details']['age']),
            
            # Add gender-based risk (if applicable)
            self._calculate_gender_risk(risk_profile['personal_details']['gender'])
        ]
        
        return min(sum(risk_components), 1)

    def _calculate_age_risk(self, age: int) -> float:
        """
        Calculate risk based on driver's age
        
        :param age: Driver's age
        :return: Age-related risk factor
        """
        if age is None:
            return 0.1  # Default risk if age can't be calculated
        
        # Higher risk for very young and very old drivers
        if age < 25:
            return 0.15  # Young driver higher risk
        elif age > 65:
            return 0.10  # Older driver moderate risk
        else:
            return 0.05  # Middle-age lower risk

    def _calculate_gender_risk(self, gender: str) -> float:
        """
        Calculate risk based on driver's gender (based on statistical data)
        
        :param gender: Driver's gender
        :return: Gender-related risk factor
        """
        # This is a simplified approach based on statistical trends
        # In a real system, more sophisticated models would be used
        if gender.lower() == 'male':
            return 0.05  # Slightly higher risk based on statistical data
        else:
            return 0.02
        
    def _classify_risk_level(self, risk_score: float) -> str:
        """
        Classify risk level based on calculated score
        
        :param risk_score: Calculated risk score
        :return: Risk level classification
        """
        if risk_score >= 0.75:
            return 'EXTREME RISK'
        elif risk_score >= 0.5:
            return 'HIGH RISK'
        elif risk_score >= 0.25:
            return 'MODERATE RISK'
        else:
            return 'LOW RISK'

    def _generate_insurance_recommendation(self, risk_score: float, risk_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate insurance recommendation based on risk score and profile
        
        :param risk_score: Calculated risk score
        :param risk_profile: Comprehensive risk profile
        :return: Insurance recommendation dictionary
        """
        recommendations = {
            'EXTREME RISK': {
                'status': 'DENY',
                'premium_loading': '100%+',
                'advice': 'Insurance coverage denied. High-risk driver requires significant risk mitigation.',
                'required_actions': [
                    'Complete advanced defensive driving course',
                    'Install comprehensive vehicle tracking and safety systems',
                    'Undergo medical evaluation for fitness to drive'
                ]
            },
            'HIGH RISK': {
                'status': 'CONDITIONAL',
                'premium_loading': '50-100%',
                'advice': 'Conditional insurance with strict monitoring and higher premiums.',
                'required_actions': [
                    'Enroll in defensive driving program',
                    'Accept usage-based insurance with telematics',
                    'Regular vehicle safety inspections'
                ]
            },
            'MODERATE RISK': {
                'status': 'APPROVED',
                'premium_loading': '20-50%',
                'advice': 'Insurance approved with moderate premium adjustments.',
                'recommended_actions': [
                    'Consider additional safety features',
                    'Participate in safe driver programs',
                    'Regular vehicle maintenance'
                ]
            },
            'LOW RISK': {
                'status': 'STANDARD',
                'premium_loading': '0-20%',
                'advice': 'Standard insurance coverage with potential minor discounts.',
                'benefits': [
                    'Potentially lower premiums',
                    'Access to safe driver rewards programs'
                ]
            }
        }
        
        risk_level = self._classify_risk_level(risk_score)
        return recommendations.get(risk_level, recommendations['MODERATE RISK'])

    def _generate_gemini_reasoning(self, risk_profile: Dict[str, Any]) -> str:
        """
        Generate AI-powered risk reasoning
        
        :param risk_profile: Comprehensive risk profile
        :return: Detailed reasoning narrative
        """
        if not self.model:
            return "API not configured. Unable to generate reasoning."
        
        # Extract risk factors for clearer prompt
        drowsiness = "Yes" if risk_profile['risk_factors']['drowsiness'] == 1 else "No"
        overspeeding = "Yes" if risk_profile['risk_factors']['overspeeding'] == 1 else "No"
        
        # Construct detailed prompt for Gemini
        prompt = f"""Provide a comprehensive risk analysis for the following driver and vehicle:

        Driver Profile:
        - Name: {risk_profile['personal_details']['name']}
        - Age: {risk_profile['personal_details']['age']} years
        - Gender: {risk_profile['personal_details']['gender']}

        Vehicle Information:
        - Vehicle Number: {risk_profile['vehicle_details']['vehicle_number']}
        - Vehicle Model: {risk_profile['vehicle_details']['vehicle_model']}
        - Model Name: {risk_profile['vehicle_details']['model_name']}

        Risk Factors:
        - Drowsiness Detected: {drowsiness}
        - Overspeeding Detected: {overspeeding}

        Provide a concise small accurate analysis that includes:
        1. Comprehensive risk assessment
        2. Potential insurance implications
        3. Recommendations for risk mitigation
        4. Detailed reasoning behind risk factors

        Ensure the analysis is professional, data-driven, and actionable.
        """
        
        try:
            # Generate reasoning using Gemini
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Reasoning Generation Error: {str(e)}"

class AnalysisRequest(BaseModel):
    driver_data: Dict[str, Any]

class AnalysisResponse(BaseModel):
    status: str
    message: str
    data: Dict[str, Any]

# Request and response models
class ChatbotRequest(BaseModel):
    message: str
    conversation_id: str = None

class ChatbotResponse(BaseModel):
    response: str
    conversation_id: str

# Configure the Gemini API
def configure_genai(api_key):
    genai.configure(api_key=api_key)
    
# Initialize the model
def initialize_model():
    return genai.GenerativeModel('gemini-1.5-pro-latest')

# Extract and process PDF content
def extract_pdf_content(pdf_file):
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page_num in range(len(pdf_reader.pages)):
        text += pdf_reader.pages[page_num].extract_text()
    return text

# Process the documentation content for context
def process_documentation(documentation_text):
    # Process and structure the documentation for easier reference
    # This is a simplified version - in production, you might want to use 
    # more sophisticated NLP techniques or vector databases
    return documentation_text

# Insurance Provider Chatbot Class
class InsuranceProviderChatbot:
    def __init__(self, model, system_documentation=None):
        self.model = model
        self.system_documentation = system_documentation
        self.conversations = {}  # Store conversations by ID
        self.init_system_prompt()
        
    def init_system_prompt(self):
        self.system_prompt = """
        You are a specialized assistant for SafeDrive administrators and insurance providers.
        
        Your primary functions are to:
        1. Guide admins on using the platform's features
        2. Help interpret AI-driven claim recommendations
        3. Explain how to access and understand real-time accident notifications
        4. Provide details on the driver monitoring systems (drowsiness detection, speed monitoring, etc.)
        5. Assist with setting up and managing emergency protocols
        6. Explain how to integrate with existing insurance systems
        7. Help troubleshoot common issues
        
        Key system features you should be knowledgeable about:
        - AI-Driven Claim Recommendations using behavior, speed, age, drowsiness history, and claim patterns
        - Real-time accident notifications with vehicle details, car model, speed, and location
        - GPS Tracking integration
        - Drowsiness Detection monitoring
        - Speed and Jerk Detection for identifying unsafe driving
        - Driver Presence Detection
        - User Wellness Check system
        - Emergency Contact Alert system
        - Accident-Prone Live Navigation
        
        Always maintain a professional, helpful tone. Provide concise, accurate information focused on admin needs.
        """
        
    def add_documentation_context(self, query):
        """Add relevant documentation sections to provide context for the query"""
        if not self.system_documentation:
            return query
            
        # In a production environment, this would use semantic search or embeddings
        # to find the most relevant sections of documentation
        relevant_docs = self.system_documentation
        
        # Limit context size to avoid token limits
        if len(relevant_docs) > 8000:  # arbitrary limit, adjust based on model constraints
            relevant_docs = relevant_docs[:8000] + "..."
            
        enhanced_query = f"""
        Referring to the following system documentation:
        
        {relevant_docs}
        
        Please answer the following query:
        {query}
        """
        return enhanced_query
    
    def get_or_create_conversation(self, conversation_id=None):
        """Get existing conversation or create a new one"""
        if conversation_id and conversation_id in self.conversations:
            return conversation_id, self.conversations[conversation_id]
        
        # Create new conversation ID if not provided or not found
        new_id = conversation_id or f"conv_{int(time.time())}"
        self.conversations[new_id] = []
        return new_id, self.conversations[new_id]
        
    def process_query(self, query, conversation_id=None, use_documentation=True):
        # Get or create conversation history
        conv_id, conversation_history = self.get_or_create_conversation(conversation_id)
        
        # Add the user query to conversation history
        conversation_history.append({"role": "user", "content": query})
        
        # Prepare the prompt with system instructions and conversation history
        prompt_parts = [self.system_prompt]
        
        # Add previous conversation for context (limited to prevent token overflow)
        max_history = 5  # Adjust based on your requirements
        if len(conversation_history) > 1:
            history_to_include = conversation_history[-min(max_history, len(conversation_history)):]
            for message in history_to_include:
                prompt_parts.append(f"{message['role'].upper()}: {message['content']}")
        
        # Add documentation context if available and requested
        if use_documentation and self.system_documentation:
            context_query = self.add_documentation_context(query)
            prompt_parts.append(context_query)
        else:
            prompt_parts.append(f"QUERY: {query}")
            
        # Generate response using Gemini
        try:
            response = self.model.generate_content(prompt_parts)
            response_text = response.text
            
            # Add the response to conversation history
            conversation_history.append({"role": "assistant", "content": response_text})
            
            return conv_id, response_text
        except Exception as e:
            error_message = f"Error generating response: {str(e)}"
            conversation_history.append({"role": "assistant", "content": error_message})
            return conv_id, error_message

# Initialize the chatbot
try:
    API_KEY = "AIzaSyAEw60rlCckJ6j9TSjQR3BVyjFQmlgqraw"  # In production, use env variables
    configure_genai(API_KEY)
    model = initialize_model()
    chatbot = InsuranceProviderChatbot(model)
    
    # Try to load documentation if available
    try:
        with open("readme.pdf", "rb") as pdf_file:
            documentation_text = extract_pdf_content(pdf_file)
            processed_docs = process_documentation(documentation_text)
            chatbot.system_documentation = processed_docs
            print("Documentation loaded successfully.")
    except FileNotFoundError:
        print("No documentation file found. Continuing without documentation context.")
        
except Exception as e:
    print(f"Error initializing chatbot: {e}")
    chatbot = None

# FastAPI routes
@app.post("/chatbot", response_model=ChatbotResponse)
async def process_chat_message(request: ChatbotRequest = Body(...)):
    print("Request: ", request)
    if not chatbot:
        raise HTTPException(status_code=500, detail="Chatbot not initialized properly")
    
    if not request.message or request.message.strip() == "":
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Process the message
    conversation_id, response = chatbot.process_query(
        query=request.message,
        conversation_id=request.conversation_id
    )
    
    # Return the response
    return ChatbotResponse(
        response=response,
        conversation_id=conversation_id
    )

@app.post("/analyze-risk", response_model=AnalysisResponse)
async def analyze_claims(request: AnalysisRequest = Body(...)):
    # Sample driver data with simplified binary risk factors
    driver_data = request.driver_data
    
    try:
        # Replace with your actual API key
        risk_analyzer = SimplifiedRiskAnalyzer(GEMINI_API_KEY)
        
        # Perform risk analysis
        analysis_result = risk_analyzer.analyze_risk(driver_data)
        
        # Print results
        print(json.dumps(analysis_result, indent=2))
        
        return AnalysisResponse(
            status="success",
            message="Risk analysis completed successfully.",
            data=analysis_result
        )
    
    except Exception as e:
        print(f"Analysis failed: {e}")
        return AnalysisResponse(
            status="error",
            message=e,
            data={}  # Empty data for error case
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "chatbot_initialized": chatbot is not None}

# Run the server if executed directly
if __name__ == "__main__":
    uvicorn.run("analysis_server:app", host="0.0.0.0", port=8002, reload=True)