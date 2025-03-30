#!/usr/bin/env bash
echo "Current directory: $(pwd)"
echo "Files in directory: $(ls -la)"
echo "Python version: $(python --version)"
echo "PORT environment variable: $PORT"

# Download shape predictor if needed
if [ ! -f "shape_predictor_68_face_landmarks.dat" ]; then
    echo "Downloading shape predictor model..."
    curl -L "https://github.com/italojs/facial-landmarks-recognition/raw/master/shape_predictor_68_face_landmarks.dat" -o shape_predictor_68_face_landmarks.dat
fi

echo "Starting server on port $PORT"
uvicorn drowsiness_server:app --host 0.0.0.0
