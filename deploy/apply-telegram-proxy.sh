#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "sudo 로 실행하세요." >&2
  exit 1
fi

install -m 644 "$ROOT/telegram-proxy.conf" /etc/nginx/snippets/telegram-proxy.conf
install -m 644 "$ROOT/openai-proxy.conf" /etc/nginx/snippets/openai-proxy.conf

python3 - <<'PY'
from pathlib import Path
import re

loc_re = re.compile(r"(?m)^([ \t]*)location\s+/\s*\{")
roots = [
    Path("/etc/nginx/sites-available"),
    Path("/etc/nginx/conf.d"),
]
snippets = ["telegram-proxy.conf", "openai-proxy.conf"]
updated = []
for folder in roots:
    if not folder.is_dir():
        continue
    for conf in folder.iterdir():
        if not conf.is_file():
            continue
        text = conf.read_text(encoding="utf-8", errors="replace")
        if "al.allzyy.com" not in text and "/var/www/lottolab" not in text:
            continue
        original = text
        for name in snippets:
            if name in text:
                continue
            include = f"include snippets/{name};"
            text, n = loc_re.subn(rf"\1{include}\n\1location / {{", text)
            if n == 0:
                print(f"skip {conf}: location / 를 찾지 못했습니다")
                break
        if text != original:
            conf.write_text(text, encoding="utf-8")
            updated.append(str(conf))

print("nginx include:", ", ".join(updated) if updated else "already present")
PY

nginx -t
systemctl reload nginx
echo "api proxies ready"
