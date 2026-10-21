import os
import re
from datetime import datetime, timezone
from pathlib import Path

USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")


class StorageError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class Storage:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def list_files(self, user_id: str) -> list[dict[str, object]]:
        directory = self._user_dir(user_id, create=True)
        files: list[dict[str, object]] = []
        for dirpath, dirnames, filenames in os.walk(directory, followlinks=False):
            current = Path(dirpath)
            dirnames[:] = [name for name in dirnames if not (current / name).is_symlink()]
            for name in filenames:
                path = current / name
                if path.is_symlink() or not path.is_file():
                    continue
                stat = path.stat()
                modified = datetime.fromtimestamp(stat.st_mtime, timezone.utc)
                files.append(
                    {
                        "path": path.relative_to(directory).as_posix(),
                        "size": stat.st_size,
                        "modified": modified.isoformat(),
                    }
                )
        files.sort(key=lambda item: str(item["path"]))
        return files

    def prepare_upload(self, user_id: str, relative: str) -> Path:
        directory = self._user_dir(user_id, create=True)
        target = self._resolve(directory, relative)
        if target.exists() and (target.is_dir() or target.is_symlink()):
            raise StorageError(400, "Invalid path")
        target.parent.mkdir(parents=True, exist_ok=True)
        return target

    def file_for_download(self, user_id: str, relative: str) -> Path:
        directory = self._user_dir(user_id, create=False)
        if not directory.is_dir():
            raise StorageError(404, "File not found")
        target = self._resolve(directory, relative)
        if target.is_symlink() or not target.is_file():
            raise StorageError(404, "File not found")
        return target

    def destination(self, path: str | None, filename: str | None) -> str:
        name = _file_name(filename)
        if path is None or path.strip() == "":
            if name is None:
                raise StorageError(400, "Invalid path")
            return name
        relative = path.replace("\\", "/").strip()
        if relative.endswith("/"):
            if name is None:
                raise StorageError(400, "Invalid path")
            relative = f"{relative}{name}"
        _parts(relative)
        return relative

    def _user_dir(self, user_id: str, *, create: bool) -> Path:
        if USER_ID_PATTERN.fullmatch(user_id) is None:
            raise StorageError(400, "Invalid user id")
        directory = self.root / user_id
        if create:
            directory.mkdir(parents=True, exist_ok=True)
        return directory

    def _resolve(self, directory: Path, relative: str) -> Path:
        current = directory
        for part in _parts(relative):
            current = current / part
            if current.is_symlink():
                raise StorageError(400, "Invalid path")
        if not current.resolve().is_relative_to(directory.resolve()):
            raise StorageError(400, "Invalid path")
        return current


def _file_name(filename: str | None) -> str | None:
    if filename is None:
        return None
    name = filename.replace("\\", "/").rstrip("/").split("/")[-1].strip()
    if name in ("", ".", ".."):
        return None
    return name


def _parts(relative: str) -> tuple[str, ...]:
    if "\x00" in relative or any(ord(char) < 32 for char in relative):
        raise StorageError(400, "Invalid path")
    normalized = relative.replace("\\", "/").strip()
    if normalized.startswith("/"):
        raise StorageError(400, "Invalid path")
    parts: list[str] = []
    for part in normalized.split("/"):
        if part == ".":
            continue
        if part in ("", ".."):
            raise StorageError(400, "Invalid path")
        parts.append(part)
    if not parts:
        raise StorageError(400, "Invalid path")
    return tuple(parts)
