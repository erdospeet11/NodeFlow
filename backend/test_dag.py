import unittest

from dag import DAG, Node


class TopologicalSortTests(unittest.TestCase):
    def test_linear_order(self):
        numbers, total, log = Node("numbers"), Node("sum"), Node("log")
        dag = DAG()
        dag.add_edge(numbers, total)
        dag.add_edge(total, log)

        self.assertEqual(
            [node.name for node in dag.topological_sort()],
            ["numbers", "sum", "log"],
        )

    def test_disconnected_nodes_keep_each_chain_in_order(self):
        numbers, total = Node("numbers"), Node("sum")
        other, sink = Node("other"), Node("sink")
        alone = Node("alone")
        dag = DAG()
        dag.add_edge(numbers, total)
        dag.add_edge(other, sink)
        dag.add_node(alone)

        names = [node.name for node in dag.topological_sort()]

        self.assertCountEqual(names, ["numbers", "sum", "other", "sink", "alone"])
        self.assertLess(names.index("numbers"), names.index("sum"))
        self.assertLess(names.index("other"), names.index("sink"))

    def test_cycle_error(self):
        left, right = Node("left"), Node("right")
        dag = DAG()
        dag.add_edge(left, right)
        dag.add_edge(right, left)

        with self.assertRaises(ValueError) as caught:
            dag.topological_sort()

        self.assertIn("Cycle detected", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
