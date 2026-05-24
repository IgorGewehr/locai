"""FastAPI application factory."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.config import get_settings
from app.observability import configure_logging, enable_langsmith_if_configured


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    ls = enable_langsmith_if_configured()
    s = get_settings()

    import structlog
    log = structlog.get_logger()
    log.info(
        "locai-agent.startup",
        env=s.app_env,
        provider=s.llm_provider,
        model_main=s.model_main,
        langsmith=ls,
    )
    yield
    log.info("locai-agent.shutdown")


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title="Locai Agent",
        version="1.0.0",
        docs_url="/docs" if s.app_env != "production" else None,
        lifespan=lifespan,
    )
    app.include_router(router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    s = get_settings()
    uvicorn.run("main:app", host=s.host, port=s.port, reload=s.app_env == "development")
