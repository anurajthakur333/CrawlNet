#!/usr/bin/env python3
"""
Simple script to start the FastAPI server with proper environment configuration.
"""

import uvicorn
from Ohs import app, API_HOST, API_PORT, DEBUG

if __name__ == "__main__":
    print(f"🚀 Starting FastAPI server on {API_HOST}:{API_PORT}")
    print(f"🔧 Debug mode: {DEBUG}")
    print(f"📡 Access API at: http://{API_HOST}:{API_PORT}")
    print(f"📋 Health check: http://{API_HOST}:{API_PORT}/health")
    print("-" * 50)
    
    uvicorn.run(
        "Ohs:app",
        host=API_HOST,
        port=API_PORT,
        reload=DEBUG,
        access_log=DEBUG
    ) 