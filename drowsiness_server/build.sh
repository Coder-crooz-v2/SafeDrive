#!/usr/bin/env bash
# Install system dependencies for dlib
apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev

# Install Python dependencies
pip install -r requirements.txt