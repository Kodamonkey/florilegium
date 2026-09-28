"""Florilegio — servidor opcional: la página estática y el agente de IA en un solo proceso.

    uvicorn server.app:app --port 5173      (desde la raíz del repo)

Rutas: GET /api/health, POST /api/bouquet/interpret y POST /api/bouquet/compose. Todo lo demás
se sirve como archivo estático desde la raíz del repo, salvo server/, tools/ y lo oculto (.env,
.git, .venv…). Sin credenciales de Claude, /api/health responde ai=false y la página sigue con su
lectura local.
"""

from __future__ import annotations

import logging
import os
import re
import time
from collections import deque
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent

try:  # .env es opcional; las variables ya definidas en el entorno mandan
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except ImportError:
    pass

from . import agent  # noqa: E402  (después de .env)
from .schemas import ComposeRequest, InterpretRequest  # noqa: E402

_log = logging.getLogger("florilegio")
if not _log.handlers:  # uvicorn no configura la raíz: sin esto no se verían los consumos de tokens
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     %(name)s: %(message)s"))
    _log.addHandler(_handler)
    _log.setLevel(logging.INFO)
    _log.propagate = False

MAX_BODY = 64 * 1024
HIDDEN_DIRS = {"server", "tools", "__pycache__", "node_modules"}


# ---------------------------------------------------------------------------
# Límite de tamaño del cuerpo (64 KB), antes de que FastAPI lo lea
# ---------------------------------------------------------------------------

class BodyLimit:
    def __init__(self, app, max_bytes: int = MAX_BODY):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] in ("GET", "HEAD", "OPTIONS"):
            return await self.app(scope, receive, send)
        length = dict(scope["headers"]).get(b"content-length")
        if length is not None:
            try:
                too_big = int(length) > self.max_bytes
            except ValueError:
                return await _error(400, "Content-Length inválido")(scope, receive, send)
            if too_big:
                return await _too_large(scope, receive, send)
        # Sin Content-Length (o con uno falso) se cuenta lo que llega de verdad.
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > self.max_bytes:
                return await _too_large(scope, receive, send)
            chunks.append(chunk)
            if not message.get("more_body"):
                break
        body, replayed = b"".join(chunks), False

        async def replay():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


# ---------------------------------------------------------------------------
# Guardia: solo este computador puede gastar la clave de Claude
# ---------------------------------------------------------------------------

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]"}
RATE_HITS: dict[str, deque] = {}  # pedidos recientes a la IA por cliente
ORIGIN_RE = re.compile(r"^http://(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$")


def _allowed_hosts() -> set[str]:
    extra = {h.strip().lower() for h in os.environ.get("FLORILEGIO_HOSTS", "").split(",") if h.strip()}
    return LOCAL_HOSTS | extra


def _hostname(host: str) -> str:
    host = host.strip().lower()
    if host.startswith("["):
        return host[: host.find("]") + 1] if "]" in host else host
    return host.rsplit(":", 1)[0] if host.count(":") == 1 else host


class Guard:
    """Contra el DNS rebinding y los formularios de otros sitios:
    - la cabecera Host debe ser local (o estar en FLORILEGIO_HOSTS);
    - los POST a /api/ deben ser JSON y, si traen Origin, venir de una página local;
    - cada cliente tiene un tope de pedidos a la IA por ventana de tiempo (FLORILEGIO_RATE por 10 minutos).
    """

    WINDOW_S = 600

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope["headers"]}
        if _hostname(headers.get("host", "")) not in _allowed_hosts():
            return await _error(400, "host no permitido")(scope, receive, send)
        if scope["method"] == "POST" and scope["path"].startswith("/api/"):
            if not headers.get("content-type", "").lower().startswith("application/json"):
                return await _error(415, "el pedido debe ser JSON")(scope, receive, send)
            origin = headers.get("origin")
            if origin is not None and not ORIGIN_RE.match(origin):
                return await _error(403, "origen no permitido")(scope, receive, send)
            if not self._take((scope.get("client") or ("?", 0))[0]):
                return await _error(429, "demasiados pedidos a la IA desde este equipo; espera unos minutos")(scope, receive, send)
        return await self.app(scope, receive, send)

    def _take(self, who: str) -> bool:
        try:
            limit = max(1, int(os.environ.get("FLORILEGIO_RATE", "30")))
        except ValueError:
            limit = 30
        now = time.monotonic()
        q = RATE_HITS.setdefault(who, deque())
        while q and now - q[0] > self.WINDOW_S:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True


def _error(status: int, detail: str) -> JSONResponse:
    return JSONResponse({"detail": detail}, status_code=status)


async def _too_large(scope, receive, send):
    await _error(413, f"el pedido es demasiado grande (máximo {MAX_BODY // 1024} KB)")(scope, receive, send)


# ---------------------------------------------------------------------------
# Archivos estáticos: la raíz del repo menos lo interno
# ---------------------------------------------------------------------------

