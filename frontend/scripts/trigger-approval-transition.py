import os
import sys
import tempfile

# Determine paths portably
script_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
backend_dir = os.path.join(repo_root, "backend")
dev_db = os.path.abspath(os.path.join(backend_dir, "agentic_os.db"))

default_dst = os.path.join(tempfile.gettempdir(), "agentic_os_phase_d_isolated.db")
isolated_path = os.path.abspath(os.environ.get("PHASE_D_TEST_DB", default_dst))

# Hard Safety Gate: prevent execution if target resolves to development database
assert isolated_path != dev_db, f"CRITICAL ERROR: Destination cannot be development database {dev_db}!"
assert not isolated_path.endswith("backend/agentic_os.db") and not isolated_path.endswith("backend\\agentic_os.db"), \
    "CRITICAL ERROR: Destination cannot be backend/agentic_os.db!"

# Safety Gate: Set DATABASE_URL BEFORE any backend or SQLAlchemy imports
db_url = f"sqlite+aiosqlite:///{isolated_path.replace('\\', '/')}"
os.environ["DATABASE_URL"] = db_url

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import asyncio
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.task import Task
from app.models.mission import Mission
from app.models.enums import TaskStatus, MissionStatus, RiskLevel
from app.services.approval_service import ApprovalService
from app.core.state_machine import StateMachine
from sqlalchemy import select

# Strict assert: prevent any writes if configuration did not resolve to isolated database
assert dev_db.replace("\\", "/") not in settings.DATABASE_URL.replace("\\", "/"), \
    f"ABORT: DATABASE_URL resolved to development database {settings.DATABASE_URL}!"
assert isolated_path.replace("\\", "/") in settings.DATABASE_URL.replace("\\", "/"), \
    f"ABORT: DATABASE_URL {settings.DATABASE_URL} does not match isolated path {isolated_path}!"

async def trigger_approval():
    task_id = 'c1aa687a-3181-4c62-a720-632dcd7c4d90'
    async with AsyncSessionLocal() as session:
        stmt = select(Task).where(Task.id == task_id)
        res = await session.execute(stmt)
        task = res.scalar_one()

        stmt_m = select(Mission).where(Mission.id == task.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        # RUNNING -> WAITING_APPROVAL
        StateMachine.transition_task(task, TaskStatus.WAITING_APPROVAL)
        StateMachine.transition_mission(mission, MissionStatus.WAITING_APPROVAL)
        await session.flush()

        approval = await ApprovalService.create_approval(
            mission_id=mission.id,
            task_id=task.id,
            agent_id='agent_sec_01',
            agent_run_id='run_sec_01',
            tool_run_id='tool_sec_01',
            tool_name='verify_signatures',
            arguments={'signature_check': 'strict'},
            risk_level=RiskLevel.HIGH,
            reason='Manual confirmation required to bypass container signature check',
            session=session
        )
        await session.commit()
        print(f"APPROVAL_REQUESTED_OK:{approval.id}")

if __name__ == '__main__':
    asyncio.run(trigger_approval())
