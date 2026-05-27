#!/usr/bin/env python3
"""Repair hook injections that landed inside destructuring parameter lists."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def repair(text: str) -> str:
    hooks = r"(?:const styles = useAppStyles\(createStyles\);|const theme = useTheme\(\);)(?:\s*(?:const styles = useAppStyles\(createStyles\);|const theme = useTheme\(\);))*"
    pattern = re.compile(
        rf"(\w+\s*\(\{{\s*){hooks}\s*(.+?\}}\s*:\s*.+?\)\s*\{{)",
        re.DOTALL,
    )

    def repl(m: re.Match[str]) -> str:
        prefix, props_block = m.group(1), m.group(2)
        hook_lines = re.findall(
            r"const styles = useAppStyles\(createStyles\);|const theme = useTheme\(\);",
            m.group(0),
        )
        hooks_body = "\n  ".join(dict.fromkeys(hook_lines))
        return f"{prefix}{props_block[1:]}\n  {hooks_body}\n"

    prev = None
    while prev != text:
        prev = text
        text = pattern.sub(repl, text)
    return text


def main() -> None:
    changed = 0
    for folder in ("app", "src"):
        for path in (ROOT / folder).rglob("*.tsx"):
            original = path.read_text()
            fixed = repair(original)
            if fixed != original:
                path.write_text(fixed)
                changed += 1
                print(path.relative_to(ROOT.parent))
    print(f"Repaired {changed} files")


if __name__ == "__main__":
    main()
