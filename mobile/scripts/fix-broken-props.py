#!/usr/bin/env python3
"""Restore destructured prop names from TypeScript type annotations."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def parse_type_keys(type_str: str) -> list[str]:
    type_str = type_str.strip()
    if type_str in ("Props", "InputProps", "MapViewProps", "StepProgressProps", "ScreenProps"):
        return []
    m = re.match(r"^\{\s*(.+)\s*\}$", type_str, re.DOTALL)
    if not m:
        return []
    inner = m.group(1)
    keys: list[str] = []
    for part in re.split(r";\s*", inner):
        part = part.strip()
        if not part:
            continue
        km = re.match(r"(\w+)(\?)?:", part)
        if km:
            keys.append(km.group(1))
    return keys


def fix_destructured_functions(text: str) -> str:
    pattern = re.compile(
        r"(function\s+\w+\(\{\s*)([\s\S]*?)(\}\s*:\s*)([\s\S]*?\)\s*\{)",
    )

    def repl(m: re.Match[str]) -> str:
        prefix, params, mid, rest = m.group(1), m.group(2).strip(), m.group(3), m.group(4)
        type_part = rest.split(") {", 1)[0] + ")"
        type_str = type_part.strip()[1:]  # drop leading (
        if type_str.endswith(")"):
            type_str = type_str[:-1]
        keys = parse_type_keys(type_str)
        if not keys:
            return m.group(0)
        # preserve defaults from original params when possible
        defaults: dict[str, str] = {}
        for chunk in re.split(r",\s*", params.replace("\n", " ")):
            chunk = chunk.strip()
            if not chunk or chunk.startswith("const "):
                continue
            dm = re.match(r"(\w+)(\s*=\s*.+)?$", chunk)
            if dm:
                defaults[dm.group(1)] = dm.group(2) or ""
        rebuilt = []
        for key in keys:
            suffix = defaults.get(key, defaults.get(key[: max(0, len(key) - 1)], ""))
            if suffix and not suffix.startswith("="):
                suffix = defaults.get(key, "")
            rebuilt.append(f"{key}{defaults.get(key, '')}")
        # recover defaults from broken param fragments
        for chunk in re.split(r",\s*", params.replace("\n", " ")):
            chunk = chunk.strip()
            if "=" in chunk:
                name = chunk.split("=")[0].strip()
                for key in keys:
                    if key.endswith(name) or name.endswith(key) or key == name:
                        rebuilt[keys.index(key)] = f"{key}={chunk.split('=', 1)[1].strip()}"
        new_params = ", ".join(rebuilt)
        return f"{prefix}{new_params} {mid}{rest}"

    return pattern.sub(repl, text)


def fix_defaults_from_types(text: str) -> str:
    """Second pass: match `}: { keys with defaults }` explicitly."""
    pattern = re.compile(
        r"function\s+(\w+)\(\{\s*([^}]+)\}\s*:\s*(\{[^}]+\})\s*\)\s*\{",
    )

    def repl(m: re.Match[str]) -> str:
        name, _params, type_str = m.group(1), m.group(2), m.group(3)
        keys = parse_type_keys(type_str)
        if not keys:
            return m.group(0)
        old = _params.replace("\n", " ").strip()
        default_map: dict[str, str] = {}
        for chunk in old.split(","):
            chunk = chunk.strip()
            if "=" in chunk:
                k, v = chunk.split("=", 1)
                k = k.strip()
                for full in keys:
                    if full.endswith(k) or k.endswith(full[-3:]):
                        default_map[full] = v.strip()
        parts = [f"{k}{('=' + default_map[k]) if k in default_map else ''}" for k in keys]
        return f"function {name}({{ {', '.join(parts)} }}: {type_str}) {{"

    return pattern.sub(repl, text)


def main() -> None:
    changed = 0
    for folder in ("app", "src"):
        for path in (ROOT / folder).rglob("*.tsx"):
            original = path.read_text()
            fixed = fix_defaults_from_types(original)
            if fixed != original:
                path.write_text(fixed)
                changed += 1
                print(path.relative_to(ROOT.parent))
    print(f"Fixed {changed} files")


if __name__ == "__main__":
    main()
