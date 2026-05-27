#!/usr/bin/env python3
"""Inject useAppStyles / useTheme into components that reference styles or theme."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = ("portals/child", "+not-found", "StubScreen")


def should_skip(path: Path) -> bool:
    return any(s in str(path) for s in SKIP)


def ensure_imports(text: str, need_styles: bool, need_theme: bool) -> str:
    if need_styles and "useAppStyles" not in text:
        if "from '@/src/hooks/useStyles'" not in text:
            anchor = "from 'react-native'"
            if anchor in text:
                text = text.replace(
                    anchor,
                    anchor + ";\nimport { useAppStyles } from '@/src/hooks/useStyles'",
                    1,
                )
            else:
                text = "import { useAppStyles } from '@/src/hooks/useStyles';\n" + text
        if "AppTheme" not in text and "createStyles" in text:
            if "from '@/src/theme'" in text:
                text = re.sub(
                    r"import \{ type AppTheme \} from '@/src/theme';",
                    "import { type AppTheme } from '@/src/theme';",
                    text,
                )
            else:
                text = "import { type AppTheme } from '@/src/theme';\n" + text

    if need_theme and "useTheme" not in text:
        text = "import { useTheme } from '@/src/contexts/ThemeContext';\n" + text
    return text


def find_function_blocks(text: str) -> list[tuple[int, int, str]]:
    """Return (start, body_start, name) for top-level function declarations."""
    blocks: list[tuple[int, int, str]] = []
    pattern = re.compile(
        r"^(export\s+default\s+function|export\s+function|function)\s+(\w+)\s*\(",
        re.MULTILINE,
    )
    for m in pattern.finditer(text):
        name = m.group(2)
        brace = text.find("{", m.end())
        if brace == -1:
            continue
        blocks.append((m.start(), brace + 1, name))
    return blocks


def function_body_end(text: str, body_start: int) -> int:
    depth = 1
    i = body_start
    in_str = None
    escape = False
    while i < len(text) and depth > 0:
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in ("'", '"', "`"):
            in_str = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    return i


def needs_styles(body: str) -> bool:
    return bool(re.search(r"\bstyles\.", body))


def needs_theme(body: str) -> bool:
    return bool(re.search(r"\btheme\.", body))


def has_styles_hook(body_head: str) -> bool:
    return "useAppStyles(createStyles)" in body_head


def has_theme_hook(body_head: str) -> bool:
    return "useTheme()" in body_head


def fix_file(path: Path) -> bool:
    text = path.read_text()
    original = text
    blocks = find_function_blocks(text)
    if not blocks:
        return False

    inserts: list[tuple[int, str]] = []
    file_need_styles = False
    file_need_theme = False

    for idx, (start, body_start, name) in enumerate(blocks):
        if name == "createStyles":
            continue
        body_end = (
            blocks[idx + 1][0]
            if idx + 1 < len(blocks)
            else function_body_end(text, body_start)
        )
        body = text[body_start:body_end]
        body_head = body[:400]
        hooks: list[str] = []
        if needs_styles(body) and not has_styles_hook(body_head):
            hooks.append("  const styles = useAppStyles(createStyles);")
            file_need_styles = True
        if needs_theme(body) and not has_theme_hook(body_head):
            hooks.append("  const theme = useTheme();")
            file_need_theme = True
        if hooks:
            inserts.append((body_start, "\n" + "\n".join(hooks)))

    if not inserts:
        return False

    inserts.sort(key=lambda x: x[0], reverse=True)
    for pos, snippet in inserts:
        text = text[:pos] + snippet + text[pos:]

    text = ensure_imports(text, file_need_styles, file_need_theme)
    if text != original:
        path.write_text(text)
        return True
    return False


def main() -> None:
    changed: list[Path] = []
    for path in sorted(ROOT.rglob("*.tsx")):
        if should_skip(path):
            continue
        if fix_file(path):
            changed.append(path.relative_to(ROOT.parent))
    print(f"Fixed {len(changed)} files")
    for p in changed:
        print(f"  {p}")


if __name__ == "__main__":
    main()
