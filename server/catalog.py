"""Florilegio — catálogo del servidor: lee data/*.json una sola vez.

Expone los ids válidos (flores, significados, ocasiones, temporadas, envoltorios, cintas),
los límites del ramo y un texto compacto del catálogo para el prompt de sistema. Ese texto
sale siempre igual, byte a byte (mismo orden, sin fechas), para que la caché de prompts sirva.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def _load(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


_FLOWERS: list[dict] = _load("flowers.json")["flowers"]
_FILLERS: list[dict] = _load("fillers.json")["fillers"]
TAXONOMY: dict = _load("taxonomy.json")

ITEMS: dict[str, dict] = {it["id"]: it for it in _FLOWERS + _FILLERS}
ITEM_IDS: tuple[str, ...] = tuple(ITEMS)
MEANINGS: dict[str, dict] = {m["id"]: m for m in TAXONOMY["meanings"]}
MEANING_IDS: tuple[str, ...] = tuple(MEANINGS)
OCCASIONS: dict[str, dict] = {o["id"]: o for o in TAXONOMY["occasions"]}
OCCASION_IDS: tuple[str, ...] = tuple(OCCASIONS)
SEASONS: tuple[str, ...] = tuple(TAXONOMY["seasons"])
SEASON_MONTHS: dict[str, dict[str, list[int]]] = TAXONOMY["seasonMonths"]
WRAPS: dict[str, dict] = {w["id"]: w for w in TAXONOMY["wraps"]}
WRAP_STYLES: tuple[str, ...] = tuple(WRAPS)
WRAP_COLORS: tuple[str, ...] = tuple(dict.fromkeys(c for w in TAXONOMY["wraps"] for c in w["colors"]))
RIBBONS: tuple[str, ...] = tuple(TAXONOMY["ribbons"])
ROLES: dict[str, dict] = TAXONOMY["roles"]
LIMITS: dict[str, int] = TAXONOMY["limits"]

MOURNING = ("condolencias", "todos-santos")
TOXIC = ("media", "alta")  # niveles que se evitan en casas con mascotas (igual que js/meaning.js)
ANIMALS = (("cats", "gatos"), ("dogs", "perros"))


def name(item_id: str) -> str:
    return ITEMS[item_id]["name"]


def is_flower(item_id: str) -> bool:
    return ITEMS[item_id]["type"] == "flower"


def toxic_for(item_id: str) -> list[tuple[str, str]]:
    """[(animal, nivel)] con toxicidad media o alta."""
    tox = ITEMS[item_id]["care"]["toxicity"]
    return [(es, tox[k]) for k, es in ANIMALS if tox[k] in TOXIC]


def pet_unsafe(item_id: str) -> bool:
    return bool(toxic_for(item_id))


def season_of(month: int, hemisphere: str) -> str:
    table = SEASON_MONTHS["S" if hemisphere == "S" else "N"]
    return next((s for s, months in table.items() if month in months), SEASONS[0])


# ---------------------------------------------------------------------------
# Texto del catálogo para el prompt (determinista)
# ---------------------------------------------------------------------------

_TAG = re.compile(r"<[^>]+>")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[«¿¡A-ZÁÉÍÓÚÑ])")


def plain(s: str | None) -> str:
    """Sin etiquetas HTML ni entidades, con espacios normalizados."""
    return " ".join(html.unescape(_TAG.sub("", s or "")).split())


def first_sentence(s: str | None) -> str:
    t = plain(s)
    return _SENTENCE_END.split(t, 1)[0] if t else ""


def _item_text(it: dict) -> str:
    b, care = it["bouquet"], it["care"]
    tox = care["toxicity"]
    head = [
        f"{it['id']} — {it['name']}",
        "flor" if it["type"] == "flower" else "complemento",
        "colores: " + ", ".join(it["colors"]),
        "temporada: " + ("todo el año" if len(it["seasons"]) >= len(SEASONS) else ", ".join(it["seasons"])),
        "significados: " + (", ".join(it["meanings"]) or "sin significado propio"),
        f"toxicidad gatos: {tox['cats']}, perros: {tox['dogs']}",
        "florería: " + ("sí" if b["florist"] else "no"),
    ]
    if care["form"] == "potted":
        head.append("se vende en maceta")
    gift = it["culture"]["gift"] if it["type"] == "flower" else it["symbol"]
    lines = ["- " + " | ".join(head), "  regalo: " + first_sentence(gift)]
    note = it.get("culture", {}).get("note")
    if note:  # completa: a veces la segunda oración corrige a la primera (girasol y Clitia)
        lines.append("  nota cultural: " + plain(note))
    if b.get("caution"):
        lines.append("  precaución: " + plain(b["caution"]))
    return "\n".join(lines)


def _catalog_text() -> str:
    out = []
    for role, info in ROLES.items():
        items = sorted((it for it in ITEMS.values() if it["bouquet"]["role"] == role), key=lambda it: it["id"])
        if items:
            out.append(f"## {info['name']} ({role}): {info['desc']}")
            out.extend(_item_text(it) for it in items)
            out.append("")
    return "\n".join(out).rstrip()


def _taxonomy_text() -> str:
    t = TAXONOMY
    lines = ["Significados (id: cómo se dice):"]
    lines += [f"- {m['id']}: {m['phrase']}" for m in t["meanings"]]
    lines.append("")
    lines.append("Colores:")
    lines += [f"- {c['id']} ({', '.join(c['meanings']) or 'sin significado propio'}): {c['text']}" for c in t["colors"]]
    lines.append("")
    lines.append("Temporadas por hemisferio (meses):")
    for hemi, label in (("S", "sur"), ("N", "norte")):
        lines.append(f"- {label}: " + "; ".join(f"{s} {', '.join(map(str, m))}" for s, m in SEASON_MONTHS[hemi].items()))
    lines.append("")
    lines.append("Ocasiones (id: nombre; significados; nota):")
    for o in t["occasions"]:
        extra = f"; {o['note']}" if o.get("note") else ""
        lines.append(f"- {o['id']}: {o['name']}; {', '.join(o['meanings'])}{extra}")
    lines.append("")
    lines.append("Envoltorios (estilo: nombre; colores):")
    for w in t["wraps"]:
        lines.append(f"- {w['id']}: {w['name']}; " + (", ".join(w["colors"]) or "sin color"))
    lines.append("Cintas (colores): " + ", ".join(RIBBONS))
    lines.append("")
    lines.append("Números de flores:")
    lines += [f"- {k}: {v}" for k, v in t["numbers"].items()]
    lines.append("")
    L = LIMITS
    lines.append(
        f"Límites del ramo: de 1 a {L['items']} ítems distintos, de 1 a {L['stemsPerItem']} tallos por ítem "
        f"y hasta {L['stems']} tallos en total."
    )
    return "\n".join(lines)


CATALOG_TEXT: str = _catalog_text()
TAXONOMY_TEXT: str = _taxonomy_text()
