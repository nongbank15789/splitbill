from fastapi import APIRouter, Depends, Header, Response

from app.dependencies import get_current_user, get_expense_service
from app.expense_schemas import ExpenseCreate, ExpenseOut
from app.expense_service import ExpenseService
from app.models import User

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(
    group_id: int,
    data: ExpenseCreate,
    response: Response,
    idempotency_key: str | None = Header(default=None),
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service),
):
    expense, created = service.create_expense(user, group_id, data, idempotency_key)
    if not created:
        response.status_code = 200  # replay of an earlier request
    return ExpenseOut.from_model(expense)


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    group_id: int,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service),
):
    return [ExpenseOut.from_model(e) for e in service.list_expenses(user, group_id)]


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    group_id: int,
    expense_id: int,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service),
):
    service.delete_expense(user, group_id, expense_id)
    return Response(status_code=204)
