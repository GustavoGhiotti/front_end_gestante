from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes.auth import router as auth_router
from app.api.routes.chat import router as chat_router
from app.api.routes.consentimentos import router as consentimentos_router
from app.api.routes.gestantes import router as gestantes_router
from app.api.routes.relatos import router as relatos_router
from app.api.routes.care import router as care_router
from app.core.config import settings
from app.db.init_db import init_db, seed_db
from app.db.session import SessionLocal
from app.models.user import User
from app.services.ollama_runtime import ensure_ollama_running, shutdown_managed_ollama, warmup_ollama_model
from app.services.push_service import PushService

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(gestantes_router)
app.include_router(consentimentos_router)
app.include_router(relatos_router)
app.include_router(care_router)
app.include_router(chat_router)


@app.on_event("startup")
def on_startup() -> None:
    ensure_ollama_running()
    warmup_ollama_model()
    init_db()
    db = SessionLocal()
    try:
        has_users = db.scalar(select(User.id).limit(1)) is not None
        if not has_users:
            seed_db(db)
    finally:
        db.close()
    PushService.start_scheduler()


@app.on_event("shutdown")
def on_shutdown() -> None:
    shutdown_managed_ollama()


@app.get("/health")
def health():
    return {"status": "ok"}
