"""
Simple test endpoint to verify Vercel deployment is working
"""

from fastapi import FastAPI

test_app = FastAPI()

@test_app.get("/test")
def test():
    return {"message": "Vercel deployment is working!", "status": "ok"}
