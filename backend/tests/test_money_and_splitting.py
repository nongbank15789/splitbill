from decimal import Decimal

import pytest

from app.money import InvalidAmountError, parse_amount
from app.splitting import EqualSplit, ExactSplit, SharesMismatchError


def test_equal_split_100_among_three():
    shares = EqualSplit(["alice", "bob", "carol"]).calculate(Decimal("100.00"))
    assert shares == {
        "alice": Decimal("33.34"),
        "bob": Decimal("33.33"),
        "carol": Decimal("33.33"),
    }
    assert sum(shares.values()) == Decimal("100.00")


def test_exact_split_not_matching_amount_is_rejected():
    split = ExactSplit({"alice": Decimal("50.00"), "bob": Decimal("40.00")})
    with pytest.raises(SharesMismatchError):
        split.calculate(Decimal("100.00"))


def test_amount_with_three_decimals_is_rejected():
    with pytest.raises(InvalidAmountError):
        parse_amount("10.005")


@pytest.mark.parametrize("bad", ["0", "0.00", "-5.00", "abc", "NaN"])
def test_invalid_amounts_are_rejected(bad):
    with pytest.raises(InvalidAmountError):
        parse_amount(bad)


def test_valid_amount_is_accepted():
    assert parse_amount("1000.00") == Decimal("1000.00")