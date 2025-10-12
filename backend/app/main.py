from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, plans, users
from app.core.config import settings
from app.db import base  # noqa: F401 - ensures models are imported
from app.db.base_class import Base
from app.db.session import SessionLocal, engine
from app.services.seed import seed_initial_plans

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(users.router, prefix=settings.api_v1_prefix)
app.include_router(plans.router, prefix=settings.api_v1_prefix)

app.mount("/media", StaticFiles(directory="media"), name="media")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_plans(db)
    finally:
        db.close()


@app.get("/healthz")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
