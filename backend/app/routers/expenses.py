from fastapi import APIRouter, Depends, Header

from app.dependencies import get_current_user, get_expense_service
from app.expense_schemas import ExpenseCreate, ExpenseOut
from app.expense_service import ExpenseService
from app.models import User

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(
    group_id: int,
    data: ExpenseCreate,
    idempotency_key: str | None = Header(default=None),
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service),
):
    expense = service.create_expense(user, group_id, data, idempotency_key)
    return ExpenseOut.from_model(expense)