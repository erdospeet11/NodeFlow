import json
from pathlib import Path

from jsonschema import Draft202012Validator

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "contracts" / "graph.schema.json"


class ContractError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


def schema() -> dict:
    document = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(document)
    return document


def validate_run_request(data: object) -> dict:
    _validate("runRequest", data)
    if not isinstance(data, dict):
        raise ContractError("Run request must be an object")
    _assert_graph(data)
    return data


def validate_run_result(data: object) -> dict:
    _validate("runResult", data)
    if not isinstance(data, dict):
        raise ContractError("Run result must be an object")
    results = data["results"]
    failed = any(item["status"] == "error" for item in results)
    if failed and data["status"] != "error":
        raise ContractError("Run status must be error when a node result failed")
    if not failed and data["status"] != "ok":
        raise ContractError("Run status must be ok when every node result succeeded")
    return data


def _validate(definition: str, data: object) -> None:
    document = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$defs": schema()["$defs"],
        "$ref": f"#/$defs/{definition}",
    }
    validator = Draft202012Validator(document)
    errors = sorted(validator.iter_errors(data), key=lambda error: list(error.absolute_path))
    if not errors:
        return
    error = errors[0]
    path = ".".join(str(part) for part in error.absolute_path)
    location = f"{path}: " if path else ""
    raise ContractError(f"{location}{error.message}") from error


def _assert_graph(request: dict) -> None:
    nodes_by_id: dict[str, dict] = {}
    for node in request["nodes"]:
        node_id = node["id"]
        if node_id in nodes_by_id:
            raise ContractError(f"Duplicate node id: {node_id}")
        port_ids = [port["id"] for port in node["ports"]]
        if len(port_ids) != len(set(port_ids)):
            raise ContractError(f"Duplicate port id on node {node_id}")
        nodes_by_id[node_id] = node

    edge_ids: set[str] = set()
    occupied_inputs: set[tuple[str, str]] = set()
    for edge in request["edges"]:
        edge_id = edge["id"]
        if edge_id in edge_ids:
            raise ContractError(f"Duplicate edge id: {edge_id}")
        edge_ids.add(edge_id)
        source = edge["source"]
        target = edge["target"]
        if source["nodeId"] == target["nodeId"]:
            raise ContractError(f"Edge {edge_id} connects a node to itself")
        _require_port(nodes_by_id, edge_id, source, "source", "out")
        _require_port(nodes_by_id, edge_id, target, "target", "in")
        inlet = (target["nodeId"], target["port"])
        if inlet in occupied_inputs:
            raise ContractError(f"Edge {edge_id} target port is already connected")
        occupied_inputs.add(inlet)

    for node in request["nodes"]:
        if node["type"] == "train":
            _assert_storage_path(node["config"]["path"])


def _assert_storage_path(path: str) -> None:
    if (
        not isinstance(path, str)
        or "\x00" in path
        or "\\" in path
        or path.startswith("/")
        or any(ord(char) < 32 for char in path)
    ):
        raise ContractError("Invalid path")
    parts = path.split("/")
    if not parts or any(part in ("", ".", "..") for part in parts):
        raise ContractError("Invalid path")


def _require_port(nodes_by_id: dict[str, dict], edge_id: str, endpoint: dict, role: str, direction: str) -> None:
    node = nodes_by_id.get(endpoint["nodeId"])
    if node is None:
        raise ContractError(f"Edge {edge_id} {role} node does not exist")
    port = next((item for item in node["ports"] if item["id"] == endpoint["port"]), None)
    if port is None:
        raise ContractError(f"Edge {edge_id} {role} port does not exist")
    if port["direction"] != direction:
        raise ContractError(f"Edge {edge_id} {role} port is not an {direction} port")
