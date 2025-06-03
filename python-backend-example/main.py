# from fastapi import FastAPI, File, UploadFile, Form
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# import joblib
# import io
# import numpy as np
# from PIL import Image
# from tensorflow.keras.models import load_model
# from tensorflow.keras.preprocessing.image import img_to_array

# # Load models once
# symptom_model = joblib.load("symptom_model.pkl")
# image_model = load_model("image_model.h5")

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# class SymptomRequest(BaseModel):
#     symptoms: str
#     language: str = "en-IN"
#     medicalSystem: str = "Allopathy"

# @app.post("/api/analyze-symptoms")
# async def analyze_symptoms(request: SymptomRequest):
#     prediction = symptom_model.predict([request.symptoms])[0]
#     probs = symptom_model.predict_proba([request.symptoms])[0]
#     top_probs = sorted(zip(symptom_model.classes_, probs), key=lambda x: x[1], reverse=True)[:2]

#     return {
#         "possibleConditions": [
#             {
#                 "name": top_probs[0][0],
#                 "probability": int(top_probs[0][1] * 100),
#                 "description": "Top predicted condition"
#             },
#             {
#                 "name": top_probs[1][0],
#                 "probability": int(top_probs[1][1] * 100),
#                 "description": "Second likely condition"
#             }
#         ],
#         "recommendation": "Consult a doctor if symptoms persist.",
#         "severity": 4,
#         "urgency": "medium"
#     }

# @app.post("/api/analyze-medical-image")
# async def analyze_medical_image(
#     file: UploadFile = File(...),
#     language: str = Form("en-IN"),
#     medicalSystem: str = Form("Allopathy")
# ):
#     contents = await file.read()
#     image = Image.open(io.BytesIO(contents)).resize((128, 128))
#     img_array = img_to_array(image) / 255.0
#     img_array = np.expand_dims(img_array, axis=0)

#     predictions = image_model.predict(img_array)[0]
#     classes = ["Eczema", "Fungal infection", "Contact dermatitis"]
#     top_2 = sorted(zip(classes, predictions), key=lambda x: x[1], reverse=True)[:2]

#     return {
#         "diagnosis": top_2[0][0],
#         "confidence": int(top_2[0][1] * 100),
#         "differential": [
#             {"condition": top_2[1][0], "probability": int(top_2[1][1] * 100)}
#         ],
#         "recommendation": "Apply cream and consult a dermatologist if persists.",
#         "urgency": "medium"
#     }

# requirements.txt
# ------------------
# fastapi
# uvicorn
# transformers
# torch
# torchvision
# pillow
# aiofiles
# python-multipart
# requests

# main.py (FastAPI backend)
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch
import torchvision.models as models
from torchvision import transforms
import requests
import io
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from typing import List, Dict
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load medical condition mappings
with open(os.path.join(os.path.dirname(__file__), 'medical_conditions.json'), 'r') as f:
    MEDICAL_CONDITIONS = json.load(f)

