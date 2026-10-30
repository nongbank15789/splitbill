from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Group, User, group_members


class GroupRepository:
    """Data access layer: only database reads/writes, no business rules."""

    def __init__(self, session: Session):
        self._session = session

    def get_user_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username)
        return self._session.scalars(stmt).first()

    def list_groups_for_user(self, user_id: int) -> list[Group]:
        stmt = (
            select(Group)
            .join(group_members, group_members.c.group_id == Group.id)
            .where(group_members.c.user_id == user_id)
            .order_by(Group.id)
        )
        return list(self._session.scalars(stmt))

    def get_group(self, group_id: int) -> Group | None:
        return self._session.get(Group, group_id)