import re

# All apostrophe-like characters used in Ukrainian text
_APOSTROPHE_RE = re.compile(r"['\u2019\u02BC\u0060]")


def strip_accent(s: str) -> str:
    """Remove combining acute accent (U+0301) from a string."""
    return s.replace("\u0301", "")


def normalize(s: str) -> str:
    """Lowercase, strip accent, and collapse apostrophe variants to U+2019.

    Used to build consistent lookup keys so that input text and stored
    forms match regardless of which apostrophe character was used.
    """
    return _APOSTROPHE_RE.sub("\u2019", strip_accent(s)).lower()
