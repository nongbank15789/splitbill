from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.errors import AppError
from app.routers import balances, expenses, groups

app = FastAPI(title="SplitBill")
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balances.router)


def error_response(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status, content={"error": {"code": code, "message": message}}
    )


@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError):
    return error_response(exc.status_code, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    where = ".".join(str(part) for part in first["loc"] if part != "body")
    message = f"{where}: {first['msg']}" if where else first["msg"]
    return error_response(422, "validation_error", message)