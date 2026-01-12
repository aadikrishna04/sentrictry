"""
Vercel Serverless Function Entry Point for FastAPI
This file handles all API routes for the Sentric backend
"""

import sys
import os
from pathlib import Path

# Add parent directory to path so we can import main
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the FastAPI app
from main import app

# Export the app for Vercel
# Vercel will automatically detect and use the FastAPI app
__all__ = ["app"]
