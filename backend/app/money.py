from decimal import Decimal, InvalidOperation

TWO_PLACES = Decimal("0.01")
MAX_AMOUNT = Decimal("9999999999.99")  # ใหญ่สุดที่ NUMERIC(12,2) เก็บได้


class InvalidAmountError(ValueError):
    """จำนวนเงินไม่ถูกต้อง"""


def parse_amount(text) -> Decimal:
    """แปลงข้อความเป็นจำนวนเงิน หรือโยน error ถ้าไม่ถูกกฎ"""
    if not isinstance(text, str):
        raise InvalidAmountError("Amount must be sent as a string, e.g. \"1000.00\"")

    try:
        amount = Decimal(text.strip())
    except InvalidOperation:
        raise InvalidAmountError("Amount is not a valid number")

    if not amount.is_finite():
        raise InvalidAmountError("Amount is not a valid number")
    if amount <= 0:
        raise InvalidAmountError("Amount must be greater than zero")
    if amount > MAX_AMOUNT:
        raise InvalidAmountError("Amount is too large")
    if amount != amount.quantize(TWO_PLACES):
        raise InvalidAmountError("Amount must have at most 2 decimal places")

    return amount