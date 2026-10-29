from abc import ABC, abstractmethod
from decimal import Decimal

TWO_PLACES = Decimal("0.01")


class SplitError(ValueError):
    """Error แม่ของทุกปัญหาเรื่องการแบ่งเงิน"""


class SharesMismatchError(SplitError):
    """ส่วนแบ่งรวมไม่เท่ากับยอดทั้งหมด"""


class SplitStrategy(ABC):
    """แม่แบบ: ทุกวิธีแบ่งเงินต้องมี calculate()"""

    @abstractmethod
    def calculate(self, amount: Decimal) -> dict[str, Decimal]:
        ...


class EqualSplit(SplitStrategy):
    """แบ่งเท่ากัน สตางค์ที่เหลือให้คนแรกๆ ตามลำดับ"""

    def __init__(self, members: list[str]):
        self._members = members

    def calculate(self, amount: Decimal) -> dict[str, Decimal]:
        total_satang = int(amount * 100)
        base, remainder = divmod(total_satang, len(self._members))
        shares = {}
        for index, member in enumerate(self._members):
            satang = base + (1 if index < remainder else 0)
            shares[member] = (Decimal(satang) / 100).quantize(TWO_PLACES)
        return shares


class ExactSplit(SplitStrategy):
    """แบ่งตามจำนวนที่ระบุ ต้องรวมกันเท่ายอดทั้งหมด"""

    def __init__(self, shares: dict[str, Decimal]):
        self._shares = shares

    def calculate(self, amount: Decimal) -> dict[str, Decimal]:
        total = sum(self._shares.values(), Decimal("0"))
        if total != amount:
            raise SharesMismatchError(
                f"The shares add up to {total} but the amount is {amount}"
            )
        return dict(self._shares)


if __name__ == "__main__":
    # ส่วนทดลองรัน
    strategies = [
        EqualSplit(["alice", "bob", "carol"]),
        ExactSplit({"alice": Decimal("500.00"), "bob": Decimal("300.00")}),
    ]
    for strategy in strategies:
        try:
            print(strategy.calculate(Decimal("100.00")))
        except SplitError as error:
            print("Error:", error)