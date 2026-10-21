import json
import math

from dag import DAG, Node
from graph_contract import validate_run_result
from storage import Storage, StorageError
from train import TrainError, fit_linear

class CycleError(Exception):
    pass


class RunError(Exception):
    pass


def run_graph(request: dict, storage: Storage | None = None) -> dict:
    dag = DAG()
    dag_nodes = {node["id"]: Node(node["id"]) for node in request["nodes"]}
    for dag_node in dag_nodes.values():
        dag.add_node(dag_node)
    for edge in request["edges"]:
        dag.add_edge(dag_nodes[edge["source"]["nodeId"]], dag_nodes[edge["target"]["nodeId"]])

    try:
        order = dag.topological_sort()
    except ValueError as error:
        raise CycleError(str(error)) from error

    nodes_by_id = {node["id"]: node for node in request["nodes"]}
    outputs: dict[str, object] = {}
    results = []
    for dag_node in order:
        node = nodes_by_id[dag_node.name]
        try:
            value = _execute(node, request, outputs, storage)
        except RunError as error:
            results.append({"nodeId": node["id"], "status": "error", "error": str(error)})
            continue
        outputs[node["id"]] = value
        results.append({"nodeId": node["id"], "status": "ok", "value": value})

    failed = any(result["status"] == "error" for result in results)
    return validate_run_result(
        {"version": 1, "status": "error" if failed else "ok", "results": results}
    )


def _execute(
    node: dict, request: dict, outputs: dict[str, object], storage: Storage | None
) -> object:
    if node["type"] == "input":
        return list(node["config"]["values"])
    if node["type"] == "train":
        return _train(node, request, outputs, storage)
    upstream = _incoming(node["id"], request, outputs)
    if node["type"] == "output":
        return upstream
    if node["type"] == "process":
        return _apply_process(_as_list(upstream), node["config"])
    raise RunError("Unknown node")


def _train(
    node: dict, request: dict, outputs: dict[str, object], storage: Storage | None
) -> str:
    try:
        artifact = fit_linear(_train_data(node, request, outputs))
    except TrainError as error:
        raise RunError(str(error)) from error
    if storage is None:
        raise RunError("Storage is not available")
    relative = node["config"]["path"]
    try:
        target = storage.prepare_upload(node["config"]["userId"], relative)
    except StorageError as error:
        raise RunError(error.detail) from error
    target.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    return relative


def _train_data(node: dict, request: dict, outputs: dict[str, object]) -> object:
    edges = [edge for edge in request["edges"] if edge["target"]["nodeId"] == node["id"]]
    if len(edges) > 1:
        raise RunError("Needs one input")
    if edges:
        return _incoming(node["id"], request, outputs)
    if "data" in node["config"]:
        return node["config"]["data"]
    raise RunError("Needs numeric or tabular data")


def _incoming(node_id: str, request: dict, outputs: dict[str, object]) -> object:
    edges = [edge for edge in request["edges"] if edge["target"]["nodeId"] == node_id]
    if len(edges) != 1:
        raise RunError("Needs one input")
    source_id = edges[0]["source"]["nodeId"]
    if source_id not in outputs:
        raise RunError("Upstream failed")
    return outputs[source_id]


def _apply_process(values: list[float], config: dict) -> object:
    _assert_numbers(values)
    function = config["fn"]
    if function == "sum":
        _assert_non_empty(values, "Sum")
        return sum(values)
    if function == "mean":
        _assert_non_empty(values, "Mean")
        return sum(values) / len(values)
    if function == "min":
        _assert_non_empty(values, "Min")
        return min(values)
    if function == "max":
        _assert_non_empty(values, "Max")
        return max(values)
    if function == "map":
        operation = config.get("mapOp", "multiply")
        operand = config.get("operand", 1)
        if operation == "add":
            return [value + operand for value in values]
        if operation == "square":
            return [value * value for value in values]
        return [value * operand for value in values]
    raise RunError("Unknown process function")


def _as_list(value: object) -> list[float]:
    if isinstance(value, list):
        return value
    return [value]


def _assert_numbers(values: list[object]) -> None:
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for value in values):
        raise RunError("Process functions only accept finite numbers")


def _assert_non_empty(values: list[object], name: str) -> None:
    if not values:
        raise RunError(f"{name} needs at least one number")
