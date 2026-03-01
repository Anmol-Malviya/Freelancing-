from decimal import Decimal, ROUND_HALF_UP
from app.config import settings


def calculate_commission(price_paise: int) -> dict:
    """
    Calculate platform commission and creator payout.

    All amounts are in paise (Integer arithmetic only — no floats on money).

    Args:
        price_paise: Amount paid by buyer in paise (e.g., ₹100 = 10000 paise)

    Returns:
        dict with buyer_pays, razorpay_fee, platform_fee, creator_amount — all in paise
    """
    if price_paise == 0:
        return {
            "buyer_pays_paise": 0,
            "razorpay_fee_paise": 0,
            "platform_fee_paise": 0,
            "creator_amount_paise": 0,
        }

    price = Decimal(str(price_paise))
    gateway_rate = Decimal(str(settings.RAZORPAY_FEE_RATE))
    commission_rate = Decimal(str(settings.PLATFORM_COMMISSION_RATE))

    razorpay_fee = (price * gateway_rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    after_gateway = price - razorpay_fee
    platform_fee = (after_gateway * commission_rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    creator_amount = after_gateway - platform_fee

    return {
        "buyer_pays_paise": int(price),
        "razorpay_fee_paise": int(razorpay_fee),
        "platform_fee_paise": int(platform_fee),
        "creator_amount_paise": int(creator_amount),
    }


def paise_to_rupees(paise: int) -> float:
    """Display helper only — never use for calculations."""
    return round(paise / 100, 2)


def rupees_to_paise(rupees: float) -> int:
    """Convert rupee amount to paise for storage."""
    return int(Decimal(str(rupees)) * 100)
