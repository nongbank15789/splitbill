from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import Expense, ExpenseShare


class DuplicateExpenseError(Exception):
    """An expense with the same idempotency key already exists in the group."""


class ExpenseRepository:
    """Data access for expenses: no business rules here."""

    def __init__(self, session: Session):
        self._session = session

    def add(self, expense: Expense) -> Expense:
        key = expense.idempotency_key
        group_id = expense.group_id
        self._session.add(expense)
        try:
            self._session.commit()
        except IntegrityError:
            self._session.rollback()
            # The database enforces uniqueness, so this also holds when two
            # requests with the same key arrive at the same time.
            if key is not None and self.find_by_idempotency_key(group_id, key):
                raise DuplicateExpenseError() from None
            raise
        self._session.refresh(expense)
        return expense

    def find_by_idempotency_key(self, group_id: int, key: str) -> Expense | None:
        stmt = select(Expense).where(
            Expense.group_id == group_id, Expense.idempotency_key == key
        )
        return self._session.scalars(stmt).first()

    def list_active(self, group_id: int) -> list[Expense]:
        stmt = (
            select(Expense)
            .where(Expense.group_id == group_id, Expense.is_deleted.is_(False))
            .options(
                joinedload(Expense.payer),
                selectinload(Expense.shares).joinedload(ExpenseShare.user),
            )
            .order_by(Expense.created_at.desc(), Expense.id.desc())
        )
        return list(self._session.scalars(stmt))

    def get_active(self, group_id: int, expense_id: int) -> Expense | None:
        stmt = select(Expense).where(
            Expense.id == expense_id,
            Expense.group_id == group_id,
            Expense.is_deleted.is_(False),
        )
        return self._session.scalars(stmt).first()

    def soft_delete(self, expense: Expense) -> None:
        expense.is_deleted = True
        expense.deleted_at = datetime.now(UTC)
        self._session.commit()

    def total_paid_by_user(self, group_id: int) -> dict[int, Decimal]:
        stmt = (
            select(Expense.paid_by_id, func.sum(Expense.amount))
            .where(Expense.group_id == group_id, Expense.is_deleted.is_(False))
            .group_by(Expense.paid_by_id)
        )
        return {user_id: total for user_id, total in self._session.execute(stmt)}

    def total_owed_by_user(self, group_id: int) -> dict[int, Decimal]:
        stmt = (
            select(ExpenseShare.user_id, func.sum(ExpenseShare.amount))
            .join(Expense, Expense.id == ExpenseShare.expense_id)
            .where(Expense.group_id == group_id, Expense.is_deleted.is_(False))
            .group_by(ExpenseShare.user_id)
        )
        return {user_id: total for user_id, total in self._session.execute(stmt)}
