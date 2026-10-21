import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

import main
from storage import Storage

OUT = [{"id": "out", "direction": "out"}]
IN = [{"id": "in", "direction": "in"}]
BOTH = [{"id": "in", "direction": "in"}, {"id": "out", "direction": "out"}]


def node(node_id: str, node_type: str, config: dict, ports: list[dict]) -> dict:
    return {"id": node_id, "type": node_type, "config": config, "ports": ports}


def edge(edge_id: str, source: str, target: str) -> dict:
    return {
        "id": edge_id,
        "source": {"nodeId": source, "port": "out"},
        "target": {"nodeId": target, "port": "in"},
    }


def train_config(data: object | None = None, path: str = "models/linear.json") -> dict:
    config: dict = {"userId": "local", "path": path}
    if data is not None:
        config["data"] = data
    return config


class TrainTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.original = main.storage
        main.storage = Storage(self.root)
        self.addCleanup(self._restore_storage)
        self.client = TestClient(main.app)

    def _restore_storage(self):
        main.storage = self.original

    def test_fits_a_numeric_series_and_writes_the_artifact(self):
        response = self.client.post(
            "/runs",
            json={
                "version": 1,
                "nodes": [
                    node("numbers", "input", {"values": [1, 3, 5]}, OUT),
                    node("fit", "train", train_config(), BOTH),
                    node("log", "output", {}, IN),
                ],
                "edges": [
                    edge("numbers-to-fit", "numbers", "fit"),
                    edge("fit-to-log", "fit", "log"),
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(
            [item["value"] for item in body["results"][1:]],
            ["models/linear.json", "models/linear.json"],
        )
        listed = self.client.get("/users/local/files")
        self.assertEqual([item["path"] for item in listed.json()["files"]], ["models/linear.json"])
        downloaded = self.client.get("/users/local/files/models/linear.json")
        artifact = json.loads(downloaded.content)
        self.assertEqual(artifact["model"], "linear")
        self.assertEqual(artifact["kind"], "series")
        self.assertEqual(artifact["samples"], 3)
        self.assertAlmostEqual(artifact["intercept"], 1)
        self.assertAlmostEqual(artifact["coefficients"][0], 2)
        self.assertEqual(self.client.get("/users/other/files").json()["files"], [])

    def test_fits_a_table_stored_on_the_node(self):
        response = self.client.post(
            "/runs",
            json={
                "version": 1,
                "nodes": [
                    node(
                        "fit",
                        "train",
                        train_config(
                            [[0, 0, 1], [1, 0, 3], [0, 1, 4], [1, 1, 6]],
                            path="models/table.json",
                        ),
                        BOTH,
                    )
                ],
                "edges": [],
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["value"], "models/table.json")
        artifact = json.loads((self.root / "local" / "models" / "table.json").read_text(encoding="utf-8"))
        self.assertEqual(artifact["kind"], "table")
        self.assertEqual(artifact["features"], ["x0", "x1"])
        self.assertAlmostEqual(artifact["intercept"], 1)
        self.assertAlmostEqual(artifact["coefficients"][0], 2)
        self.assertAlmostEqual(artifact["coefficients"][1], 3)

    def test_rejects_a_path_that_escapes_the_storage_folder(self):
        response = self.client.post(
            "/runs",
            json={
                "version": 1,
                "nodes": [node("fit", "train", train_config(path="../secret.json"), BOTH)],
                "edges": [],
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid path", response.json()["detail"])
        self.assertFalse((self.root / "secret.json").exists())

    def test_too_few_numbers_is_a_failed_run(self):
        response = self.client.post(
            "/runs",
            json={
                "version": 1,
                "nodes": [node("fit", "train", train_config([1]), BOTH)],
                "edges": [],
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["results"][0]["error"], "Train needs at least two numbers")
        self.assertEqual(list(self.root.glob("**/*")), [])
