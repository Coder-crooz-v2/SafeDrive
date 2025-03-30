#!/usr/bin/env bash
# filepath: c:\Users\souna\OneDrive\Desktop\My folders\ML_projects\Solutions challenge\SafeDrive\drowsiness_server\build.sh
echo "Starting build process..."

# Install system dependencies for dlib
apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev

# Show environment info
echo "Python version: $(python --version)"
echo "Pip version: $(pip --version)"

# Install Python dependencies
pip install -r requirements.txt

# Verify installation
echo "Installed packages:"
pip list

echo "Build completed!"
chmod +x build.sh