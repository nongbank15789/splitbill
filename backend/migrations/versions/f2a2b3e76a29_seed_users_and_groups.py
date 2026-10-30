"""seed users and groups

Revision ID: f2a2b3e76a29
Revises: c9c0bc218d9f
Create Date: 2026-10-30 16:53:34.196104

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2a2b3e76a29"
down_revision: Union[str, Sequence[str], None] = "c9c0bc218d9f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO users (id, username) VALUES "
        "(1, 'alice'), (2, 'bob'), (3, 'carol'), (4, 'dan')"
    )
    op.execute(
        'INSERT INTO "groups" (id, name) VALUES '
        "(1, 'Chiang Mai trip'), (2, 'Office lunch')"
    )
    op.execute(
        "INSERT INTO group_members (group_id, user_id) VALUES "
        "(1, 1), (1, 2), (1, 3), (2, 2), (2, 4)"
    )
    # เลื่อนตัวนับ id ให้ต่อจากที่ใส่เอง ไม่งั้นแถวใหม่จะชน id เดิม
    op.execute("SELECT setval(pg_get_serial_sequence('users', 'id'), 4)")
    op.execute("SELECT setval(pg_get_serial_sequence('\"groups\"', 'id'), 2)")


def downgrade() -> None:
    op.execute("DELETE FROM group_members WHERE group_id IN (1, 2)")
    op.execute('DELETE FROM "groups" WHERE id IN (1, 2)')
    op.execute("DELETE FROM users WHERE username IN ('alice', 'bob', 'carol', 'dan')")
