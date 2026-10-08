from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.config import settings
from app.database import init_db
from app.api.v1 import api_v1_router
from app.core.exceptions import (
    AgenticOSError,
    EntityNotFoundError,
    InvalidStateTransitionError,
    DependencyCycleError,
    SelfDependencyError,
    InvalidDependencyError,
)

from app.events.bus import get_event_bus
from app.ws.manager import ws_manager
from app.api.v1.ws import router as ws_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agentic_os")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in {settings.APP_ENV} mode...")
    await init_db()
    
    # Subscribe WebSocket manager to all EventBus domain events
    bus = get_event_bus()
    await bus.subscribe("*", ws_manager.handle_bus_event)
    logger.info("EventBus -> WebSocket gateway connected.")
    
    yield
    
    await bus.unsubscribe("*", ws_manager.handle_bus_event)
    logger.info("Shutting down Agentic OS...")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Agentic OS — Turn goals into autonomous actions.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Domain Exception Handlers
    @app.exception_handler(EntityNotFoundError)
    async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": exc.code, "message": exc.message, "entity_type": exc.entity_type, "entity_id": exc.entity_id}
        )

    @app.exception_handler(InvalidStateTransitionError)
    async def invalid_transition_handler(request: Request, exc: InvalidStateTransitionError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": exc.code,
                "message": exc.message,
                "entity_type": exc.entity_type,
                "current_state": exc.current_state,
                "requested_state": exc.requested_state,
                "allowed_states": exc.allowed_states,
            }
        )

    @app.exception_handler(DependencyCycleError)
    async def cycle_error_handler(request: Request, exc: DependencyCycleError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.code, "message": exc.message}
        )

    @app.exception_handler(SelfDependencyError)
    async def self_dep_handler(request: Request, exc: SelfDependencyError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.code, "message": exc.message, "task_id": exc.task_id}
        )

    @app.exception_handler(InvalidDependencyError)
    async def invalid_dep_handler(request: Request, exc: InvalidDependencyError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.code, "message": exc.message}
        )

    @app.exception_handler(AgenticOSError)
    async def domain_error_handler(request: Request, exc: AgenticOSError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": exc.code, "message": exc.message}
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Global unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "INTERNAL_ERROR", "message": str(exc) if settings.DEBUG else "An unexpected error occurred."}
        )

    # Routes
    app.include_router(api_v1_router, prefix="/api/v1")
    app.include_router(ws_router)

    # Root redirect / ping
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": "0.1.0",
            "status": "online",
            "docs_url": "/docs"
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
