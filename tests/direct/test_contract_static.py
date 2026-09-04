import ast
from pathlib import Path

import pytest

CONTRACT_PATH = Path("contracts/protocol_errata_reserve.py")


def test_contract_source_is_ascii():
    content = CONTRACT_PATH.read_bytes()
    try:
        content.decode("ascii")
    except UnicodeDecodeError as exc:
        pytest.fail(f"Contract contains non-ASCII byte at {exc.start}")


def test_contract_header_is_pinned():
    text = CONTRACT_PATH.read_text(encoding="ascii")
    first_lines = [line.strip() for line in text.splitlines()[:3]]
    assert any(line.startswith('# { "Depends": "py-genlayer:') for line in first_lines)
    assert "py-genlayer:test" not in text
    assert "py-genlayer:latest" not in text


def test_exactly_one_contract_class():
    tree = ast.parse(CONTRACT_PATH.read_text(encoding="ascii"))
    classes = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for base in node.bases:
                if isinstance(base, ast.Attribute) and base.attr == "Contract":
                    classes.append(node.name)
    assert classes == ["ProtocolErrataReserve"]


def test_payable_methods_are_explicit():
    tree = ast.parse(CONTRACT_PATH.read_text(encoding="ascii"))
    payable = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for decorator in node.decorator_list:
                if "payable" in ast.unparse(decorator):
                    payable.add(node.name)
    assert payable == {"create_reserve"}
