import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

import main
from storage import Storage, StorageError


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.storage = Storage(Path(self.tmp.name))
        self.original = main.storage
        main.storage = self.storage
        self.addCleanup(self._restore_storage)
        self.client = TestClient(main.app)

    def _restore_storage(self):
        main.storage = self.original

    def test_upload_list_and_download_stay_inside_the_user_directory(self):
        uploaded = self.client.post(
            "/users/alice/files",
            data={"path": "datasets/numbers.txt"},
            files={"file": ("numbers.txt", b"1,2,3", "text/plain")},
        )
        self.assertEqual(uploaded.status_code, 200)
        self.assertEqual(uploaded.json(), {"path": "datasets/numbers.txt", "size": 5})

        listed = self.client.get("/users/alice/files")
        self.assertEqual(listed.status_code, 200)
        files = listed.json()["files"]
        self.assertEqual([item["path"] for item in files], ["datasets/numbers.txt"])
        self.assertEqual(files[0]["size"], 5)

        downloaded = self.client.get("/users/alice/files/datasets/numbers.txt")
        self.assertEqual(downloaded.status_code, 200)
        self.assertEqual(downloaded.content, b"1,2,3")
        self.assertTrue(
            (Path(self.tmp.name) / "alice" / "datasets" / "numbers.txt").is_file()
        )

    def test_users_do_not_share_files(self):
        self.client.post(
            "/users/alice/files",
            files={"file": ("secret.txt", b"alice", "text/plain")},
        )
        self.client.post(
            "/users/bob/files",
            files={"file": ("secret.txt", b"bob", "text/plain")},
        )

        alice = self.client.get("/users/alice/files/secret.txt")
        bob = self.client.get("/users/bob/files/secret.txt")
        self.assertEqual(alice.content, b"alice")
        self.assertEqual(bob.content, b"bob")
        self.assertEqual(
            [item["path"] for item in self.client.get("/users/alice/files").json()["files"]],
            ["secret.txt"],
        )

    def test_rejects_paths_that_leave_the_user_directory(self):
        outside = Path(self.tmp.name) / "secret.txt"
        outside.write_text("nope", encoding="utf-8")

        escaped = self.client.post(
            "/users/alice/files",
            data={"path": "../secret.txt"},
            files={"file": ("secret.txt", b"owned", "text/plain")},
        )
        self.assertEqual(escaped.status_code, 400)
        self.assertEqual(outside.read_text(encoding="utf-8"), "nope")

        missing = self.client.get("/users/alice/files/../secret.txt")
        self.assertIn(missing.status_code, (400, 404))
        self.assertFalse((Path(self.tmp.name) / "alice" / "secret.txt").exists())

    def test_rejects_invalid_user_ids_and_missing_files(self):
        invalid = self.client.get("/users/-bob/files")
        self.assertEqual(invalid.status_code, 400)

        missing = self.client.get("/users/alice/files/missing.txt")
        self.assertEqual(missing.status_code, 404)

    def test_rejects_a_symlink_inside_the_user_directory(self):
        outside = Path(self.tmp.name) / "outside.txt"
        outside.write_text("outside", encoding="utf-8")
        user_dir = Path(self.tmp.name) / "alice"
        user_dir.mkdir()
        (user_dir / "link.txt").symlink_to(outside)

        with self.assertRaises(StorageError) as caught:
            self.storage.file_for_download("alice", "link.txt")
        self.assertEqual(caught.exception.status_code, 400)

        listed = self.storage.list_files("alice")
        self.assertEqual(listed, [])


if __name__ == "__main__":
    unittest.main()
