#!/usr/bin/env python3
"""Bundle the Studio back into one self-contained HTML file.

Useful for pasting into a Claude chat, emailing a preview, or dragging
onto Netlify Drop. Usage:  python3 tools/build_single_file.py
Output:                    dist/aspire-studio.html
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "aspire-studio.html"


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def main():
    html = read("index.html")

    html = re.sub(
        r'<link rel="stylesheet" href="(css/[^"]+)">',
        lambda m: "<style>\n" + read(m.group(1)) + "\n</style>",
        html,
    )
    html = re.sub(
        r'<script src="(js/[^"]+)"></script>',
        lambda m: "<script>\n" + read(m.group(1)) + "</script>",
        html,
    )

    crest = base64.b64encode((ROOT / "assets/aspire-crest.png").read_bytes()).decode()
    html = html.replace("assets/aspire-crest.png", "data:image/png;base64," + crest)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
