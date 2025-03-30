import cv2
import numpy as np
import dlib
from scipy.spatial import distance as dist
from imutils import face_utils
import time
import base64
import json
from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import uvicorn
import os
import logging
from twilio.rest import Client
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

emergency_contacts = [
    "+918777475870",
    "+918529561536",
]

class AccidentAlert(BaseModel):
    location: List[float]
    speed: float
    isDrowsy: bool
    isOversped: bool
    victimDetails: str
    emergencyContacts: Optional[List[str]] = None

# Add CORS middleware to allow requests from your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://safedrive.onrender.com",
    "http://localhost:3000"],  # For development, use specific origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Drowsiness detection parameters
EYE_AR_THRESH = 0.25
EYE_AR_CONSEC_FRAMES = 30
COUNTER = 0
ALARM_ON = False
COOLDOWN_TIME = 300  # 5 minutes cooldown

# Path to the shape predictor file
SHAPE_PREDICTOR_PATH = "shape_predictor_68_face_landmarks.dat"

# Check if the shape predictor file exists
if not os.path.exists(SHAPE_PREDICTOR_PATH):
    logger.error(f"Shape predictor file not found at {SHAPE_PREDICTOR_PATH}")
else:
    logger.info(f"Shape predictor file found at {SHAPE_PREDICTOR_PATH}")

# Initialize face detector and landmark predictor
try:
    detector = dlib.get_frontal_face_detector()
    predictor = dlib.shape_predictor(SHAPE_PREDICTOR_PATH)
    
    # Get facial landmark indices
    (lStart, lEnd) = face_utils.FACIAL_LANDMARKS_IDXS["left_eye"]
    (rStart, rEnd) = face_utils.FACIAL_LANDMARKS_IDXS["right_eye"]
    
    logger.info("Successfully initialized dlib face detector and predictor")
except Exception as e:
    logger.error(f"Error initializing dlib: {e}")
    detector = None
    predictor = None

# Time of last alert
last_alert_time = 0

# Connected clients
connected_clients: List[WebSocket] = []

# Calculate eye aspect ratio
def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    ear = (A + B) / (2.0 * C)
    return ear

# Send alerts to emergency contacts (mock function for development)
def send_alerts():
    logger.info("ALERT: Driver is drowsy! Sending notifications to emergency contacts")
    successful_sends = 0
    
    try:
        # Uncomment this section in production and add your Twilio credentials
        account_sid = TWILIO_ACCOUNT_SID
        auth_token = TWILIO_AUTH_TOKEN
        from_number = TWILIO_PHONE_NUMBER  # Your Twilio number
        
        client = Client(account_sid, auth_token)
        
        for contact in emergency_contacts:
            try:
                # Uncomment this for actual SMS sending
                message = client.messages.create(
                    body="DROWSINESS ALERT: The driver appears to be drowsy or falling asleep! Please check on them immediately.",
                    from_=from_number,
                    to=contact
                )
                logger.info(f"Alert sent to {contact}: {message.sid}")
                
                # For development/testing without SMS
                # logger.info(f"Would send alert to {contact} in production mode")
                successful_sends += 1
            except Exception as e:
                logger.error(f"Failed to send alert to {contact}: {e}")
    except Exception as e:
        logger.error(f"Error initializing SMS client: {e}")
    
    return successful_sends

# Decode base64 image
def decode_base64_image(base64_img):
    try:
        # Remove data URL prefix if present
        if "," in base64_img:
            base64_img = base64_img.split(",")[1]
        
        # Decode base64
        img_bytes = base64.b64decode(base64_img)
        img_np = np.frombuffer(img_bytes, dtype=np.uint8)
        
        # Decode image
        frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        return frame
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return None

