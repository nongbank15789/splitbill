class AppError(Exception):
    """Base error: carries an HTTP status code and a readable message."""

    status_code = 400
    code = "bad_request"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class InvalidRequestError(AppError):
    """The request is well-formed JSON but breaks a business rule."""

    status_code = 422
    code = "invalid_request"