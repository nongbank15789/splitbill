from decimal import Decimal

from app.errors import InvalidRequestError
from app.expense_repository import ExpenseRepository
from app.expense_schemas import EqualSplitIn, ExpenseCreate
from app.models import Expense, ExpenseShare, User
from app.money import TWO_PLACES, InvalidAmountError, parse_amount
from app.services import GroupService
from app.splitting import EqualSplit, ExactSplit, SplitError, SplitStrategy


class ExpenseService:
    """Business rules for recording expenses."""

    def __init__(self, groups: GroupService, repo: ExpenseRepository):
        self._groups = groups
        self._repo = repo

    def create_expense(
        self,
        user: User,
        group_id: int,
        data: ExpenseCreate,
        idempotency_key: str | None,
    ) -> Expense:
        group = self._groups.get_group_for_member(user, group_id)
        members = {m.username: m for m in group.members}

        try:
            amount = parse_amount(data.amount)
        except InvalidAmountError as error:
            raise InvalidRequestError(str(error))

        if data.paid_by not in members:
            raise InvalidRequestError("The payer is not a member of this group")

        shares = self._calculate_shares(members, amount, data.split)

        expense = Expense(
            group_id=group.id,
            paid_by_id=members[data.paid_by].id,
            description=data.description,
            amount=amount,
            split_type=data.split.type,
            idempotency_key=idempotency_key,
            shares=[
                ExpenseShare(
                    user_id=members[name].id, amount=share.quantize(TWO_PLACES)
                )
                for name, share in shares.items()
            ],
        )
        return self._repo.save(expense)

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
                    raise InvalidRequestError(f"Share of {name}: {error}")
            strategy = ExactSplit(parsed)

        try:
            return strategy.calculate(amount)
        except SplitError as error:
            raise InvalidRequestError(str(error))

    @staticmethod
    def _ensure_members(names: list[str], members) -> None:
        unknown = [n for n in names if n not in members]
        if unknown:
            raise InvalidRequestError(
                f"Not a member of this group: {', '.join(unknown)}"
            )