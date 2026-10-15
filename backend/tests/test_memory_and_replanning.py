import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.enums import (
    MemoryType,
    MemorySource,
    FailureCategory,
    Recoverability,
    ReplanStrategy,
    MissionStatus,
    TaskStatus,
    EventType,
    AgentType,
)
from app.models.memory import Memory
from app.models.mission import Mission
from app.models.task import Task
from app.models.plan_revision import PlanRevision
from app.schemas.memory import MemoryCreate, MemoryUpdate
from app.schemas.mission import MissionCreate
from app.schemas.task import TaskCreate, TaskResultSubmission, TaskFailureSubmission
from app.services.memory_service import MemoryService
from app.services.mission_service import MissionService
from app.services.task_service import TaskService
from app.services.dag_service import DAGService
from app.core.dag_engine import DAGEngine
from app.runtime.context_builder import ContextBuilder
from app.runtime.failure_analyzer import FailureAnalyzer
from app.runtime.replanning_engine import ReplanningEngine
from app.memory.embeddings.mock_provider import MockEmbeddingProvider, cosine_similarity


@pytest.mark.asyncio
async def test_working_and_episodic_memory_lifecycle(db_session: AsyncSession):
    """Test working and episodic memory creation, retrieval, and importance."""
    # 1. Create working memory
    wm = await MemoryService.create_memory(
        MemoryCreate(
            user_id="user_123",
            memory_type=MemoryType.WORKING,
            source=MemorySource.AGENT_DECISION,
            content="Active task is currently inspecting package.json for missing scripts",
            importance=3,
            mission_id="m_test_1",
        ),
        session=db_session,
    )
    assert wm.id is not None
    assert wm.memory_type == MemoryType.WORKING

    # 2. Ingest meaningful episodic failure experience
    ep = await MemoryService.extract_and_ingest_meaningful(
        source=MemorySource.TASK_FAILURE,
        content="npm build failed: cannot find module 'next/font'. Resolved by installing @next/font package.",
        user_id="user_123",
        session=db_session,
        mission_id="m_test_1",
        importance=5,
    )
    assert ep is not None
    assert ep.memory_type == MemoryType.EPISODIC
    assert ep.embedding is not None  # Automatically embedded

    # 3. List memories scoped to user_123
    mems, count = await MemoryService.list_memories(
        session=db_session,
        user_id="user_123",
        mission_id="m_test_1",
    )
    assert count == 2
    assert len(mems) == 2


@pytest.mark.asyncio
async def test_semantic_memory_multi_factor_ranking_and_user_isolation(db_session: AsyncSession):
    """
    Test semantic search with multi-factor relevance scoring and strict multi-tenant user isolation.
    """
    # Create memories for user_alice
    await MemoryService.create_memory(
        MemoryCreate(
            user_id="user_alice",
            memory_type=MemoryType.SEMANTIC,
            source=MemorySource.TASK_RESULT,
            content="Tailwind CSS setup requires postcss and autoprefixer installed in devDependencies",
            importance=5,
        ),
        session=db_session,
    )

    await MemoryService.create_memory(
        MemoryCreate(
            user_id="user_alice",
            memory_type=MemoryType.SEMANTIC,
            source=MemorySource.TASK_RESULT,
            content="Database connections should use async engine pool with max overflow 10",
            importance=2,
        ),
        session=db_session,
    )

    # Create secret memory for user_bob
    await MemoryService.create_memory(
        MemoryCreate(
            user_id="user_bob",
            memory_type=MemoryType.SEMANTIC,
            source=MemorySource.TASK_RESULT,
            content="Bob's private API credentials and proprietary deployment recipe for Tailwind CSS",
            importance=5,
        ),
        session=db_session,
    )

    # 1. Search as Alice
    alice_results = await MemoryService.retrieve_relevant(
        query="How to configure Tailwind CSS dependencies",
        user_id="user_alice",
        session=db_session,
        limit=5,
    )
    assert len(alice_results) >= 1
    top_alice = alice_results[0]
    assert "Tailwind CSS setup requires postcss" in top_alice.memory.content
    assert top_alice.relevance_score > 0.3

    # 2. Strict Privacy Check: Alice must NEVER see Bob's memories
    for res in alice_results:
        assert res.memory.user_id == "user_alice"
        assert "Bob's private" not in res.memory.content

    # 3. Search as Bob
    bob_results = await MemoryService.retrieve_relevant(
        query="Tailwind CSS deployment",
        user_id="user_bob",
        session=db_session,
        limit=5,
    )
    assert len(bob_results) == 1
    assert bob_results[0].memory.user_id == "user_bob"


