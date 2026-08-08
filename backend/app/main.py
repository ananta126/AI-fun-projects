"""
app/main.py — Application Entry Point

Purpose:
    Creates the FastAPI app, configures CORS, creates database tables on startup,
    and registers all API routers.

Why it exists:
    Single entry point run by: uvicorn app.main:app --reload

How Flutter uses this:
    Flutter's Dio client points to http://localhost:8000 (this server).
    CORS middleware allows Flutter (running on emulator/device) to call the API.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on startup and shutdown.
    On startup: create database tables if they don't exist.
  """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS — allows Flutter app to make requests from any origin (POC only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)


@app.get("/health")
async def health_check():
    """Simple health check — confirms the server is running."""
    return {"status": "ok"}
