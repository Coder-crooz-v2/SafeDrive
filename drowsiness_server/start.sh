#!/usr/bin/env bash
# Download shape predictor model if it doesn't exist
if [ ! -f "shape_predictor_68_face_landmarks.dat" ]; then
    echo "Downloading shape predictor model..."
    curl -L "https://github.com/italojs/facial-landmarks-recognition/raw/master/shape_predictor_68_face_landmarks.dat" -o shape_predictor_68_face_landmarks.dat
fi

# Start the server
uvicorn drowsiness_server:app --host 0.0.0.0 --port $PORT