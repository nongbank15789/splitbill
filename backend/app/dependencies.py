from collections.abc import Iterator

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.expense_repository import ExpenseRepository
from app.expense_service import ExpenseService
from app.models import User
from app.repositories import GroupRepository
from app.services import GroupService


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


def get_group_service(session: Session = Depends(get_session)) -> GroupService:
    return GroupService(GroupRepository(session))


def get_expense_service(
    session: Session = Depends(get_session),
    groups: GroupService = Depends(get_group_service),
) -> ExpenseService:
    return ExpenseService(groups, ExpenseRepository(session))


def get_current_user(
    x_user: str | None = Header(default=None),
    service: GroupService = Depends(get_group_service),
) -> User:
    return service.authenticate(x_user)
