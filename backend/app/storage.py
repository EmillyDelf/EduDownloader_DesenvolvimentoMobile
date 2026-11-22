from contextlib import suppress
import os
from pathlib import Path
import re
import shutil

from .errors import ServiceError


WORKSPACE = re.compile(r"(?:job-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|analyze-[A-Za-z0-9_-]+|discover-[A-Za-z0-9_-]+)\Z")


def no_space():
    return ServiceError("NO_SPACE", "O armazenamento não tem espaço suficiente para esta tarefa.", 507)


class Storage:
    def __init__(self, settings):
        self.settings = settings
        self.root = settings.data_dir.resolve() / "edudownloader-jobs-v1"
        self.lease = None
        self.reservations = set()

    def open(self):
        self.root.mkdir(parents=True, mode=0o700, exist_ok=True)
        if self.root.is_symlink() or self.root.is_junction():
            raise RuntimeError("A pasta de dados deve ser um diretório local dedicado")
        lease_path = self.root / ".lock"
        if lease_path.is_symlink():
            raise RuntimeError("Arquivo de trava inválido")
        self.lease = lease_path.open("a+b")
        try:
            if self.lease.seek(0, os.SEEK_END) == 0:
                self.lease.write(b"0")
                self.lease.flush()
            self.lease.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(self.lease.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.lease.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self.close()
            raise RuntimeError("A pasta de dados já está em uso por outra instância") from None
        try:
            for entry in self.root.iterdir():
                if WORKSPACE.fullmatch(entry.name):
                    self.remove(entry)
        except BaseException:
            self.close()
            raise

    def close(self):
        if self.lease is not None:
            self.lease.close()
            self.lease = None

    def assert_workspace(self, path):
        if (path.parent != self.root or not WORKSPACE.fullmatch(path.name)
                or path.is_symlink() or path.is_junction() or not path.resolve().is_relative_to(self.root)):
            raise RuntimeError("Diretório temporário fora do espaço de trabalho")

    def remove(self, path):
        self.assert_workspace(path)
        with suppress(FileNotFoundError):
            shutil.rmtree(path)

    def work_limit(self):
        return self.settings.max_bytes * 2 + 4 * 1024 ** 2

    def reserve(self, job):
        limit = self.work_limit()
        # Count all tracked files, including partial directories waiting for cleanup.
        try:
            used = sum(self.measure(folder) for folder in self.root.iterdir()
                       if folder.is_dir() and WORKSPACE.fullmatch(folder.name) and folder not in self.reservations)
            if (used + limit * (len(self.reservations) + 1) > self.settings.disk_budget
                    or shutil.disk_usage(self.root).free < self.settings.min_free + limit * (len(self.reservations) + 1)):
                raise no_space()
            self.assert_workspace(job.directory)
            job.directory.mkdir(mode=0o700)
        except OSError:
            raise no_space() from None
        self.reservations.add(job.directory)

    def measure(self, directory: Path):
        self.assert_workspace(directory)
        size = files = 0
        for root, directories, entries in directory.walk():
            directories[:] = [name for name in directories
                              if not (root / name).is_symlink() and not (root / name).is_junction()]
            files += len(entries) + len(directories)
            if files > 4096:
                raise ServiceError("WORKSPACE_LIMIT", "O motor excedeu o limite de arquivos temporários.", 413)
            for name in entries:
                try:
                    size += (root / name).lstat().st_size
                except FileNotFoundError:
                    continue
        return size

    def guard(self, directory):
        if self.measure(directory) > self.work_limit():
            raise ServiceError("SIZE_LIMIT", "A tarefa excedeu o espaço de trabalho permitido.", 413)
        if shutil.disk_usage(self.root).free < self.settings.min_free:
            raise no_space()

    def finish(self, directory, result=None):
        try:
            if result is None:
                self.remove(directory)
            else:
                self.assert_workspace(directory)
                for entry in directory.iterdir():
                    if entry != result:
                        if entry.is_dir() and not (entry.is_symlink() or entry.is_junction()):
                            if not entry.resolve().is_relative_to(directory):
                                raise RuntimeError("Diretório temporário fora da tarefa")
                            shutil.rmtree(entry)
                        else:
                            entry.unlink()
        finally:
            self.reservations.discard(directory)
