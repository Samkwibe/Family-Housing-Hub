#!/usr/bin/env python3
"""Migrate static theme imports to useAppStyles(createStyles) pattern."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "mobile"
SKIP_PARTS = ("portals/child", "components/EditScreenInfo", "components/Themed.tsx", "+not-found", "StubScreen")

IMPORT_OLD = re.compile(r"import \{ theme \} from '@/src/theme';")
IMPORT_REPL = (
    "import { type AppTheme } from '@/src/theme';\n"
    "import { useAppStyles } from '@/src/hooks/useStyles';"
)

STYLE_START = "const styles = StyleSheet.create({"
STYLE_REPL = "function createStyles(theme: AppTheme) {\n  return StyleSheet.create({"


def should_skip(path: Path) -> bool:
    s = str(path)
    return any(part in s for part in SKIP_PARTS)


def close_styles_function(text: str, start_idx: int) -> str | None:
    """Find StyleSheet.create({...}); and append closing brace for createStyles."""
    i = text.find("StyleSheet.create({", start_idx)
    if i == -1:
        return None
    i = text.find("{", i)
    depth = 1
    i += 1
    while i < len(text) and depth > 0:
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    if i >= len(text):
        return None
    # expect );
    if text[i : i + 2] != ");":
        return None
    return text[: i + 2] + "\n}" + text[i + 2 :]


def inject_hooks(text: str) -> str:
    pattern = re.compile(
        r"(export default function \w+\([^)]*\)\s*\{|export function \w+\([^)]*\)\s*\{)"
    )
    parts = []
    last = 0
    for m in pattern.finditer(text):
        parts.append(text[last : m.end()])
        rest = text[m.end() : m.end() + 120]
        if "useAppStyles(createStyles)" not in rest.split("\n", 3)[0:3]:
            parts.append("\n  const styles = useAppStyles(createStyles);")
        last = m.end()
    parts.append(text[last:])
    return "".join(parts)


def migrate_file(path: Path) -> bool:
    text = path.read_text()
    if "from '@/src/theme'" not in text or "import { theme }" not in text:
        return False
    if "useAppStyles(createStyles)" in text:
        return False

    if STYLE_START not in text:
        # inline theme only — skip automated (manual)
        return False

    text = IMPORT_OLD.sub(IMPORT_REPL, text, count=1)
    idx = text.find(STYLE_START)
    if idx == -1:
        return False
    text = text[:idx] + STYLE_REPL + text[idx + len(STYLE_START) :]
    closed = close_styles_function(text, idx)
    if not closed:
        return False
    text = closed
    text = inject_hooks(text)
    path.write_text(text)
    return True


def main():
    changed = []
    for path in sorted(ROOT.rglob("*.tsx")):
        if should_skip(path):
            continue
        if migrate_file(path):
            changed.append(path.relative_to(ROOT))
    print(f"Migrated {len(changed)} files:")
    for p in changed:
        print(f"  {p}")


if __name__ == "__main__":
    main()
