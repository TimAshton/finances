import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR
from app.database import Base, engine, run_migrations
from app.routers import accounts, payoff, settings, snapshots

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="Family Finance Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router)
app.include_router(payoff.router)
app.include_router(snapshots.router)
app.include_router(settings.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# In production the frontend is pre-built and served as static files from
# this same FastAPI process (see docker-compose.yml / Dockerfile). In local
# dev, STATIC_DIR is unset and the frontend runs separately via `vite dev`.
if STATIC_DIR:
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    # react-router-dom uses client-side routing, so a hard reload/direct link to
    # e.g. /accounts is a real GET to this server for a path that doesn't exist
    # on disk. Serve the matching file if there is one (favicon, etc.), otherwise
    # fall back to index.html so the SPA router can take over.
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
