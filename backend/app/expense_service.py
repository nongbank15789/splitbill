from decimal import Decimal

from app.errors import ForbiddenError, InvalidRequestError, NotFoundError
from app.expense_repository import DuplicateExpenseError, ExpenseRepository
from app.expense_schemas import EqualSplitIn, ExpenseCreate
from app.models import Expense, ExpenseShare, Group, User
from app.money import TWO_PLACES, InvalidAmountError, parse_amount
from app.services import GroupService
from app.splitting import EqualSplit, ExactSplit, SplitError, SplitStrategy

ZERO = Decimal("0.00")


class ExpenseService:
    """Business rules for recording, listing and deleting expenses."""

    def __init__(self, groups: GroupService, repo: ExpenseRepository):
        self._groups = groups
        self._repo = repo

    def create_expense(
        self,
        user: User,
        group_id: int,
        data: ExpenseCreate,
        idempotency_key: str | None,
    ) -> tuple[Expense, bool]:
        """Return (expense, created). created is False for an idempotent replay."""
        group = self._groups.get_group_for_member(user, group_id)
        key = (idempotency_key or "").strip() or None

        if key:
            existing = self._repo.find_by_idempotency_key(group.id, key)
            if existing is not None:
                return existing, False

        members = {m.username: m for m in group.members}

        try:
            amount = parse_amount(data.amount)
        except InvalidAmountError as error:
            raise InvalidRequestError(str(error)) from None

        if data.paid_by not in members:
            raise InvalidRequestError("The payer is not a member of this group")

        shares = self._calculate_shares(members, amount, data.split)

        expense = Expense(
            group_id=group.id,
            paid_by_id=members[data.paid_by].id,
            description=data.description,
            amount=amount,
            split_type=data.split.type,
            idempotency_key=key,
            shares=[
                ExpenseShare(
                    user_id=members[name].id, amount=share.quantize(TWO_PLACES)
                )
                for name, share in shares.items()
            ],
        )
        try:
            return self._repo.add(expense), True
        except DuplicateExpenseError:
            # Lost a race against a concurrent request with the same key.
            winner = self._repo.find_by_idempotency_key(group.id, key)
            return winner, False

    def list_expenses(self, user: User, group_id: int) -> list[Expense]:
        group = self._groups.get_group_for_member(user, group_id)
        return self._repo.list_active(group.id)

    def delete_expense(self, user: User, group_id: int, expense_id: int) -> None:
        group = self._groups.get_group_for_member(user, group_id)
        expense = self._repo.get_active(group.id, expense_id)
        if expense is None:
            raise NotFoundError("Expense not found")
        if expense.paid_by_id != user.id:
            raise ForbiddenError("Only the payer can delete this expense")
        self._repo.soft_delete(expense)

    def get_balances(
        self, user: User, group_id: int
    ) -> tuple[Group, list[tuple[str, Decimal]]]:
        group = self._groups.get_group_for_member(user, group_id)
        paid = self._repo.total_paid_by_user(group.id)
        owed = self._repo.total_owed_by_user(group.id)
        balances = [
            (
                m.username,
                (paid.get(m.id, ZERO) - owed.get(m.id, ZERO)).quantize(TWO_PLACES),
            )
            for m in group.members
        ]
        return group, balances

    def _calculate_shares(self, members, amount: Decimal, split) -> dict[str, Decimal]:
        strategy: SplitStrategy
        if isinstance(split, EqualSplitIn):
            names = split.members
            if len(set(names)) != len(names):
                raise InvalidRequestError("Split members must not repeat")
            self._ensure_members(names, members)
            strategy = EqualSplit(names)
        else:
            self._ensure_members(list(split.shares), members)
            parsed: dict[str, Decimal] = {}
            for name, text in split.shares.items():
                try:
                    parsed[name] = parse_amount(text)
                except InvalidAmountError as error:
                    raise InvalidRequestError(f"Share of {name}: {error}") from None
            strategy = ExactSplit(parsed)

        try:
            return strategy.calculate(amount)
        except SplitError as error:
            raise InvalidRequestError(str(error)) from None

    @staticmethod
    def _ensure_members(names: list[str], members) -> None:
        unknown = [n for n in names if n not in members]
        if unknown:
            raise InvalidRequestError(
                f"Not a member of this group: {', '.join(unknown)}"
            )
