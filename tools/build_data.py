"""Florilegio — valida data/*.json y genera js/gen/data.js.

Los datos viven en JSON (fuente única de la página). La página no puede
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
import unicodedata
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


def build() -> tuple[dict, list[str], list[str]]:
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
        # «mourning»: lo que dice el color en un duelo, si cambia (el blanco, solo recuerdo).
        for m in c["meanings"] + c.get("mourning", []):
            if m not in meanings:
                errors.append(f"color {c['id']}: significado desconocido «{m}»")

    # Vocabulario que leen js/intent.js (lo que siente el texto) y R.parse (lo que pide): una sola escritura para todo.
    # Minúsculas sin tildes (ñ → n), una palabra por espacio, «*» al final de cualquier palabra = cualquier terminación.
    word = re.compile(r"^[a-z0-9]+\*?( [a-z0-9]+\*?)*$")
    for kind, entries in (("ocasión", taxonomy["occasions"]), ("color", taxonomy["colors"])):
        for e in entries:
            for w in e.get("words", []):
                if not word.match(w):
                    errors.append(f"{kind} {e['id']}: palabra «{w}» (minúsculas sin tildes; «*» al final de una palabra)")
    for alias, ids in taxonomy.get("aliases", {}).items():
        if not word.match(alias) or "*" in alias:
            errors.append(f"alias «{alias}»: minúsculas sin tildes, sin «*»")
        for i in ids:
            if i not in seen:
                errors.append(f"alias «{alias}»: ítem desconocido «{i}»")

    # Emoji: solo símbolos (ni letras, con o sin tilde, ni dígitos ni espacios).
    is_emoji = lambda w: 0 < len(w) <= 8 and not any(ch.isalnum() or ch.isspace() for ch in w)
    groups = {"familia", "pareja", "amistad", "trabajo", "escuela", "otros"}
    fold = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c)).lower()
    # Nombres de flores, alias y colores los lee R.parse: una señal de sentimiento no puede ser uno de ellos. Se compilan
    # como en js/intent.js (phraseRe): las flores y los alias admiten plural («girasoles») y «roj*» calza «rojo».
    link = {"de", "del", "la", "el", "los", "las", "y"}

    def phrase_re(p: str, plural: bool) -> re.Pattern:
        parts = []
        for w in fold(p).split():
            if w.endswith("*"):
                parts.append(re.escape(w[:-1]) + "[a-z]*")
            else:
                parts.append(re.escape(w) + ("(?:es|s)?" if plural and w not in link and not w.endswith("s") else ""))
        return re.compile(r"\s+".join(parts))

    reserved = [phrase_re(it["name"], True) for it in items] + [phrase_re(a, True) for a in taxonomy.get("aliases", {})]
    reserved += [phrase_re(w, False) for c in taxonomy["colors"] for w in c.get("words", [])]
    is_reserved = lambda w: any(r.fullmatch(w.rstrip("*")) for r in reserved)

    def mix_ok(where, mix):
        if not mix:
            errors.append(f"{where}: mezcla vacía")
            return
        for m, w in mix.items():
            if m not in meanings:
                errors.append(f"{where}: significado desconocido «{m}»")
            if not (isinstance(w, (int, float)) and not isinstance(w, bool) and 0 < w <= 1):
                errors.append(f"{where}: peso {w!r} fuera de (0, 1]")
        if abs(sum(mix.values()) - 1) > 0.011:
            errors.append(f"{where}: los pesos suman {sum(mix.values()):.2f} (deben sumar 1)")

    def cues(where, words, seen_at, allow_emoji=False):
        for w in words:
            if allow_emoji:
                # intent.js busca los emoji sin bordes de palabra: «xo» calzaría dentro de «exótico».
                if not is_emoji(w):
                    errors.append(f"{where}: emoji «{w}» (solo símbolos, sin letras ni números)")
                    continue
            elif not word.match(w):
                errors.append(f"{where}: señal «{w}» (minúsculas sin tildes; «*» al final de una palabra)")
                continue
            elif " " not in w and w.endswith("*") and len(w) < 5:
                errors.append(f"{where}: raíz «{w}» muy corta (al menos 4 letras antes de «*»)")
            elif is_reserved(w):
                errors.append(f"{where}: «{w}» es una flor, un alias o un color (lo lee R.parse)")
            if w in seen_at:
                errors.append(f"«{w}» está repetida: {seen_at[w]} y {where}")
            else:
                seen_at[w] = where

    for m in taxonomy["meanings"]:
        where = f"significado {m['id']}"
        for k in ("lexicon", "strong"):
            if k in m:
                errors.append(f"{where}: «{k}» se mudó a «intents»")
        if "near" not in m:
            errors.append(f"{where}: falta «near» (significados cercanos)")
        else:
            mix_ok(where + ".near", m["near"])
            if m["id"] in m["near"]:
                errors.append(f"{where}.near: no puede incluirse a sí mismo")
    amor = next((m for m in taxonomy["meanings"] if m["id"] == "Amor"), {})
    if not amor.get("tender"):
        errors.append("significado Amor: falta «tender» (cómo se lee el amor que no es romántico)")

    seen_cue: dict[str, str] = {}
    cues("neutral", taxonomy.get("neutral", []), seen_cue)
    intents = taxonomy.get("intents", [])
    intent_ids = {e.get("id") for e in intents}
    ids: set[str] = set()
    for e in intents:
        where = f"intención {e.get('id', '?')}"
        if not re.match(r"^[a-z]+(-[a-z]+)*$", e.get("id", "")) or e["id"] in ids:
            errors.append(f"{where}: id inválido o repetido")
        ids.add(e.get("id", ""))
        label = e.get("label", "")
        if not label or re.match(r"^(el|lo|que) ", label):
            errors.append(f"{where}: «label» debe ser un sustantivo que siga a «Leí en lo que escribiste» («nostalgia», «un logro»)")
        mix_ok(where, e.get("mix", {}))
        for g, mx in e.get("with", {}).items():
            if g not in groups:
                errors.append(f"{where}: grupo «{g}» desconocido en «with»")
            mix_ok(f"{where}.with.{g}", mx)
        for key in ("negate", "avoid"):
            for m in e.get(key, []):
                if m not in meanings:
                    errors.append(f"{where}.{key}: significado desconocido «{m}»")
        for key in ("mourning", "romance", "self", "quietInMourning"):
            if key in e and not isinstance(e[key], bool):
                errors.append(f"{where}: «{key}» debe ser true o false")
        if e.get("inMourning") and e["inMourning"] not in intent_ids:
            errors.append(f"{where}: «inMourning» apunta a una intención desconocida")
        if not (e.get("strong") or e.get("words") or e.get("emoji")):
            errors.append(f"{where}: sin palabras")
        cues(where, e.get("strong", []) + e.get("words", []), seen_cue)
        cues(where, e.get("emoji", []), seen_cue, allow_emoji=True)

    seen_who: dict[str, str] = {}
    rids: set[str] = set()
    for r in taxonomy.get("recipients", []):
        where = f"destinatario {r.get('id', '?')}"
        if r.get("id") in rids or not r.get("id"):
            errors.append(f"{where}: id repetido o vacío")
        rids.add(r.get("id"))
        if r.get("group") not in groups:
            errors.append(f"{where}: grupo «{r.get('group')}» desconocido")
        mix_ok(where, r.get("mix", {}))
        for m in r.get("avoid", []):
            if m not in meanings:
                errors.append(f"{where}.avoid: significado desconocido «{m}»")
        if r.get("day") and r["day"] not in occasions:
            errors.append(f"{where}: ocasión desconocida «{r['day']}»")
        if "sober" in r and not isinstance(r["sober"], bool):
            errors.append(f"{where}: «sober» debe ser true o false")
        cues(where, r.get("words", []), seen_who)

    for n in taxonomy.get("names", []):
        if not re.match(r"^[a-z]+$", n):
            errors.append(f"nombre «{n}»: una palabra en minúsculas sin tildes")
    for k, lst in taxonomy.get("modifiers", {}).items():
        if k not in ("intensifiers", "after", "softeners", "emphatic"):
            errors.append(f"modifiers: lista desconocida «{k}»")
        for w in lst:
            if not word.match(w) or "*" in w:
                errors.append(f"modifiers.{k}: «{w}» (minúsculas sin tildes, sin «*»)")

    # Avisos: huecos de cobertura del catálogo que no impiden generar (los decide quien cuida los datos).
    warnings: list[str] = []
    toxic = lambda it: any(it["care"]["toxicity"][k] in ("media", "alta") for k in ("cats", "dogs"))
    in_season = lambda it, s: not it["seasons"] or s in it["seasons"] or len(it["seasons"]) >= 4
    for m in [x["id"] for x in taxonomy["meanings"]]:
        car = [it for it in items if it["bouquet"]["florist"] and it["bouquet"]["role"] in ("focal", "secondary", "spike", "filler") and m in it["meanings"]]
        if not car:
            warnings.append(f"{m}: ninguna flor de florería lo dice")
            continue
        if all(toxic(it) for it in car):
            warnings.append(f"{m}: todas las flores que lo dicen son tóxicas para mascotas ({', '.join(it['name'].lower() for it in car)})")
        empty = [s for s in taxonomy["seasons"] if not any(in_season(it, s) for it in car)]
        if empty:
            warnings.append(f"{m}: sin flores de temporada en {', '.join(empty)}")
    for it in items:
        if it["care"]["toxicity"]["cats"] == "desconocida" or it["care"]["toxicity"]["dogs"] == "desconocida":
            warnings.append(f"{it['name']}: toxicidad desconocida; con mascotas se trata como segura")

    data = {"flowers": flowers, "fillers": fillers, "taxonomy": taxonomy, "popular": popular}
    return data, errors, warnings


def render(data: dict) -> str:
    body = json.dumps(data, ensure_ascii=False, indent=1)
    return HEADER + "window.FL = window.FL || {};\nwindow.FL.data = " + body + ";\n"


def main(argv: list[str]) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    data, errors, warnings = build()
    if errors:
        print("Datos con errores:", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        return 1
    if warnings:
        print("Avisos del catálogo (no impiden generar):")
        for w in warnings:
            print("  - " + w)
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
