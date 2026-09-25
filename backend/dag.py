from collections import defaultdict, deque

class Node:    
    def __init__(self, name):
        self.name = name
    
    def __repr__(self):
        return f"Node({self.name})"
class DAG:
    def __init__(self):
        self.nodes = set()
        self.graph = defaultdict(list)
        self.in_degree = defaultdict(int)
    
    def add_node(self, node: Node):
        self.nodes.add(node)
    
    def add_edge(self, parent: Node, child: Node):
        if parent not in self.nodes:
            self.add_node(parent)
        if child not in self.nodes:
            self.add_node(child)
            
        self.graph[parent].append(child)
        self.in_degree[child] += 1
        
        if parent not in self.in_degree:
            self.in_degree[parent] = 0

    def topological_sort(self):
        in_degrees = {node: self.in_degree[node] for node in self.nodes}
        
        queue = deque([node for node in self.nodes if in_degrees[node] == 0])
        execution_order = []
        
        while queue:
            current = queue.popleft()
            execution_order.append(current)
            
            for child in self.graph[current]:
                in_degrees[child] -= 1
                
                if in_degrees[child] == 0:
                    queue.append(child)
        if len(execution_order) != len(self.nodes):
            raise ValueError("Cycle detected! This graph is not a valid DAG.")
        
        return execution_order