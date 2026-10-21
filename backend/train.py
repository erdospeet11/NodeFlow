import math


class TrainError(Exception):
    pass


def fit_linear(data: object) -> dict:
    kind, features, samples, targets = _dataset(data)
    width = len(features) + 1
    normal = [[0.0 for _ in range(width)] for _ in range(width)]
    moments = [0.0 for _ in range(width)]
    for sample, target in zip(samples, targets, strict=True):
        row = [1.0, *sample]
        for left in range(width):
            moments[left] += row[left] * target
            for right in range(width):
                normal[left][right] += row[left] * row[right]

    solved = _solve(normal, moments)
    return {
        "model": "linear",
        "kind": kind,
        "samples": len(targets),
        "features": features,
        "target": "y",
        "intercept": solved[0],
        "coefficients": solved[1:],
    }


def _dataset(data: object) -> tuple[str, list[str], list[list[float]], list[float]]:
    if _is_number_list(data):
        if len(data) < 2:
            raise TrainError("Train needs at least two numbers")
        values = [_number(value) for value in data]
        return "series", ["x"], [[float(index)] for index in range(len(values))], values
    if isinstance(data, list) and data and all(isinstance(row, list) for row in data):
        return _table(data)
    raise TrainError("Train needs numeric or tabular data")


def _table(rows: list) -> tuple[str, list[str], list[list[float]], list[float]]:
    if len(rows) < 2:
        raise TrainError("Train needs at least two rows")
    width = len(rows[0])
    if width < 2:
        raise TrainError("Train needs a feature and a target")
    if any(len(row) != width for row in rows):
        raise TrainError("Train rows must be the same length")
    parsed = [[_number(value) for value in row] for row in rows]
    features = [f"x{index}" for index in range(width - 1)]
    samples = [row[:-1] for row in parsed]
    targets = [row[-1] for row in parsed]
    return "table", features, samples, targets


def _is_number_list(data: object) -> bool:
    return isinstance(data, list) and all(not isinstance(item, list) for item in data)


def _number(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise TrainError("Train only accepts finite numbers")
    return float(value)


def _solve(matrix: list[list[float]], target: list[float]) -> list[float]:
    size = len(target)
    augmented = [row[:] + [target[index]] for index, row in enumerate(matrix)]
    for column in range(size):
        pivot = max(range(column, size), key=lambda row: abs(augmented[row][column]))
        if abs(augmented[pivot][column]) < 1e-10:
            raise TrainError("Train needs independent columns")
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]
        scale = augmented[column][column]
        for index in range(column, size + 1):
            augmented[column][index] /= scale
        for row in range(size):
            if row == column:
                continue
            factor = augmented[row][column]
            for index in range(column, size + 1):
                augmented[row][index] -= factor * augmented[column][index]
    return [augmented[row][size] for row in range(size)]
