import string
import random

def generate_short_id(length: int = 5) -> str:
    """Generate a random string of specified length."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))