@pytest.mark.asyncio
async def test_context_builder_bounded_synthesis(db_session: AsyncSession):
    """Test ContextBuilder synthesizing task state, working memory, past experiences, and recent failures."""
    mission = await MissionService.create_mission(
        MissionCreate(title="Portfolio Website Mission", description="Build modern portfolio site"),
        session=db_session,
    )
    task = await TaskService.create_task(
        mission_id=mission.id,
        data=TaskCreate(
            title="Setup styling",
            description="Install Tailwind CSS and configure tailwind.config.js",
            priority=2,
            assigned_agent_id="CODER",
        ),
        session=db_session,
    )

    # Add past experience memory
    await MemoryService.create_memory(
        MemoryCreate(
            user_id="default_operator",
            memory_type=MemoryType.EPISODIC,
            source=MemorySource.TASK_FAILURE,
            content="Tailwind setup on Next 14 requires tailwindcss @tailwindcss/typography",
            importance=4,
            mission_id=mission.id,
        ),
        session=db_session,
    )

    # Build context
    ctx = await ContextBuilder.build_context(
        task=task,
        mission=mission,
        user_id="default_operator",
        session=db_session,
    )

    assert ctx["mission"]["id"] == mission.id
    assert ctx["task"]["id"] == task.id
    assert len(ctx["episodic_memory"]) >= 1
    assert "Tailwind" in ctx["episodic_memory"][0]["content"]


@pytest.mark.asyncio
async def test_failure_analyzer_classification_rules(db_session: AsyncSession):
    """Test FailureAnalyzer deterministic classification across categories."""
    mission = await MissionService.create_mission(
        MissionCreate(title="Test Analysis", description="Analyzing errors"),
        session=db_session,
    )
    task = await TaskService.create_task(
        mission_id=mission.id,
        data=TaskCreate(title="Compile Assets", description="Run build script", priority=2),
        session=db_session,
    )

    # 1. Dependency failure
    dep_analysis = await FailureAnalyzer.analyze(
        task=task,
        error_message="Error: Cannot find module 'autoprefixer'",
        session=db_session,
        mission_id=mission.id,
    )
    assert dep_analysis.category == FailureCategory.DEPENDENCY_FAILURE
    assert dep_analysis.suggested_action == ReplanStrategy.CREATE_RECOVERY_TASK

    # 2. Permission denied
    perm_analysis = await FailureAnalyzer.analyze(
        task=task,
        error_message="Permission denied by security policy for terminal.execute",
        session=db_session,
        mission_id=mission.id,
    )
    assert perm_analysis.category == FailureCategory.PERMISSION_DENIED
    assert perm_analysis.suggested_action == ReplanStrategy.MODIFY_PLAN

    # 3. Timeout failure
    timeout_analysis = await FailureAnalyzer.analyze(
        task=task,
        error_message="Command execution timed out after 30000ms",
        session=db_session,
        mission_id=mission.id,
    )
    assert timeout_analysis.category == FailureCategory.TIMEOUT
    assert timeout_analysis.suggested_action == ReplanStrategy.RETRY


