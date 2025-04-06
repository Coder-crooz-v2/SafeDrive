#!/usr/bin/env bash
echo "Starting server on port $PORT"
uvicorn drowsiness_server:app --host 0.0.0.0 --port $PORT
