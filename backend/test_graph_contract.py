import copy
import json
import unittest
from pathlib import Path

from graph_contract import ContractError, validate_run_request, validate_run_result

EXAMPLES = Path(__file__).resolve().parents[1] / "contracts" / "examples"


def load_example(name: str) -> dict:
    return json.loads((EXAMPLES / name).read_text(encoding="utf-8"))


class GraphContractTests(unittest.TestCase):
    def test_sum_is_a_process_function(self):
        request = load_example("sum.request.json")
        request["nodes"][1]["config"] = {"fn": "sum"}
        validated = validate_run_request(request)
        self.assertEqual(validated["nodes"][1]["config"], {"fn": "sum"})

    def test_sum_request_and_result_match_the_contract(self):
        request = validate_run_request(load_example("sum.request.json"))
        self.assertEqual([node["id"] for node in request["nodes"]], ["numbers", "average", "result"])
        result = validate_run_result(load_example("sum.result.json"))
        self.assertEqual(result["results"][1]["value"], 2.5)

    def test_process_config_rejects_fields_from_another_function(self):
        request = load_example("sum.request.json")
        request["nodes"][1]["config"]["operand"] = 2
        with self.assertRaises(ContractError):
            validate_run_request(request)

    def test_map_square_rejects_an_operand(self):
        request = load_example("sum.request.json")
        request["nodes"][1]["config"] = {"fn": "map", "mapOp": "square", "operand": 2}
        with self.assertRaises(ContractError):
            validate_run_request(request)

    def test_edges_must_join_an_out_port_to_an_in_port(self):
        request = load_example("sum.request.json")
        request["edges"][0]["target"] = {"nodeId": "average", "port": "out"}
        with self.assertRaisesRegex(ContractError, "target port is not an in port"):
            validate_run_request(request)

        missing = load_example("sum.request.json")
        missing["edges"][0]["source"]["nodeId"] = "missing"
        with self.assertRaisesRegex(ContractError, "source node does not exist"):
            validate_run_request(missing)

    def test_duplicate_node_ids_are_rejected(self):
        request = load_example("sum.request.json")
        request["nodes"][2]["id"] = "numbers"
        request["edges"][1]["target"]["nodeId"] = "numbers"
        with self.assertRaisesRegex(ContractError, "Duplicate node id"):
            validate_run_request(request)

    def test_ok_result_requires_a_value_and_a_matching_run_status(self):
        result = load_example("sum.result.json")
        del result["results"][1]["value"]
        with self.assertRaises(ContractError):
            validate_run_result(result)

        failed = copy.deepcopy(load_example("sum.result.json"))
        failed["results"][1] = {"nodeId": "average", "status": "error", "error": "empty input"}
        with self.assertRaisesRegex(ContractError, "status must be error"):
            validate_run_result(failed)


if __name__ == "__main__":
    unittest.main()