# Training data for symptom analysis
SYMPTOM_TRAINING_DATA = [
    # Acne symptoms
    ("red pimples and inflammation on face, oily skin with breakouts", "Acne"),
    ("cystic acne with painful bumps, oily skin and blackheads", "Acne"),
    ("severe acne with scarring, frequent breakouts on face and back", "Acne"),
    
    # Eczema symptoms
    ("dry itchy skin with red patches, gets worse with stress", "Eczema"),
    ("inflamed skin that burns and itches, chronic dry patches", "Eczema"),
    ("severe itching with scaly skin, red inflamed areas that worsen at night", "Eczema"),
    
    # Psoriasis symptoms
    ("thick red patches with silvery scales, itchy and painful skin", "Psoriasis"),
    ("scaly plaques on elbows and knees, skin that cracks and bleeds", "Psoriasis"),
    ("red inflamed patches with scaling, joint pain and stiffness", "Psoriasis"),
    
    # Contact Dermatitis symptoms
    ("skin rash after contact with allergen, burning and itching", "Contact Dermatitis"),
    ("red irritated skin from new soap, immediate reaction to product", "Contact Dermatitis"),
    ("blistering rash with intense itching, skin reaction to jewelry", "Contact Dermatitis"),
    
    # Fungal Infection symptoms
    ("itchy red rash that spreads in circular pattern", "Fungal Infection"),
    ("scaly patches with intense itching between toes", "Fungal Infection"),
    ("ring-shaped rash that spreads, red and scaly skin infection", "Fungal Infection"),
    
    # Rosacea symptoms
    ("facial redness with visible blood vessels, sensitive skin", "Rosacea"),
    ("flushing and redness on cheeks, bumps that look like acne", "Rosacea"),
    ("persistent facial redness, skin that burns and stings", "Rosacea"),
    
    # Melanoma symptoms
    ("dark mole that changed color, irregular borders on skin growth", "Melanoma"),
    ("growing skin lesion with multiple colors, bleeding mole", "Melanoma"),
    ("asymmetrical mole that's changing, dark spot getting larger", "Melanoma"),
    
    # Urticaria symptoms
    ("sudden appearance of itchy welts, hives all over body", "Urticaria"),
    ("raised red welts that come and go, severe itching with swelling", "Urticaria"),
    ("allergic reaction with widespread hives, itchy skin rash", "Urticaria"),
    
    # Vitiligo symptoms
    ("white patches of skin appearing, loss of skin color in spots", "Vitiligo"),
    ("progressive loss of skin pigment, white patches spreading", "Vitiligo"),
    ("patchy loss of skin color, premature whitening of hair", "Vitiligo"),
    
    # Impetigo symptoms
    ("red sores that burst and crust, highly contagious rash", "Impetigo"),
    ("honey-colored crusts on skin, spreading sores on face", "Impetigo"),
    ("blistering skin infection, itchy red sores that ooze", "Impetigo"),
    
    # Cellulitis symptoms
    ("red swollen skin that's warm to touch, spreading infection", "Cellulitis"),
    ("tender red area that spreads quickly, fever with skin infection", "Cellulitis"),
    ("painful red inflammation, skin that feels hot and tight", "Cellulitis"),
    
    # Scabies symptoms
    ("intense itching that gets worse at night, tiny blisters", "Scabies"),
    ("severe itching with small red bumps, burrow tracks in skin", "Scabies"),
    ("itchy rash between fingers, red bumps in skin folds", "Scabies"),
    
    # Warts symptoms
    ("raised rough growths on skin, painless bumps that spread", "Warts"),
    ("small flesh-colored bumps, rough textured skin growths", "Warts"),
    ("clusters of small raised growths, viral skin infection", "Warts")

]

# Initialize and train the symptom classifier
def initialize_symptom_classifier():
    # Create a pipeline with TF-IDF vectorizer and Naive Bayes classifier
    classifier = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
        ('clf', MultinomialNB())
    ])
    
    # Prepare training data
    X = [text for text, label in SYMPTOM_TRAINING_DATA]
    y = [label for text, label in SYMPTOM_TRAINING_DATA]
    
    # Train the classifier
    classifier.fit(X, y)
    logger.info("Symptom classifier trained successfully")
    return classifier

# Initialize the classifier
symptom_classifier = initialize_symptom_classifier()

