from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.missions import router as missions_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.dag import router as dag_router
from app.api.v1.agents import router as agents_router
from app.api.v1.tools import router as tools_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.events import router as events_router
from app.api.v1.memory import router as memory_router
from app.api.v1.ws import router as ws_router
from app.api.v1.demo import router as demo_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(missions_router)
api_v1_router.include_router(tasks_router)
api_v1_router.include_router(dag_router)
api_v1_router.include_router(agents_router)
api_v1_router.include_router(tools_router)
api_v1_router.include_router(approvals_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(memory_router)
api_v1_router.include_router(ws_router)
api_v1_router.include_router(demo_router)