@pytest.mark.asyncio
async def test_replanning_engine_dynamic_dag_modification_and_versioning(db_session: AsyncSession):
    """
    Test ReplanningEngine injecting recovery tasks, dynamically modifying the DAG,
    and recording plan revisions without destroying task history.
    """
    # 1. Create a 3-task pipeline: A -> B -> C
    mission = await MissionService.create_mission(
        MissionCreate(title="DAG Replan Mission", description="Testing recovery insertion"),
        session=db_session,
    )
    task_a = await TaskService.create_task(
        mission_id=mission.id,
        data=TaskCreate(title="Task A: Scaffold", description="Initial scaffolding", priority=2),
        session=db_session,
    )
    task_b = await TaskService.create_task(
        mission_id=mission.id,
        data=TaskCreate(title="Task B: Build", description="Run production build", priority=2, dependencies=[task_a.id]),
        session=db_session,
    )
    task_c = await TaskService.create_task(
        mission_id=mission.id,
        data=TaskCreate(title="Task C: Deploy", description="Deploy to hosting", priority=2, dependencies=[task_b.id]),
        session=db_session,
    )

    # Start mission
    await MissionService.start_mission(mission.id, db_session)

    # Complete Task A
    await TaskService.start_task(task_a.id, db_session)
    await TaskService.complete_task(task_a.id, TaskResultSubmission(output_data={"status": "scaffolded"}), db_session)

    # Reload Task B to verify unlocked to READY
    tb_reloaded = await TaskService.get_task(task_b.id, db_session)
    assert tb_reloaded.status == TaskStatus.READY

    # Start Task B and simulate failure
    await TaskService.start_task(task_b.id, db_session)
    await TaskService.fail_task(task_b.id, TaskFailureSubmission(error_message="missing dependency: sharp", retry=False), db_session)

    assert mission.plan_version == 1
    assert mission.replan_count == 0

    # 2. Run Failure Analysis on Task B
    analysis = await FailureAnalyzer.analyze(
        task=task_b,
        error_message="npm ERR! missing dependency: sharp",
        session=db_session,
        mission_id=mission.id,
    )
    assert analysis.category == FailureCategory.DEPENDENCY_FAILURE

    # 3. ReplanningEngine generates recovery task and dynamically updates DAG
    replan_dec = await ReplanningEngine.replan(
        mission_id=mission.id,
        failed_task_id=task_b.id,
        failure_analysis=analysis,
        session=db_session,
        user_id="default_operator",
    )

    assert replan_dec.action == "create_recovery_task"
    assert mission.plan_version == 2
    assert mission.replan_count == 1

    # 4. Verify PlanRevision was recorded
    rev_stmt = select(PlanRevision).where(PlanRevision.mission_id == mission.id)
    rev_res = await db_session.execute(rev_stmt)
    revisions = rev_res.scalars().all()
    assert len(revisions) == 1
    assert revisions[0].version == 2
    assert revisions[0].parent_version == 1
    assert "sharp" in revisions[0].reason

    # Verify snapshot captured post-replan tasks AND true pre-mutation parent plan
    snap = revisions[0].plan_snapshot
    assert snap["version"] == 2
    assert len(snap["tasks"]) == 4  # Post-replan tasks: A, B, C, and Recovery Task

    assert "previous_plan" in snap
    prev_plan = snap["previous_plan"]
    assert prev_plan["version"] == 1
    assert len(prev_plan["tasks"]) == 3  # Pre-replan parent tasks: A, B, C
    prev_task_ids = {pt["id"] for pt in prev_plan["tasks"]}
    assert prev_task_ids == {task_a.id, task_b.id, task_c.id}
    # In parent plan, task_b only depended on task_a, NOT on recovery task
    prev_b = next(pt for pt in prev_plan["tasks"] if pt["id"] == task_b.id)
    assert prev_b["dependencies"] == [task_a.id]

    # 5. Verify DAG Structure: Recovery Task X is READY, Task B is PENDING depending on X
    tasks = await TaskService.list_mission_tasks(mission.id, db_session)
    assert len(tasks) == 4  # A, B, C, and Recovery Task

    recovery_task = [t for t in tasks if "Fix & Recover" in t.title][0]
    assert recovery_task.status == TaskStatus.READY

    # Task B depends on Recovery Task
    tb_updated = await TaskService.get_task(task_b.id, db_session)
    assert recovery_task.id in tb_updated.dependencies
    assert tb_updated.status == TaskStatus.PENDING

    # 6. Verify DAG remains strictly acyclic
    all_t, all_deps = await DAGService.get_mission_tasks_and_dependencies(mission.id, db_session)
    assert DAGEngine.detect_cycles({t.id for t in all_t}, all_deps) is False


@pytest.mark.asyncio
async def test_anti_loop_threshold_enforcement(db_session: AsyncSession):
    """
    Test that excessive replans trigger anti-loop guards, pausing the mission for human intervention.
    """
    mission = await MissionService.create_mission(
        MissionCreate(title="Loop Mission", description="Testing anti-loop boundaries"),
        session=db_session,
    )
    task = await TaskService.create_task(
        mission_id=mission.id,
        data=TaskCreate(title="Failing Task", description="Keeps failing", priority=2),
        session=db_session,
    )

    # Set replan count right at limit (5)
    mission.replan_count = 5

    analysis = await FailureAnalyzer.analyze(
        task=task,
        error_message="Repeated unresolvable error",
        session=db_session,
        mission_id=mission.id,
    )

    # Replan should abort / request human
    decision = await ReplanningEngine.replan(
        mission_id=mission.id,
        failed_task_id=task.id,
        failure_analysis=analysis,
        session=db_session,
        user_id="default_operator",
    )

    assert decision.action == "request_human"
    assert decision.strategy == ReplanStrategy.REQUEST_HUMAN
    assert mission.status == MissionStatus.WAITING_APPROVAL