# Training data for image analysis - visual characteristics of each condition
IMAGE_TRAINING_DATA = {
    "Acne": {
        "visual_patterns": ["red bumps", "whiteheads", "blackheads", "inflamed spots"],
        "colors": ["red", "white", "dark"],
        "textures": ["bumpy", "oily", "uneven"],
        "confidence_weights": {"color": 0.3, "texture": 0.4, "pattern": 0.3}
    },
    "Eczema": {
        "visual_patterns": ["dry patches", "redness", "scaling", "crusting"],
        "colors": ["red", "pink", "brown"],
        "textures": ["rough", "scaly", "dry"],
        "confidence_weights": {"color": 0.3, "texture": 0.4, "pattern": 0.3}
    },
    "Psoriasis": {
        "visual_patterns": ["thick patches", "silver scales", "defined edges"],
        "colors": ["red", "silver", "white"],
        "textures": ["scaly", "thick", "raised"],
        "confidence_weights": {"color": 0.2, "texture": 0.4, "pattern": 0.4}
    },
    "Contact Dermatitis": {
        "visual_patterns": ["red rash", "blisters", "inflammation"],
        "colors": ["red", "pink"],
        "textures": ["bumpy", "swollen", "wet"],
        "confidence_weights": {"color": 0.4, "texture": 0.3, "pattern": 0.3}
    },
    "Fungal Infection": {
        "visual_patterns": ["circular patches", "ring shape", "spreading edges"],
        "colors": ["red", "brown", "pink"],
        "textures": ["scaly", "flaky", "rough"],
        "confidence_weights": {"color": 0.2, "texture": 0.3, "pattern": 0.5}
    },
    "Melanoma": {
        "visual_patterns": ["irregular borders", "asymmetrical", "changing mole"],
        "colors": ["brown", "black", "multiple colors"],
        "textures": ["raised", "uneven", "rough"],
        "confidence_weights": {"color": 0.4, "texture": 0.2, "pattern": 0.4}
    }
}

def initialize_image_analyzer():
    # Load pre-trained model
    model = models.densenet169(pretrained=True)
    
    # Modify for skin condition classification
    num_conditions = len(MEDICAL_CONDITIONS['skin_conditions'])
    model.classifier = torch.nn.Sequential(
        torch.nn.Linear(1664, 512),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.2),
        torch.nn.Linear(512, 256),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.2),
        torch.nn.Linear(256, num_conditions),
        torch.nn.Softmax(dim=1)
    )
    
    # Set up image transformations
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return model, transform

# Initialize the image analysis model
image_model, image_transform = initialize_image_analyzer()
image_model.eval()  # Set to evaluation mode

# Load the fine-tuned weights if available
if os.path.exists('medical_image_model.pth'):
    image_model.load_state_dict(torch.load('medical_image_model.pth'))
image_model.eval()

image_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def calculate_severity(symptoms: str, prediction_scores: List[float]) -> int:
    """Calculate severity score based on symptoms and prediction confidence"""
    severity_keywords = {
        'severe': 3,
        'intense': 3,
        'extreme': 3,
        'unbearable': 3,
        'moderate': 2,
        'mild': 1
    }
    
    base_severity = 4  # Default moderate severity
    symptoms_lower = symptoms.lower()
    
    # Adjust for severity keywords
    for keyword, score in severity_keywords.items():
        if keyword in symptoms_lower:
            base_severity += score
    
    # Adjust based on prediction confidence
    confidence_factor = max(prediction_scores) if prediction_scores else 0.5
    severity = int(base_severity * confidence_factor)
    
    # Ensure severity stays within bounds (1-10)
    return max(1, min(10, severity))

def get_condition_description(condition: str, medical_system: str) -> str:
    """Get detailed description for a medical condition based on the medical system"""
    descriptions = MEDICAL_CONDITIONS.get(medical_system, {})
    return descriptions.get(condition, f"Possible {condition} detected. Please consult a healthcare provider for proper diagnosis.")

# FastAPI setup
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Symptom prediction request model
class SymptomRequest(BaseModel):
    symptoms: str
    language: str = "en-IN"
    medicalSystem: str = "Allopathy"

