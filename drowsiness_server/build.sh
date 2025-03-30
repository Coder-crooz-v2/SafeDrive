#!/usr/bin/env bash
echo "Starting build process..."

# First install minimal dependencies
pip install fastapi uvicorn

# Install system dependencies for image processing
apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libxext6 \
    libsm6 \
    libxrender1

# Install packages incrementally
echo "Installing numpy, scipy..."
pip install numpy scipy

echo "Installing OpenCV..."
pip install opencv-python-headless

echo "Installing MediaPipe..."
pip install mediapipe

echo "Installing remaining dependencies..."
pip install python-multipart python-dotenv twilio websockets pydantic==1.10.7

# Verify installation
echo "Installed packages:"
pip list

echo "Build completed!"