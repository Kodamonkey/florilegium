"""Florilegio — valida data/*.json y genera js/gen/data.js.

Los datos viven en JSON (fuente única para la página y el servidor). La página no puede
leer JSON desde file://, así que este script los envuelve en un script clásico.

Uso:
    python tools/build_data.py           # valida y escribe js/gen/data.js
    python tools/build_data.py --check   # valida y falla si js/gen/data.js está desactualizado

Solo usa la biblioteca estándar.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SCHEMA = DATA / "schema"
OUT = ROOT / "js" / "gen" / "data.js"

HEADER = "/* Generado por tools/build_data.py desde data/*.json. No editar a mano: edita los JSON y vuelve a ejecutar el script. */\n"


# ---------------------------------------------------------------------------
# Validador mínimo de JSON Schema (el subconjunto que usan data/schema/*.json)
# ---------------------------------------------------------------------------

class SchemaSet:
    def __init__(self, folder: Path):
        self.docs = {p.name: json.loads(p.read_text(encoding="utf-8")) for p in folder.glob("*.schema.json")}

    def resolve(self, ref: str, base: str) -> tuple[dict, str]:
        doc_name, _, pointer = ref.partition("#")
        doc_name = doc_name or base
        node = self.docs[doc_name]
        for part in [p for p in pointer.split("/") if p]:
            node = node[part]
        return node, doc_name

    def validate(self, value, schema: dict, base: str, path: str, errors: list[str]) -> None:
        if "$ref" in schema:
            target, target_base = self.resolve(schema["$ref"], base)
            self.validate(value, target, target_base, path, errors)
        if "const" in schema and value != schema["const"]:
            errors.append(f"{path}: debe ser {schema['const']!r}")
        if "enum" in schema and value not in schema["enum"]:
            errors.append(f"{path}: {value!r} no está en {schema['enum']}")
        t = schema.get("type")
        if t and not _is_type(value, t):
            errors.append(f"{path}: se esperaba {t}, llegó {type(value).__name__}")
            return
        if isinstance(value, str):
            if "minLength" in schema and len(value) < schema["minLength"]:
                errors.append(f"{path}: texto demasiado corto")
            if "maxLength" in schema and len(value) > schema["maxLength"]:
                errors.append(f"{path}: texto de más de {schema['maxLength']} caracteres")
            if "pattern" in schema and not re.search(schema["pattern"], value):
                errors.append(f"{path}: {value!r} no calza con {schema['pattern']}")
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if "minimum" in schema and value < schema["minimum"]:
                errors.append(f"{path}: {value} < {schema['minimum']}")
            if "maximum" in schema and value > schema["maximum"]:
                errors.append(f"{path}: {value} > {schema['maximum']}")
        if isinstance(value, list):
            if "minItems" in schema and len(value) < schema["minItems"]:
                errors.append(f"{path}: necesita al menos {schema['minItems']} elementos")
            if "maxItems" in schema and len(value) > schema["maxItems"]:
                errors.append(f"{path}: admite como máximo {schema['maxItems']} elementos")
            if "items" in schema:
                for i, v in enumerate(value):
                    self.validate(v, schema["items"], base, f"{path}[{i}]", errors)
        if isinstance(value, dict):
            for key in schema.get("required", []):
                if key not in value:
                    errors.append(f"{path}: falta «{key}»")
            props = schema.get("properties", {})
            extra = schema.get("additionalProperties", True)
            for key, v in value.items():
                if key in props:
                    self.validate(v, props[key], base, f"{path}.{key}", errors)
                elif extra is False:
                    errors.append(f"{path}: propiedad no prevista «{key}»")
                elif isinstance(extra, dict):
                    self.validate(v, extra, base, f"{path}.{key}", errors)


def _is_type(value, t) -> bool:
    if isinstance(t, list):
        return any(_is_type(value, x) for x in t)
    return {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "boolean": isinstance(value, bool),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "null": value is None,
    }[t]


# ---------------------------------------------------------------------------
# Carga y verificaciones cruzadas
# ---------------------------------------------------------------------------

def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def js_names(pattern: str, *files: str) -> set[str]:
    found: set[str] = set()
    for f in files:
        if (ROOT / f).exists():
            found |= set(re.findall(pattern, (ROOT / f).read_text(encoding="utf-8"), re.M))
    return found


def garden_ids() -> set[str]:
    src = (ROOT / "js" / "garden.js").read_text(encoding="utf-8")
    ids: set[str] = set()
    for name in ("BACK", "MID", "FRONT"):
        m = re.search(rf"const {name} = \[([^\]]*)\]", src)
        if m:
            ids |= set(re.findall(r"'([a-z0-9-]+)'", m.group(1)))
    return ids


def build() -> tuple[dict, list[str]]:
    schemas = SchemaSet(SCHEMA)
    flowers = load("flowers.json")["flowers"]
    fillers = load("fillers.json")["fillers"]
    taxonomy = load("taxonomy.json")
    popular = load("popular.json")["popular"]
    errors: list[str] = []

    for f in flowers:
        schemas.validate(f, {"$ref": "#/$defs/flower"}, "catalog.schema.json", f"flores.{f.get('id', '?')}", errors)
    for f in fillers:
        schemas.validate(f, {"$ref": "#/$defs/filler"}, "catalog.schema.json", f"rellenos.{f.get('id', '?')}", errors)
    for p in popular:
        schemas.validate(p, {"$ref": "#/$defs/popular"}, "catalog.schema.json", f"populares.{p.get('id', '?')}", errors)

    meanings = {m["id"] for m in taxonomy["meanings"]}
    colors = {c["id"] for c in taxonomy["colors"]}
    seasons = set(taxonomy["seasons"])
    occasions = {o["id"] for o in taxonomy["occasions"]}
    limits = taxonomy["limits"]

    items = flowers + fillers
    seen: set[str] = set()
    for it in items:
        if it["id"] in seen:
            errors.append(f"id repetido: {it['id']}")
        seen.add(it["id"])
        for m in it["meanings"]:
            if m not in meanings:
                errors.append(f"{it['id']}: significado desconocido «{m}»")
        for c in it["colors"]:
            if c not in colors:
                errors.append(f"{it['id']}: color desconocido «{c}»")
        for s in it["seasons"]:
            if s not in seasons:
                errors.append(f"{it['id']}: estación desconocida «{s}»")
        lo, hi = it["care"]["vaseLife"]
        if lo > hi:
            errors.append(f"{it['id']}: vaseLife invertido")

    arts = js_names(r"^\s*A\.(\w+) = function", "js/art-a.js", "js/art-b.js", "js/art-c.js")
    for it in items:
        if it["art"] not in arts:
            errors.append(f"{it['id']}: no hay dibujo FL.art.{it['art']}")
    stems = js_names(r"^\s{4}(\w+): \{", "js/art-stems.js")
    placed = garden_ids()
    for f in flowers:
        if f["art"] not in stems:
            errors.append(f"{f['id']}: falta FL.stemCfg.{f['art']} en js/art-stems.js")
        if f["id"] not in placed:
            errors.append(f"{f['id']}: no está en ninguna fila del jardín (BACK/MID/FRONT en js/garden.js)")

    for p in popular:
        total = 0
        for s in p["stems"]:
            if s["item"] not in seen:
                errors.append(f"populares.{p['id']}: ítem desconocido «{s['item']}»")
            total += s["n"]
        if total > limits["stems"]:
            errors.append(f"populares.{p['id']}: {total} tallos (máximo {limits['stems']})")
        for o in p["occasions"]:
            if o not in occasions:
                errors.append(f"populares.{p['id']}: ocasión desconocida «{o}»")
        for s in p["seasons"]:
            if s not in seasons:
                errors.append(f"populares.{p['id']}: estación desconocida «{s}»")
    for o in taxonomy["occasions"]:
        for m in o["meanings"]:
            if m not in meanings:
                errors.append(f"ocasión {o['id']}: significado desconocido «{m}»")
    for c in taxonomy["colors"]:
        for m in c["meanings"]:
            if m not in meanings:
                errors.append(f"color {c['id']}: significado desconocido «{m}»")

    data = {"flowers": flowers, "fillers": fillers, "taxonomy": taxonomy, "popular": popular}
    return data, errors


def render(data: dict) -> str:
    body = json.dumps(data, ensure_ascii=False, indent=1)
    return HEADER + "window.FL = window.FL || {};\nwindow.FL.data = " + body + ";\n"


def main(argv: list[str]) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    data, errors = build()
    if errors:
        print("Datos con errores:", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        return 1
    out = render(data)
    # Git en Windows puede entregar el archivo con CRLF (core.autocrlf): se compara sin eso.
    current = OUT.read_text(encoding="utf-8").replace("\r\n", "\n") if OUT.exists() else ""
    if "--check" in argv:
        if current != out:
            print("js/gen/data.js está desactualizado: ejecuta python tools/build_data.py", file=sys.stderr)
            return 1
        print(f"OK: {len(data['flowers'])} flores, {len(data['fillers'])} rellenos, {len(data['popular'])} ramos populares.")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8", newline="\n") as fh:
        fh.write(out)
    print(f"Escrito {OUT.relative_to(ROOT)}: {len(data['flowers'])} flores, {len(data['fillers'])} rellenos, {len(data['popular'])} ramos populares.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
