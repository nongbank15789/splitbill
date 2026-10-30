from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_group_service
from app.models import User
from app.schemas import GroupDetailOut, GroupOut
from app.services import GroupService

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[GroupOut])
def list_groups(
    user: User = Depends(get_current_user),
    service: GroupService = Depends(get_group_service),
):
    return service.list_groups(user)


@router.get("/{group_id}", response_model=GroupDetailOut)
def get_group(
    group_id: int,
    user: User = Depends(get_current_user),
    service: GroupService = Depends(get_group_service),
):
    return service.get_group_for_member(user, group_id)