@app.post("/api/analyze-symptoms")
async def analyze_symptoms(request: SymptomRequest):
    try:
        logger.info(f"Received symptom analysis request: {request.dict()}")
        
        # Preprocess symptoms text
        symptoms_text = request.symptoms.strip().lower()
        if len(symptoms_text) < 10:
            return {
                "error": "Please provide more detailed symptoms (at least 10 characters)",
                "possibleConditions": [],
                "severity": 0,
                "urgency": "low"
            }
        
        # Get conditions from medical_conditions.json
        conditions = MEDICAL_CONDITIONS.get("skin_conditions", [])
        allopathy_info = MEDICAL_CONDITIONS.get("Allopathy", {})
        ayurveda_info = MEDICAL_CONDITIONS.get("Ayurveda_recommendations", {})
        homeopathy_info = MEDICAL_CONDITIONS.get("Homeopathy_recommendations", {})
        
        # Keywords for each condition based on descriptions
        condition_keywords = {
            "Acne": ["pimples", "inflammation", "red", "oily", "spots", "breakout"],
            "Eczema": ["dry", "itchy", "patches", "inflammation", "chronic", "red", "stress"],
            "Psoriasis": ["red", "scaly", "patches", "autoimmune", "thick", "chronic"],
            "Contact Dermatitis": ["inflammation", "irritants", "allergic", "triggers", "burning", "rash"],
            "Fungal Infection": ["infection", "fungal", "itchy", "spreading", "rash"],
            "Rosacea": ["facial", "redness", "bumps", "flushing", "chronic"],
            "Melanoma": ["cancer", "skin cancer", "serious", "dark", "changing", "mole"],
            "Basal Cell Carcinoma": ["cancer", "growth", "lesion", "skin cancer"],
            "Urticaria": ["hives", "allergic", "itchy", "welts", "swelling"],
            "Vitiligo": ["pigmentation", "white patches", "loss of color", "skin color"],
            "Impetigo": ["bacterial", "infection", "sores", "crusting", "contagious"],
            "Shingles": ["painful", "blisters", "rash", "burning", "nerve pain"],
            "Cellulitis": ["bacterial", "infection", "red", "swollen", "warm", "tender"],
            "Scabies": ["itchy", "rash", "burrows", "intense itching", "night", "parasites"],
            "Warts": ["growth", "viral", "rough", "bump", "raised"]
        }
        
        # Calculate match scores for each condition
        condition_scores = []
        for condition in conditions:
            score = 0
            keywords = condition_keywords.get(condition, [])
            
            # Check for keyword matches
            for keyword in keywords:
                if keyword in symptoms_text:
                    score += 0.3
            
            # Check training data matches
            condition_examples = [example for example, label in SYMPTOM_TRAINING_DATA if label == condition]
            for example in condition_examples:
                example_words = set(example.lower().split())
                symptom_words = set(symptoms_text.split())
                common_words = example_words.intersection(symptom_words)
                if len(common_words) > 0:
                    match_score = len(common_words) / len(example_words)
                    score += match_score * 0.4
            
            # Additional score for severity indicators
            severity_words = ["severe", "intense", "extreme", "very", "lot", "constant", "chronic", "unbearable"]
            severity_score = sum(0.1 for word in severity_words if word in symptoms_text)
            score += min(severity_score, 0.3)
            
            # Location matching (if mentioned in symptoms)
            body_parts = ["face", "arms", "legs", "back", "chest", "neck", "hands", "feet", "scalp"]
            location_matches = sum(1 for part in body_parts if part in symptoms_text)
            if location_matches > 0:
                score += 0.1
            
            if score > 0:
                condition_scores.append((condition, min(score, 1.0), allopathy_info.get(condition, "")))
        
        # Sort by score and get top 3
        condition_scores.sort(key=lambda x: x[1], reverse=True)
        top_conditions = condition_scores[:3]
        
        # Calculate severity
        severity_words = ["severe", "intense", "extreme", "unbearable", "pain", "bleeding", "infection"]
        severity = sum(word in symptoms_text for word in severity_words) * 2
        if top_conditions:
            severity = min(10, severity + max(score for _, score, _ in top_conditions) * 5)
        
        # Prepare response with conditions and recommendations
        possible_conditions = []
        for cond, score, desc in top_conditions:
            condition_data = {
                "name": cond,
                "probability": int(score * 100),
                "description": desc,
                "recommendations": {
                    "allopathy": allopathy_info.get(cond, ""),
                    "ayurveda": ayurveda_info.get(cond, ""),
                    "homeopathy": homeopathy_info.get(cond, "")
                }
            }
            possible_conditions.append(condition_data)
        
        # Prepare final response
        response_data = {
            "possibleConditions": possible_conditions,
            "severity": int(severity),
            "urgency": "high" if severity >= 7 else "medium" if severity >= 4 else "low"
        }
        
        logger.info(f"Sending response: {response_data}")
        return response_data
        
        # Prepare response
        possible_conditions = [
            {
                "name": condition,
                "probability": int(prob * 100),
                "description": get_condition_description(condition, request.medicalSystem)
            }
            for condition, prob in zip(conditions, probabilities)
        ]
        
        # Generate recommendation based on severity and top condition
        if severity >= 8:
            recommendation = "Seek immediate medical attention. Your symptoms suggest a potentially serious condition."
            urgency = "high"
        elif severity >= 5:
            recommendation = f"Schedule an appointment with a healthcare provider soon to evaluate your {conditions[0]}." 
            urgency = "medium"
        else:
            recommendation = f"Monitor your symptoms. If they persist or worsen, consult a healthcare provider."
            urgency = "low"

        # Add AYUSH recommendations if requested
        ayush_recommendation = None
        if request.medicalSystem in ["Ayurveda", "Homeopathy", "Unani", "Siddha", "Yoga"]:
            ayush_recommendation = MEDICAL_CONDITIONS.get(f"{request.medicalSystem}_recommendations", {}).get(conditions[0])
        
        response = {
            "possibleConditions": possible_conditions,
            "recommendation": recommendation,
            "severity": severity,
            "urgency": urgency,
            "ayushRecommendation": ayush_recommendation
        }
        logger.info(f"Generated response: {response}")
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing symptoms: {str(e)}")
        return {
            "error": "Failed to analyze symptoms. Please try again or provide more detailed information.",
            "possibleConditions": [],
            "severity": 0,
            "urgency": "low"
        }
    # Generate recommendation based on severity and top condition
    if severity >= 8:
        recommendation = "Seek immediate medical attention. Your symptoms suggest a potentially serious condition."
        urgency = "high"
    elif severity >= 5:
        recommendation = f"Schedule an appointment with a healthcare provider soon to evaluate your {conditions[0]}." 
        urgency = "medium"
    else:
        recommendation = f"Monitor your symptoms. If they persist or worsen, consult a healthcare provider."
        urgency = "low"

    # Add AYUSH recommendations if requested
    ayush_recommendation = None
    if request.medicalSystem in ["Ayurveda", "Homeopathy", "Unani", "Siddha", "Yoga"]:
        ayush_recommendation = MEDICAL_CONDITIONS.get(f"{request.medicalSystem}_recommendations", {}).get(conditions[0])
    
    return {
        "possibleConditions": possible_conditions,
        "recommendation": recommendation,
        "severity": severity,
        "urgency": urgency,
        "ayushRecommendation": ayush_recommendation
    }