@pytest.mark.asyncio
async def test_end_to_end_failure_memory_replan_recovery_continuation(db_session: AsyncSession):
    """
    Complete end-to-end demonstration:
    A -> B -> C
    Task B fails due to missing package 'sharp'.
    FailureAnalyzer classifies dependency failure -> Memory extracted -> ReplanningEngine creates Recovery Task X.
    Recovery Task X is executed & completed -> Task B unlocks & retries -> Task B completes -> Task C unlocks & completes.
    Mission reaches COMPLETED state.
    """
    # 1. Create pipeline: Task A -> Task B -> Task C
    mission = await MissionService.create_mission(
        MissionCreate(title="E2E Recovery Mission", description="Full recovery execution lifecycle"),
        session=db_session,
    )
    t_a = await TaskService.create_task(
        mission.id,
        TaskCreate(title="Scaffold App", description="Init repository", priority=2),
        session=db_session,
    )
    t_b = await TaskService.create_task(
        mission.id,
        TaskCreate(title="Build Next.js", description="Compile application", priority=2, dependencies=[t_a.id]),
        session=db_session,
    )
    t_c = await TaskService.create_task(
        mission.id,
        TaskCreate(title="Publish Output", description="Upload artifacts", priority=2, dependencies=[t_b.id]),
        session=db_session,
    )

    await MissionService.start_mission(mission.id, db_session)

    # Complete Task A
    await TaskService.start_task(t_a.id, db_session)
    await TaskService.complete_task(t_a.id, TaskResultSubmission(output_data={"scaffold": "ok"}), db_session)

    # Task B starts and fails
    await TaskService.start_task(t_b.id, db_session)
    await TaskService.fail_task(
        t_b.id,
        TaskFailureSubmission(error_message="Cannot find module 'sharp'", retry=False),
        session=db_session,
    )

    # 2. Analyze failure and execute autonomous replan
    analysis = await FailureAnalyzer.analyze(t_b, "Cannot find module 'sharp'", db_session, mission.id)
    replan = await ReplanningEngine.replan(mission.id, t_b.id, analysis, db_session)

    # 3. Find newly created recovery task X
    all_tasks = await TaskService.list_mission_tasks(mission.id, db_session)
    recovery_task = [t for t in all_tasks if "Fix & Recover" in t.title][0]
    assert recovery_task.status == TaskStatus.READY

    # 4. Execute and Complete Recovery Task X
    await TaskService.start_task(recovery_task.id, db_session)
    await TaskService.complete_task(
        recovery_task.id,
        TaskResultSubmission(output_data={"installed": "sharp"}),
        session=db_session,
    )

    # Task B should now be unlocked to READY
    tb_now = await TaskService.get_task(t_b.id, db_session)
    assert tb_now.status == TaskStatus.READY

    # 5. Retry and Complete Task B
    await TaskService.start_task(t_b.id, db_session)
    await TaskService.complete_task(
        t_b.id,
        TaskResultSubmission(output_data={"build": "success"}),
        session=db_session,
    )

    # Task C should now be unlocked to READY
    tc_now = await TaskService.get_task(t_c.id, db_session)
    assert tc_now.status == TaskStatus.READY

    # 6. Execute and Complete Task C
    await TaskService.start_task(t_c.id, db_session)
    await TaskService.complete_task(
        t_c.id,
        TaskResultSubmission(output_data={"published": True}),
        session=db_session,
    )

    # Mission should now be COMPLETED
    mission_final = await MissionService.get_mission(mission.id, db_session)
    assert mission_final.status == MissionStatus.COMPLETED
    assert mission_final.progress == 100.0


