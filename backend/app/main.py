"""
app/main.py — Application Entry Point (Phase 2+)

Purpose:
    Creates the FastAPI application instance, registers routers,
    and configures middleware (CORS for Flutter, etc.).

Why it exists:
    Every Python web app needs a single entry point. Uvicorn runs this file:
        uvicorn app.main:app --reload

What will live here (later):
    - FastAPI() instance
    - CORS middleware (allows Flutter app to call the API)
    - Router registration from app/api/
    - Lifespan events (DB connection pool startup/shutdown)

Do NOT add business logic here — keep it as wiring only.
"""

# Phase 1: No application logic yet. Implementation starts in Phase 2.
