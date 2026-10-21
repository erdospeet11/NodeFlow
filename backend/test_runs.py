import json
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main

EXAMPLES = Path(__file__).resolve().parents[1] / "contracts" / "examples"


def node(node_id: str, node_type: str, config: dict, ports: list[dict]) -> dict:
    return {"id": node_id, "type": node_type, "config": config, "ports": ports}


def edge(edge_id: str, source: str, target: str) -> dict:
    return {
        "id": edge_id,
        "source": {"nodeId": source, "port": "out"},
        "target": {"nodeId": target, "port": "in"},
    }


OUT = [{"id": "out", "direction": "out"}]
IN = [{"id": "in", "direction": "in"}]
BOTH = [{"id": "in", "direction": "in"}, {"id": "out", "direction": "out"}]


def sum_flow(values: list[float]) -> dict:
    return {
        "version": 1,
        "nodes": [
            node("numbers", "input", {"values": values}, OUT),
            node("total", "process", {"fn": "sum"}, BOTH),
            node("log", "output", {}, IN),
        ],
        "edges": [
            edge("numbers-to-total", "numbers", "total"),
            edge("total-to-log", "total", "log"),
        ],
    }


class RunApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_executes_numbers_through_sum_into_the_log(self):
        response = self.client.post("/runs", json=sum_flow([1, 2, 3, 4]))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(
            body["results"],
            [
                {"nodeId": "numbers", "status": "ok", "value": [1, 2, 3, 4]},
                {"nodeId": "total", "status": "ok", "value": 10},
                {"nodeId": "log", "status": "ok", "value": 10},
            ],
        )

    def test_rejects_a_cycle(self):
        response = self.client.post(
            "/runs",
            json={
                "version": 1,
                "nodes": [
                    node("left", "process", {"fn": "sum"}, BOTH),
                    node("right", "process", {"fn": "sum"}, BOTH),
                ],
                "edges": [
                    edge("left-to-right", "left", "right"),
                    edge("right-to-left", "right", "left"),
                ],
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Cycle detected", response.json()["detail"])

    def test_empty_sum_is_a_failed_run(self):
        response = self.client.post("/runs", json=sum_flow([]))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["results"][1]["error"], "Sum needs at least one number")
        self.assertEqual(body["results"][2]["error"], "Upstream failed")

    def test_rejects_a_request_that_breaks_the_contract(self):
        request = json.loads((EXAMPLES / "sum.request.json").read_text(encoding="utf-8"))
        request["nodes"][1]["config"]["operand"] = 2
        response = self.client.post("/runs", json=request)
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
