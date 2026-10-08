from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.schemas.approval import ApprovalResponse, ApprovalListResponse, ApprovalDecisionRequest
from app.models.enums import ApprovalStatus
from app.services.approval_service import ApprovalService

router = APIRouter(prefix="/approvals", tags=["Approvals & Human-in-the-Loop"])


@router.get("", response_model=ApprovalListResponse)
async def list_approvals(
    mission_id: Optional[str] = Query(None, description="Filter approvals by mission ID"),
    status: Optional[ApprovalStatus] = Query(None, description="Filter by approval status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    List approval requests with optional filtering and pagination.
    """
    items, total = await ApprovalService.list_approvals(
        session=db,
        mission_id=mission_id,
        status_filter=status,
        skip=skip,
        limit=limit,
    )
    return ApprovalListResponse(
        total=total,
        items=[ApprovalResponse.model_validate(item) for item in items],
    )


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(
    approval_id: str = Path(..., description="Approval ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve details of a specific approval request.
    """
    approval = await ApprovalService.get_approval(approval_id, db)
    return ApprovalResponse.model_validate(approval)


@router.post("/{approval_id}/approve")
async def approve_request(
    approval_id: str = Path(..., description="Approval ID"),
    body: Optional[ApprovalDecisionRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Approve a pending tool action. Verifies cryptographic integrity, re-evaluates security policies,
    executes the tool, and resumes the mission/task lifecycle.
    """
    decided_by = (body.decided_by if body and body.decided_by else "user_operator")
    decision_note = body.reason if body else None

    async with db.begin():
        result = await ApprovalService.approve_request(
            approval_id=approval_id,
            decided_by=decided_by,
            session=db,
            decision_note=decision_note,
        )
    return result


@router.post("/{approval_id}/deny", response_model=ApprovalResponse)
async def deny_request(
    approval_id: str = Path(..., description="Approval ID"),
    body: Optional[ApprovalDecisionRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Deny a pending tool action. Marks approval as DENIED, blocks execution, and fails the task safely.
    """
    decided_by = (body.decided_by if body and body.decided_by else "user_operator")
    reason = body.reason if body else "Denied by human operator"

    async with db.begin():
        approval = await ApprovalService.deny_request(
            approval_id=approval_id,
            decided_by=decided_by,
            reason=reason,
            session=db,
        )
    return ApprovalResponse.model_validate(approval)


@router.post("/{approval_id}/cancel", response_model=ApprovalResponse)
async def cancel_approval(
    approval_id: str = Path(..., description="Approval ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel an outstanding pending approval request.
    """
    async with db.begin():
        approval = await ApprovalService.cancel_approval(approval_id, db)
    return ApprovalResponse.model_validate(approval)