@pytest.mark.asyncio
async def test_memory_and_replanning_rest_apis(client: AsyncClient):
    """Test Memory REST endpoints and Mission replan endpoints."""
    # 1. Create a memory via API
    mem_resp = await client.post(
        "/api/v1/memory",
        json={
            "user_id": "api_user",
            "memory_type": "SEMANTIC",
            "source": "MANUAL",
            "content": "Next.js App Router uses Server Components by default",
            "importance": 4,
        },
    )
    assert mem_resp.status_code == 201
    mem_id = mem_resp.json()["id"]

    # 2. Retrieve memory by ID
    get_resp = await client.get(f"/api/v1/memory/{mem_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["content"] == "Next.js App Router uses Server Components by default"

    # 3. List memories
    list_resp = await client.get("/api/v1/memory?user_id=api_user")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # 4. Semantic search
    search_resp = await client.post(
        "/api/v1/memory/search",
        json={"query": "Server Components in Next.js", "user_id": "api_user", "limit": 3},
    )
    assert search_resp.status_code == 200
    search_results = search_resp.json()
    assert len(search_results) >= 1
    assert search_results[0]["relevance_score"] > 0.3


@pytest.mark.asyncio
async def test_embedding_provider_factory_and_production_providers():
    """Verify production embedding providers and factory error handling when unconfigured."""
    from app.memory.embeddings.factory import get_embedding_provider, set_embedding_provider, reset_embedding_provider
    from app.memory.embeddings.mock_provider import MockEmbeddingProvider
    from app.memory.embeddings.openai_provider import OpenAIEmbeddingProvider
    from app.memory.embeddings.gemini_provider import GeminiEmbeddingProvider
    from app.memory.embeddings.ollama_provider import OllamaEmbeddingProvider
    from app.core.exceptions import AgenticOSError
    from app.config import settings

    # 1. Default fallback is mock in test environment
    reset_embedding_provider()
    provider = get_embedding_provider()
    assert isinstance(provider, MockEmbeddingProvider)

    # 2. Production OpenAI provider raises when API key missing
    with pytest.raises(AgenticOSError, match="OPENAI_API_KEY is required"):
        OpenAIEmbeddingProvider(api_key="")

    # 3. Production Gemini provider raises when API key missing
    with pytest.raises(AgenticOSError, match="GEMINI_API_KEY is required"):
        GeminiEmbeddingProvider(api_key="")

    # 4. Ollama provider initializes with configured endpoint
    ollama = OllamaEmbeddingProvider(base_url="http://localhost:11434", model="nomic-embed-text")
    assert ollama.base_url == "http://localhost:11434"
    assert ollama.model == "nomic-embed-text"

    # Reset back to mock for other tests
    reset_embedding_provider()


@pytest.mark.asyncio
async def test_memory_tenant_isolation_get_and_delete(db_session: AsyncSession, client: AsyncClient):
    """Verify strict tenant isolation on get and delete operations."""
    from app.core.exceptions import EntityNotFoundError

    # Create memory for User Alpha
    mem_a = await MemoryService.create_memory(
        MemoryCreate(
            user_id="user_alpha",
            memory_type=MemoryType.SEMANTIC,
            source=MemorySource.MANUAL,
            content="Alpha private secret key or design",
            importance=5,
        ),
        session=db_session,
    )

    # 1. Alpha can access
    got = await MemoryService.get_memory(mem_a.id, session=db_session, user_id="user_alpha")
    assert got.id == mem_a.id

    # 2. Beta cannot access Alpha's memory (raises EntityNotFoundError)
    with pytest.raises(EntityNotFoundError):
        await MemoryService.get_memory(mem_a.id, session=db_session, user_id="user_beta")

    # 3. Beta cannot delete Alpha's memory
    with pytest.raises(EntityNotFoundError):
        await MemoryService.delete_memory(mem_a.id, session=db_session, user_id="user_beta")

    # 4. Alpha can delete
    await MemoryService.delete_memory(mem_a.id, session=db_session, user_id="user_alpha")


@pytest.mark.asyncio
async def test_vector_type_dialect_compatibility():
    """Verify VectorType compiles correctly across PostgreSQL (pgvector) and SQLite (JSON)."""
    from app.models.memory import VectorType
    from sqlalchemy.dialects import postgresql, sqlite
    import pgvector.sqlalchemy

    vtype = VectorType(dim=1536)

    # 1. Test load_dialect_impl on postgresql dialect
    pg_dialect = postgresql.dialect()
    pg_impl = vtype.load_dialect_impl(pg_dialect)
    assert isinstance(pg_impl, pgvector.sqlalchemy.Vector) or hasattr(pg_impl, "dim")
    assert pg_impl.dim == 1536

    # 2. Test load_dialect_impl on sqlite dialect
    sqlite_dialect = sqlite.dialect()
    sqlite_impl = vtype.load_dialect_impl(sqlite_dialect)
    assert "json" in str(type(sqlite_impl)).lower() or "json" in str(sqlite_impl).lower()

