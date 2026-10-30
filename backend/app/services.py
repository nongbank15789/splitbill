from app.errors import NotFoundError, UnauthorizedError
from app.models import Group, User
from app.repositories import GroupRepository


class GroupService:
    """Business rules layer: decides who may do what."""

    def __init__(self, repo: GroupRepository):
        self._repo = repo

    def authenticate(self, username: str | None) -> User:
        if not username:
            raise UnauthorizedError("Missing X-User header")
        user = self._repo.get_user_by_username(username)
        if user is None:
            raise UnauthorizedError("Unknown user")
        return user

    def list_groups(self, user: User) -> list[Group]:
        return self._repo.list_groups_for_user(user.id)

    def get_group_for_member(self, user: User, group_id: int) -> Group:
        group = self._repo.get_group(group_id)
        # A missing group and a group the user does not belong to get the
        # same answer (404), so outsiders cannot tell which groups exist.
        if group is None or user.id not in {m.id for m in group.members}:
            raise NotFoundError("Group not found")
        return group
