"""Servidor estático de desarrollo sin caché (solo biblioteca estándar).

    python tools/serve.py [puerto]

Igual que `python -m http.server`, pero pide al navegador no guardar copias:
así cada recarga usa los archivos recién editados. Solo atiende a este computador
(Host local) y no entrega lo interno (.env, .git, .venv, tools/).
"""

import functools
import http.server
import os
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HIDDEN_DIRS = {"tools", "__pycache__", "node_modules"}
LOCAL_HOSTS = {"localhost", "127.0.0.1", "[::1]", "::1"}


def is_public(path: str) -> bool:
    """¿Se puede servir esta ruta? Mira la ruta real para cubrir mayúsculas, nombres cortos y enlaces."""
    try:
        rel = Path(os.path.realpath(path)).relative_to(Path(os.path.realpath(ROOT)))
    except ValueError:
        return False
    parts = [p.lower() for p in rel.parts]
    if any(p.startswith(".") or p in HIDDEN_DIRS for p in parts):
        return False
    return not (parts and parts[-1].endswith((".py", ".pyc", ".env")))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        host = (self.headers.get("Host") or "").strip().lower()
        name = host[: host.find("]") + 1] if host.startswith("[") else host.rsplit(":", 1)[0]
        if name not in LOCAL_HOSTS:
            self.send_error(400, "Host no permitido")
            return None
        path = self.translate_path(urllib.parse.urlsplit(self.path).path)
        if not is_public(path):
            self.send_error(404, "No encontrado")
            return None
        return super().send_head()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    handler = functools.partial(NoCache, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Florilegio en http://localhost:{port}  (Ctrl+C para salir)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
