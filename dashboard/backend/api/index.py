"""
Vercel Serverless Function Entry Point for FastAPI
This file handles all API routes for the Sentric backend
"""

import sys
from pathlib import Path

# Add parent directory to path so we can import main
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Change to backend directory so relative imports work
import os
os.chdir(backend_dir)

# Import the FastAPI app
from main import app

# Vercel expects the app to be available as 'app'
# This is the entry point for all routes
