from decimal import Decimal

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_expense_service
from app.expense_schemas import BalanceOut, BalancesOut
from app.expense_service import ExpenseService
from app.models import User

router = APIRouter(prefix="/groups/{group_id}/balances", tags=["balances"])


@router.get("", response_model=BalancesOut)
def get_balances(
    group_id: int,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service),
):
    group, balances = service.get_balances(user, group_id)
    return BalancesOut(
        group_id=group.id,
        balances=[BalanceOut(username=n, balance=b) for n, b in balances],
        total=sum((b for _, b in balances), Decimal("0.00")),
    )