# Process frame for drowsiness detection
def process_frame(frame):
    global COUNTER, ALARM_ON, last_alert_time
    
    if frame is None:
        logger.warning("Received empty frame")
        return None, {
            "isDrowsy": False,
            "earValue": 0,
            "drowsinessPercentage": 0,
            "alertSent": False,
            "hasDetectedFace": False
        }
    
    # Process the frame for drowsiness detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray, 0)
    
    results = {
        "isDrowsy": False,
        "earValue": 0,
        "drowsinessPercentage": 0,
        "alertSent": False,
        "hasDetectedFace": len(faces) > 0
    }
    
    for face in faces:
        # Get facial landmarks
        shape = predictor(gray, face)
        shape = face_utils.shape_to_np(shape)
        
        # Extract eye coordinates
        leftEye = shape[lStart:lEnd]
        rightEye = shape[rStart:rEnd]
        
        # Calculate EAR
        leftEAR = eye_aspect_ratio(leftEye)
        rightEAR = eye_aspect_ratio(rightEye)
        ear = (leftEAR + rightEAR) / 2.0
        
        results["earValue"] = ear
        
        # Draw the eye contours on the frame
        leftEyeHull = cv2.convexHull(leftEye)
        rightEyeHull = cv2.convexHull(rightEye)
        cv2.drawContours(frame, [leftEyeHull], -1, (0, 255, 0), 1)
        cv2.drawContours(frame, [rightEyeHull], -1, (0, 255, 0), 1)
        
        # Add EAR text
        cv2.putText(frame, f"EAR: {ear:.2f}", (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
        
        # Check if eyes are closed
        if ear < EYE_AR_THRESH:
            COUNTER += 1
            drowsiness_percentage = min(100, (COUNTER / EYE_AR_CONSEC_FRAMES) * 100)
            results["drowsinessPercentage"] = drowsiness_percentage
            
            # Add drowsiness percentage text
            cv2.putText(frame, f"Drowsiness: {drowsiness_percentage:.0f}%", (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            if COUNTER >= EYE_AR_CONSEC_FRAMES:
                current_time = time.time()
                results["isDrowsy"] = True
                
                # Add ALERT text
                cv2.putText(frame, "DROWSINESS ALERT!", (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                # Send alert if not in cooldown period
                if not ALARM_ON and (current_time - last_alert_time) > COOLDOWN_TIME:
                    ALARM_ON = True
                    last_alert_time = current_time
                    
                    # Send alerts
                    successful_sends = send_alerts()
                    logger.info(f"Successfully sent alerts to {successful_sends} contacts")
                    results["alertSent"] = True
        else:
            COUNTER = 0
            ALARM_ON = False
            results["drowsinessPercentage"] = 0
    
    # Add face detection status text
    face_text = "Face Detected" if results["hasDetectedFace"] else "No Face Detected"
    color = (0, 255, 0) if results["hasDetectedFace"] else (0, 0, 255)
    cv2.putText(frame, face_text, (frame.shape[1] - 200, 30),
        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    return frame, results

# WebSocket endpoint to process video frames
@app.websocket("/ws/drowsiness")
async def drowsiness_detection(websocket: WebSocket):
    global connected_clients
    
    await websocket.accept()
    connected_clients.append(websocket)
    logger.info(f"WebSocket connection established. Total connections: {len(connected_clients)}")
    
    try:
        while True:
            # Receive base64 encoded frame from client
            data = await websocket.receive_text()
            
            try:
                json_data = json.loads(data)
                
                if "frame" not in json_data:
                    logger.warning("Received data without frame field")
                    continue
                    
                # Decode base64 image
                frame = decode_base64_image(json_data["frame"])
                
                if frame is None:
                    continue
                
                # Process the frame
                processed_frame, results = process_frame(frame)
                
                if processed_frame is not None:
                    # Encode the processed frame to send back to client
                    _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    processed_frame_base64 = base64.b64encode(buffer).decode('utf-8')
                    
                    # Send the results and processed frame back to the client
                    await websocket.send_json({
                        "processedFrame": f"data:image/jpeg;base64,{processed_frame_base64}",
                        "results": results
                    })
            except json.JSONDecodeError:
                logger.error("Error decoding JSON data from client")
            except Exception as e:
                logger.error(f"Error processing frame: {e}")
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        logger.info(f"WebSocket connection closed. Remaining connections: {len(connected_clients)}")

def send_accident_alerts(alert_data: AccidentAlert):
    """Send SMS alerts to emergency contacts when an accident is detected"""
    logger.info("EMERGENCY ALERT: Accident detected! Sending notifications to emergency contacts")
    
    # Use provided emergency contacts or fall back to defaults
    contacts = alert_data.emergencyContacts or emergency_contacts
    logger.info(f"Using emergency contacts: {contacts}")
    
    # Construct location link if coordinates are valid
    location_link = "Location unavailable"
    if len(alert_data.location) >= 2 and alert_data.location[0] != 0 and alert_data.location[1] != 0:
        location_link = f"https://maps.google.com/?q={alert_data.location[0]},{alert_data.location[1]}"
    
    # Build the alert message
    message = f"EMERGENCY ALERT: Vehicle accident detected!\n"
    message += f"Location: {location_link}\n"
    message += f"Speed at impact: {alert_data.speed:.1f} km/h\n"
    
    if alert_data.isDrowsy:
        message += "Driver was detected as drowsy before the incident.\n"
    
    if alert_data.isOversped:
        message += "Vehicle was exceeding speed limit before the incident.\n"
    
    message += "Please respond immediately or contact emergency services!"
    
    successful_sends = 0
    
    try:
        # Twilio credentials
        account_sid = TWILIO_ACCOUNT_SID
        auth_token = TWILIO_AUTH_TOKEN
        from_number = TWILIO_PHONE_NUMBER  # Your Twilio number
        
        client = Client(account_sid, auth_token)
        
        for contact in contacts:
            try:
                # Send the SMS
                sms = client.messages.create(
                    body=message,
                    from_=from_number,
                    to=contact
                )
                logger.info(f"Accident alert sent to {contact}: {sms.sid}")
                successful_sends += 1
            except Exception as e:
                logger.error(f"Failed to send accident alert to {contact}: {e}")
    except Exception as e:
        logger.error(f"Error initializing SMS client: {e}")
    
    return {
        "success": successful_sends > 0,
        "sent_count": successful_sends,
        "total_contacts": len(contacts),
        "message": message
    }

# Add this endpoint to handle accident alerts
@app.post("/api/accident-alert")
async def accident_alert(alert_data: AccidentAlert):
    """Endpoint to handle accident alerts and send SMS notifications"""
    logger.info(f"Received accident alert: {alert_data}")
    
    # Send alerts to emergency contacts
    result = send_accident_alerts(alert_data)
    
    return {
        "success": result["success"],
        "message": f"Accident alert sent to {result['sent_count']} of {result['total_contacts']} emergency contacts",
        "details": result
    }

@app.get("/")
def read_root():
    return {
        "message": "Drowsiness detection server is running",
        "status": "online",
        "connections": len(connected_clients),
        "detector_status": "available" if detector is not None else "unavailable"
    }

if __name__ == "__main__":
    print("Starting drowsiness detection server...")
    print("Make sure you have downloaded the shape_predictor_68_face_landmarks.dat file")
    print("Server will be available at http://localhost:8001")
    print("WebSocket endpoint at ws://localhost:8001/ws/drowsiness")
    
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("drowsiness_server:app", host="0.0.0.0", port=port, log_level="info")