def is_public(path: Path) -> bool:
    """¿Se puede servir este archivo? Se mira la ruta real (resuelve mayúsculas, nombres cortos y enlaces)."""
    try:
        rel = Path(os.path.realpath(path)).relative_to(Path(os.path.realpath(ROOT)))
    except ValueError:
        return False
    parts = [p.lower() for p in rel.parts]
    if any(p.startswith(".") or p in HIDDEN_DIRS for p in parts):
        return False
    return not (parts and parts[-1].endswith((".py", ".pyc", ".env")))


class SiteFiles(StaticFiles):
    def lookup_path(self, path: str):
        full_path, stat_result = super().lookup_path(path)
        if stat_result is not None and not is_public(Path(full_path)):
            return "", None
        return full_path, stat_result

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store"  # desarrollo: cada recarga lee lo recién editado
        return response


# ---------------------------------------------------------------------------
# Aplicación
# ---------------------------------------------------------------------------

LABELS = {
    "bouquet": "ramo", "stems": "tallos", "item": "flor", "n": "cantidad", "wrap": "envoltorio",
    "style": "estilo", "color": "color", "ribbon": "cinta", "card": "tarjeta", "to": "para",
    "message": "mensaje", "from": "de", "name": "nombre", "occasion": "ocasión", "intent": "intención",
    "text": "texto", "feelings": "sentimientos", "petSafe": "mascotas", "hemisphere": "hemisferio",
    "season": "temporada", "exclude": "excluir",
}
MESSAGES = {
    "missing": "falta el campo «{loc}»",
    "string_too_long": "{loc}: máximo {max_length} caracteres",
    "too_long": "{loc}: máximo {max_length} elementos",
    "too_short": "{loc}: se necesita al menos {min_length}",
    "greater_than_equal": "{loc}: debe ser al menos {ge}",
    "less_than_equal": "{loc}: debe ser como máximo {le}",
    "int_parsing": "{loc}: debe ser un número entero",
    "int_type": "{loc}: debe ser un número entero",
    "int_from_float": "{loc}: debe ser un número entero",
    "string_type": "{loc}: debe ser texto",
    "bool_type": "{loc}: debe ser verdadero o falso",
    "bool_parsing": "{loc}: debe ser verdadero o falso",
    "list_type": "{loc}: debe ser una lista",
    "model_type": "{loc}: debe ser un objeto",
    "dict_type": "{loc}: debe ser un objeto",
    "model_attributes_type": "{loc}: debe ser un objeto",
    "literal_error": "{loc}: valor no permitido",
    "enum": "{loc}: valor no permitido",
    "json_invalid": "el cuerpo no es JSON válido",
}


def _loc(loc) -> str:
    out = ""
    for part in loc:
        if part == "body":
            continue
        out += f"[{part}]" if isinstance(part, int) else (("." if out else "") + LABELS.get(part, str(part)))
    return out or "pedido"


def validation_message(errors) -> str:
    """Primer error de validación, en español y en una línea."""
    if not errors:
        return "pedido inválido"
    e = errors[0]
    if e.get("type") == "value_error":  # nuestros validadores ya escriben en español
        return str(e.get("msg", "")).removeprefix("Value error, ")
    loc = tuple(e.get("loc", ()))
    if e.get("type") == "too_short" and loc[-1:] == ("stems",):
        return "el ramo no tiene flores"
    if e.get("type") == "missing" and loc in ((), ("body",)):
        return "falta el cuerpo del pedido"
    template = MESSAGES.get(e.get("type"), "{loc}: valor inválido")
    try:
        return template.format(loc=_loc(loc), **(e.get("ctx") or {}))
    except (KeyError, IndexError):
        return f"{_loc(loc)}: valor inválido"


app = FastAPI(title="Florilegio", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(Guard)
app.add_middleware(BodyLimit)
app.add_middleware(  # el más externo: también el 413 lleva las cabeceras CORS
    CORSMiddleware,
    allow_origin_regex=ORIGIN_RE.pattern,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def _invalid(request: Request, exc: RequestValidationError):
    return _error(422, validation_message(exc.errors()))


@app.exception_handler(agent.AgentError)
async def _agent_error(request: Request, exc: agent.AgentError):
    return _error(exc.status, exc.detail)


@app.get("/api/health")
def health() -> dict:
    return {"ai": agent.ai_enabled(), "model": agent.model_name()}


@app.post("/api/bouquet/interpret")
def interpret(req: InterpretRequest) -> dict:
    return agent.interpret_bouquet(req.bouquet)


@app.post("/api/bouquet/compose")
def compose(req: ComposeRequest) -> dict:
    return agent.compose_bouquet(req)


# Al final: las rutas /api/ de arriba tienen prioridad sobre los archivos.
app.mount("/", SiteFiles(directory=ROOT, html=True), name="site")
