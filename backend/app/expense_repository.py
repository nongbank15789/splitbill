from sqlalchemy.orm import Session

from app.models import Expense


class ExpenseRepository:
    """Data access for expenses: no business rules here."""

    def __init__(self, session: Session):
        self._session = session

    def save(self, expense: Expense) -> Expense:
        self._session.add(expense)
        self._session.commit()
        self._session.refresh(expense)
        return expense