@app.post("/api/analyze-image")
async def analyze_image(file: UploadFile):
    try:
        # Read and preprocess the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Prepare the image
        image_tensor = image_transform(image).unsqueeze(0)
        
        # Get model predictions
        with torch.no_grad():
            outputs = image_model(image_tensor)
            probabilities = outputs[0]
        
        # Get top 3 predictions
        top_probs, top_indices = torch.topk(probabilities, 3)
        
        # Get conditions and their visual characteristics
        conditions = MEDICAL_CONDITIONS['skin_conditions']
        possible_conditions = []
        
        for prob, idx in zip(top_probs, top_indices):
            condition_name = conditions[idx]
            training_data = IMAGE_TRAINING_DATA.get(condition_name, {})
            
            # Calculate confidence score based on visual characteristics
            confidence_score = float(prob)
            if training_data:
                weights = training_data.get('confidence_weights', {})
                visual_score = (
                    weights.get('color', 0.3) +
                    weights.get('texture', 0.3) +
                    weights.get('pattern', 0.4)
                )
                confidence_score = (confidence_score + visual_score) / 2
            
            condition_data = {
                "name": condition_name,
                "probability": min(confidence_score * 100, 100),
                "description": MEDICAL_CONDITIONS['Allopathy'].get(condition_name, ""),
                "visual_characteristics": {
                    "patterns": training_data.get('visual_patterns', []),
                    "colors": training_data.get('colors', []),
                    "textures": training_data.get('textures', [])
                },
                "recommendations": {
                    "allopathy": MEDICAL_CONDITIONS['Allopathy'].get(condition_name, ""),
                    "ayurveda": MEDICAL_CONDITIONS['Ayurveda_recommendations'].get(condition_name, ""),
                    "homeopathy": MEDICAL_CONDITIONS['Homeopathy_recommendations'].get(condition_name, "")
                }
            }
            possible_conditions.append(condition_data)
        
        # Calculate overall severity and urgency
        max_probability = max(c["probability"] for c in possible_conditions)
        severity = int(max_probability / 20)  # Convert to 0-10 scale
        urgency = "high" if severity >= 7 else "medium" if severity >= 4 else "low"
        
        # Prepare final response
        response = {
            "possibleConditions": possible_conditions,
            "severity": severity,
            "urgency": urgency
        }
        
        logger.info(f"Image analysis complete. Found conditions: {[c['name'] for c in possible_conditions]}")
        return response
        
    except Exception as e:
        error_msg = f"Error analyzing image: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail={
                "error": error_msg,
                "possibleConditions": [],
                "severity": 0,
                "urgency": "low"
            }
        )

