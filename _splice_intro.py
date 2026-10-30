# -*- coding: utf-8 -*-
"""把 _intro_new.js 的内容替换进 index.html 的开场区块（两个标记注释之间）"""
from pathlib import Path

idx = Path(r"C:\Users\ks\TO YY\moon-site\index.html")
new = Path(r"C:\Users\ks\TO YY\moon-site\_intro_new.js").read_text(encoding="utf-8")

html = idx.read_text(encoding="utf-8")
start_marker = "/* ───────── 开场 · 粒子之月"
end_marker = "/* ───────── 月相 & 天数"

s = html.find(start_marker)
e = html.find(end_marker)
if s < 0 or e < 0 or e <= s:
    raise SystemExit(f"markers not found: s={s} e={e}")

out = html[:s] + new + html[e:]
idx.write_text(out, encoding="utf-8")
print("spliced OK, new length:", len(out))
