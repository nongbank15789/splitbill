from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, StringConstraints

from app.models import Expense

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class EqualSplitIn(BaseModel):
    type: Literal["equal"]
    members: list[Text] = Field(min_length=1)


class ExactSplitIn(BaseModel):
    type: Literal["exact"]
    shares: dict[Text, str] = Field(min_length=1)


class ExpenseCreate(BaseModel):
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)
    ]
    paid_by: Text
    amount: str  # money travels as a string, never as a float
    split: Annotated[Union[EqualSplitIn, ExactSplitIn], Field(discriminator="type")]


class ShareOut(BaseModel):
    username: str
    amount: Decimal


class ExpenseOut(BaseModel):
    id: int
    group_id: int
    description: str
    paid_by: str
    amount: Decimal
    split_type: str
    created_at: datetime
    shares: list[ShareOut]

    @classmethod
    def from_model(cls, expense: Expense) -> "ExpenseOut":
        return cls(
            id=expense.id,
            group_id=expense.group_id,
            description=expense.description,
            paid_by=expense.payer.username,
            amount=expense.amount,
            split_type=expense.split_type,
            created_at=expense.created_at,
            shares=[
                ShareOut(username=s.user.username, amount=s.amount)
                for s in expense.shares
            ],
        )