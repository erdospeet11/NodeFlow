import os
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from graph_contract import ContractError, validate_run_request
from runner import CycleError, run_graph
from storage import Storage, StorageError

app = FastAPI()
storage = Storage(
    Path(os.environ.get("NODEFLOW_STORAGE_ROOT", Path(__file__).resolve().parent / "storage"))
)

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.post("/greet")
def greet_user(name: str):
    return {"message": f"Hello, {name}!"}


@app.post("/runs")
def create_run(payload: dict):
    try:
        request = validate_run_request(payload)
        return run_graph(request, storage)
    except ContractError as error:
        raise HTTPException(status_code=400, detail=error.detail) from error
    except CycleError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _storage_call(action):
    try:
        return action()
    except StorageError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error


@app.get("/users/{user_id}/files")
def list_user_files(user_id: str):
    return {"files": _storage_call(lambda: storage.list_files(user_id))}


@app.post("/users/{user_id}/files")
async def upload_user_file(
    user_id: str,
    file: UploadFile = File(...),
    path: str | None = Form(default=None),
):
    relative = _storage_call(lambda: storage.destination(path, file.filename))
    target = _storage_call(lambda: storage.prepare_upload(user_id, relative))
    size = 0
    try:
        with target.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                output.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return {"path": relative, "size": size}


@app.get("/users/{user_id}/files/{file_path:path}")
def download_user_file(user_id: str, file_path: str):
    target = _storage_call(lambda: storage.file_for_download(user_id, file_path))
    return FileResponse(target, filename=target.name)

def main():
    print("Hello from backend!")

if __name__ == "__main__":
    main()