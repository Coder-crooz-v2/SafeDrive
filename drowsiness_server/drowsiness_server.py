import cv2
import numpy as np
import mediapipe as mp  # Replace dlib with mediapipe
from scipy.spatial import distance as dist
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
from typing import List, Optional
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
EYE_AR_THRESH = 0.3
EYE_AR_CONSEC_FRAMES = 30
COUNTER = 0
ALARM_ON = False
COOLDOWN_TIME = 300  # 5 minutes cooldown

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Define eye landmarks for MediaPipe (indexes are different from dlib)
# These are the indexes for the eye landmarks in MediaPipe's 468 points model
LEFT_EYE_INDEXES = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_INDEXES = [33, 160, 158, 133, 153, 144]

# Time of last alert
last_alert_time = 0

# Connected clients
connected_clients: List[WebSocket] = []

# Calculate eye aspect ratio using MediaPipe landmarks
def eye_aspect_ratio(landmarks, eye_indexes):
    # Extract eye points using the indexes
    points = [landmarks[i] for i in eye_indexes]
    
    # Horizontal distance (eye width)
    h_dist = dist.euclidean(
        (points[0].x, points[0].y), 
        (points[3].x, points[3].y)
    )
    
    # Two vertical distances
    v_dist1 = dist.euclidean(
        (points[1].x, points[1].y), 
        (points[5].x, points[5].y)
    )
    v_dist2 = dist.euclidean(
        (points[2].x, points[2].y), 
        (points[4].x, points[4].y)
    )
    
    # Calculate EAR
    ear = (v_dist1 + v_dist2) / (2.0 * h_dist)
    return ear

# Send alerts to emergency contacts
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

# Process frame for drowsiness detection using MediaPipe
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
    
    # Convert to RGB for MediaPipe
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process the frame
    results = face_mesh.process(frame_rgb)
    
    # Initialize result dictionary
    detection_results = {
        "isDrowsy": False,
        "earValue": 0,
        "drowsinessPercentage": 0,
        "alertSent": False,
        "hasDetectedFace": False
    }
    
    # Check if face is detected
    if results.multi_face_landmarks:
        detection_results["hasDetectedFace"] = True
        
        # Get landmarks for the first face
        face_landmarks = results.multi_face_landmarks[0]
        
        # Get frame dimensions for drawing
        h, w, c = frame.shape
        
        # Draw eye landmarks for visualization
        for idx in LEFT_EYE_INDEXES + RIGHT_EYE_INDEXES:
            landmark = face_landmarks.landmark[idx]
            x, y = int(landmark.x * w), int(landmark.y * h)
            cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
        
        # Calculate EAR for left and right eyes
        left_ear = eye_aspect_ratio(face_landmarks.landmark, LEFT_EYE_INDEXES)
        right_ear = eye_aspect_ratio(face_landmarks.landmark, RIGHT_EYE_INDEXES)
        
        # Average EAR
        ear = (left_ear + right_ear) / 2.0
        detection_results["earValue"] = ear
        
        # Draw eye contours and connections for visualization
        def draw_eye(landmarks, indexes, color=(0, 255, 0)):
            points = []
            for idx in indexes:
                landmark = landmarks.landmark[idx]
                x, y = int(landmark.x * w), int(landmark.y * h)
                points.append((x, y))
            
            points = np.array(points, dtype=np.int32)
            cv2.polylines(frame, [points], True, color, 1)
        
        # Draw eye contours
        draw_eye(face_landmarks, LEFT_EYE_INDEXES, (0, 255, 0))
        draw_eye(face_landmarks, RIGHT_EYE_INDEXES, (0, 255, 0))
        
        # Add EAR text
        cv2.putText(frame, f"EAR: {ear:.2f}", (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
        
        # Check if eyes are closed
        if ear < EYE_AR_THRESH:
            COUNTER += 1
            drowsiness_percentage = min(100, (COUNTER / EYE_AR_CONSEC_FRAMES) * 100)
            detection_results["drowsinessPercentage"] = drowsiness_percentage
            
            # Add drowsiness percentage text
            cv2.putText(frame, f"Drowsiness: {drowsiness_percentage:.0f}%", (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            if COUNTER >= EYE_AR_CONSEC_FRAMES:
                current_time = time.time()
                detection_results["isDrowsy"] = True
                
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
                    detection_results["alertSent"] = True
        else:
            COUNTER = 0
            ALARM_ON = False
            detection_results["drowsinessPercentage"] = 0
    
    # Add face detection status text
    face_text = "Face Detected" if detection_results["hasDetectedFace"] else "No Face Detected"
    color = (0, 255, 0) if detection_results["hasDetectedFace"] else (0, 0, 255)
    cv2.putText(frame, face_text, (frame.shape[1] - 200, 30),
        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    return frame, detection_results

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
                    response = {
                        "is_drowsy": results["isDrowsy"],
                        "ear": results["earValue"],
                        "drowsiness_percentage": results["drowsinessPercentage"],
                        "alert_sent": results["alertSent"],
                        "face_detected": results["hasDetectedFace"],
                        "processedFrame": f"data:image/jpeg;base64,{processed_frame_base64}"
                    }
                    
                    await websocket.send_json(response)
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
        "detector_status": "available" if face_mesh is not None else "unavailable"
    }

# For testing only: add a simple endpoint to test if the API is working
@app.get("/api/ping")
def ping():
    return {"message": "pong", "timestamp": time.time()}

if __name__ == "__main__":
    print("Starting drowsiness detection server...")
    print("Server will be available at http://localhost:8001")
    print("WebSocket endpoint at ws://localhost:8001/ws/drowsiness")
    
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("drowsiness_server:app", host="0.0.0.0", port=port, log_level="info")