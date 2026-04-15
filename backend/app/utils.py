def strip_accent(s: str) -> str:
    """Remove combining acute accent (U+0301) from a string."""
    return s.replace("\u0301", "")