@app.get("/api/nearby-hospitals")
async def get_nearby_hospitals(lat: float, lon: float):
    API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lon}&radius=5000&type=hospital&key={API_KEY}"
    response = requests.get(url)
    return response.json().get('results', [])

# Health Metrics Prediction Model
class HealthMetrics(BaseModel):
    heartRate: str
    bloodPressureSystolic: str
    bloodPressureDiastolic: str
    bloodSugar: str
    weight: str
    height: str

class HealthPrediction(BaseModel):
    summary: str
    details: str

def train_health_prediction_model():
    # Simulated health dataset (you should replace this with a real, comprehensive dataset)
    data = {
        'heart_rate': [70, 75, 80, 65, 72],
        'systolic_bp': [120, 125, 130, 115, 122],
        'diastolic_bp': [80, 82, 85, 75, 78],
        'blood_sugar': [95, 100, 105, 90, 98],
        'weight': [70, 75, 80, 65, 72],
        'height': [170, 175, 180, 165, 172],
        'health_risk': [0.2, 0.3, 0.4, 0.1, 0.25]  # 0 is low risk, 1 is high risk
    }
    
    df = pd.DataFrame(data)
    
    X = df.drop('health_risk', axis=1)
    y = df['health_risk']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    return model, scaler

# Train the model when the server starts
health_model, health_scaler = train_health_prediction_model()

@app.post("/api/predict-health", response_model=HealthPrediction)
async def predict_health(metrics: HealthMetrics):
    try:
        # Convert input to numeric values
        input_data = {
            'heart_rate': float(metrics.heartRate),
            'systolic_bp': float(metrics.bloodPressureSystolic),
            'diastolic_bp': float(metrics.bloodPressureDiastolic),
            'blood_sugar': float(metrics.bloodSugar),
            'weight': float(metrics.weight),
            'height': float(metrics.height)
        }
        
        # Prepare input data
        input_df = pd.DataFrame([input_data])
        input_scaled = health_scaler.transform(input_df)
        
        # Predict health risk
        health_risk = health_model.predict(input_scaled)[0]
        
        # Interpret health risk
        if health_risk < 0.2:
            summary = "Low Health Risk"
            details = "Your current health metrics indicate a low risk of health issues. Continue maintaining your healthy lifestyle."
        elif health_risk < 0.4:
            summary = "Moderate Health Risk"
            details = "Your health metrics suggest some potential areas of concern. Consider consulting a healthcare professional for personalized advice."
        else:
            summary = "High Health Risk"
            details = "Your health metrics indicate potential risks. It is strongly recommended to consult a healthcare professional for a comprehensive health assessment."
        
        return HealthPrediction(
            summary=summary,
            details=details
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
# Run using: uvicorn main:app --reload