"""Lightweight JSON Schema validator for LLM-emitted tool arguments.

Same subset as saas-erp/agent — see notes there. Empty list = ok.
"""

from __future__ import annotations

from typing import Any


def validate(schema: dict[str, Any], value: Any, *, path: str = "") -> list[str]:
    errors: list[str] = []
    expected = schema.get("type")

    if expected == "object":
        if not isinstance(value, dict):
            errors.append(f"{path or '<root>'}: expected object, got {type(value).__name__}")
            return errors
        props = schema.get("properties") or {}
        required = schema.get("required") or []
        for req in required:
            if req not in value or value[req] in (None, ""):
                errors.append(f"{_join(path, req)}: required")
        for key, sub_schema in props.items():
            if key in value and value[key] is not None:
                errors.extend(validate(sub_schema, value[key], path=_join(path, key)))
        return errors

    if expected == "array":
        if not isinstance(value, list):
            errors.append(f"{path or '<root>'}: expected array, got {type(value).__name__}")
            return errors
        item_schema = schema.get("items")
        if item_schema:
            for i, item in enumerate(value):
                errors.extend(validate(item_schema, item, path=f"{path}[{i}]"))
        return errors

    if expected == "string":
        if not isinstance(value, str):
            errors.append(f"{path}: expected string, got {type(value).__name__}")
            return errors
        enum = schema.get("enum")
        if enum is not None and value not in enum:
            errors.append(f"{path}: must be one of {enum}")
        min_len = schema.get("minLength")
        if min_len is not None and len(value) < min_len:
            errors.append(f"{path}: must be at least {min_len} characters")
        return errors

    if expected == "integer":
        if isinstance(value, bool) or not isinstance(value, int):
            errors.append(f"{path}: expected integer, got {type(value).__name__}")
            return errors
        minimum = schema.get("minimum")
        if minimum is not None and value < minimum:
            errors.append(f"{path}: must be >= {minimum}")
        return errors

    if expected == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            errors.append(f"{path}: expected number, got {type(value).__name__}")
            return errors
        minimum = schema.get("minimum")
        if minimum is not None and value < minimum:
            errors.append(f"{path}: must be >= {minimum}")
        return errors

    if expected == "boolean":
        if not isinstance(value, bool):
            errors.append(f"{path}: expected boolean, got {type(value).__name__}")
        return errors

    return errors


def _join(prefix: str, key: str) -> str:
    return f"{prefix}.{key}" if prefix else key
