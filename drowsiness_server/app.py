import os
import uvicorn
from drowsiness_server import app

if __name__ == "__main__":
    print("Starting drowsiness detection server...")
    print("Make sure you have downloaded the shape_predictor_68_face_landmarks.dat file")
    print("Server will be available at http://localhost:8001")
    print("WebSocket endpoint at ws://localhost:8001/ws/drowsiness")
    
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("drowsiness_server:app", host="0.0.0.0", port=port, log_level="info")