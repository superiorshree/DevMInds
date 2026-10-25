import pytest

from app.integrations.normalize import error_from_status


@pytest.mark.parametrize(
    "http_status,expected",
    [
        (401, "TOKEN_EXPIRED"),
        (403, "NO_PERMISSION"),
        (429, "RATE_LIMITED"),
        (500, "API_DOWN"),
        (502, "API_DOWN"),
        (503, "API_DOWN"),
        (None, "API_DOWN"),
    ],
)
def test_error_mapping(http_status, expected):
    error = error_from_status("jira", http_status)

    assert error.code == expected
    assert error.source_type == "jira"


def test_error_messages_do_not_expose_secrets():
    secret = "super_secret_test_token"

    for status in (401, 403, 429, 500, None):
        error = error_from_status("jira", status)
        assert secret not in error.message
