"""Florilegio — modelos del servidor (Pydantic v2).

Entradas: lo que manda la página, validado contra el catálogo y los límites de taxonomy.json.
Salidas del modelo: lo que Claude devuelve con salida estructurada. Los ids de flores, significados,
ocasiones, envoltorios y cintas son Literal armados desde el catálogo, así el modelo no puede
inventar flores. Las salidas no llevan mínimos ni máximos (la salida estructurada no los admite):
los rangos se corrigen después, en agent.py.
"""

import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from . import catalog as C

L = C.LIMITS
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")

ItemId = Literal[C.ITEM_IDS]
MeaningId = Literal[C.MEANING_IDS]
OccasionId = Literal[C.OCCASION_IDS]
WrapStyle = Literal[C.WRAP_STYLES]
WrapColor = Literal[("",) + C.WRAP_COLORS]
RibbonColor = Literal[C.RIBBONS]


def _blank_to_none(v):
    return None if v is None or (isinstance(v, str) and not v.strip()) else v


def _hex(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return None
    if not isinstance(v, str) or not HEX.match(v):
        raise ValueError(f"«{v}» no es un color #rrggbb")
    return v.lower()


def _feelings(v: list[str]) -> list[str]:
    bad = [m for m in v if m not in C.MEANINGS]
    if bad:
        raise ValueError(f"sentimiento desconocido: «{bad[0]}»")
    return list(dict.fromkeys(v))


def _occasion(v: Optional[str]) -> Optional[str]:
    if v is not None and v not in C.OCCASIONS:
        raise ValueError(f"ocasión desconocida: «{v}»")
    return v


# ---------------------------------------------------------------------------
# Entradas (la página → el servidor)
# ---------------------------------------------------------------------------

class _In(BaseModel):
    # La página manda el ramo completo (id, fechas, layoutSeed…): lo que no se usa se ignora.
    model_config = ConfigDict(extra="ignore")


class StemIn(_In):
    item: str = Field(max_length=40)
    n: int = Field(ge=1, le=L["stemsPerItem"])

    @field_validator("item")
    @classmethod
    def _known(cls, v: str) -> str:
        if v not in C.ITEMS:
            raise ValueError(f"«{v}» no está en el catálogo")
        return v


class WrapIn(_In):
    style: WrapStyle = "kraft"
    color: Optional[str] = None

    _color = field_validator("color")(_hex)


class RibbonIn(_In):
    color: Optional[str] = None

    _color = field_validator("color")(_hex)


class CardIn(_In):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    to: str = Field("", max_length=60)
    message: str = Field("", max_length=L["message"])
    from_: str = Field("", max_length=60, alias="from")


class IntentIn(_In):
    text: str = Field("", max_length=L["intent"])
    feelings: list[str] = Field(default_factory=list, max_length=len(C.MEANINGS))

    _feel = field_validator("feelings")(_feelings)


class BouquetIn(_In):
    name: str = Field("", max_length=80)
    occasion: Optional[str] = None
    intent: Optional[IntentIn] = None
    stems: list[StemIn] = Field(min_length=1, max_length=4 * L["items"])
    wrap: WrapIn = Field(default_factory=WrapIn)
    ribbon: RibbonIn = Field(default_factory=RibbonIn)
    card: Optional[CardIn] = None

    _blank = field_validator("occasion", mode="before")(_blank_to_none)
    _occ = field_validator("occasion")(_occasion)

    @model_validator(mode="after")
    def _limits(self):
        # Mismo criterio que FL.bouquet.normalize: se suman los repetidos y luego se miden los límites.
        merged: dict[str, int] = {}
        for s in self.stems:
            merged[s.item] = merged.get(s.item, 0) + s.n
        if len(merged) > L["items"]:
            raise ValueError(f"el ramo admite hasta {L['items']} flores distintas (llegaron {len(merged)})")
        big = next((i for i, n in merged.items() if n > L["stemsPerItem"]), None)
        if big:
            raise ValueError(f"máximo {L['stemsPerItem']} tallos por flor ({C.name(big)}: {merged[big]})")
        total = sum(merged.values())
        if total > L["stems"]:
            raise ValueError(f"el ramo admite hasta {L['stems']} tallos en total (llegaron {total})")
        self.stems = [StemIn(item=i, n=n) for i, n in merged.items()]
        return self


class InterpretRequest(_In):
    bouquet: BouquetIn


class ComposeRequest(_In):
    text: str = Field("", max_length=L["intent"])
    feelings: list[str] = Field(default_factory=list, max_length=len(C.MEANINGS))
    occasion: Optional[str] = None
    petSafe: bool = False
    hemisphere: Literal["N", "S"] = "S"
    season: Optional[str] = None
    exclude: list[str] = Field(default_factory=list, max_length=len(C.ITEMS))

    _feel = field_validator("feelings")(_feelings)
    _blank = field_validator("occasion", "season", mode="before")(_blank_to_none)
    _occ = field_validator("occasion")(_occasion)

    @field_validator("season")
    @classmethod
    def _season(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in C.SEASONS:
            raise ValueError(f"temporada desconocida: «{v}»")
        return v

    @field_validator("exclude")
    @classmethod
    def _exclude(cls, v: list[str]) -> list[str]:
        bad = [i for i in v if i not in C.ITEMS]
        if bad:
            raise ValueError(f"«{bad[0]}» no está en el catálogo")
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def _something(self):
        if not self.text.strip() and not self.feelings and not self.occasion:
            raise ValueError("escribe lo que quieres decir o elige un sentimiento")
        return self


# ---------------------------------------------------------------------------
# Salidas estructuradas (Claude → el servidor). Sin restricciones numéricas.
# ---------------------------------------------------------------------------

class MeaningWeight(BaseModel):
    id: MeaningId
    weight: float = Field(description="Peso entre 0 y 1; los pesos de la lista suman 1.")


class ItemSays(BaseModel):
    item: ItemId
    says: str = Field(description="Una oración: lo que aporta este ítem al mensaje del ramo.")


class Suggestion(BaseModel):
    action: Literal["add", "remove", "swap"]
    item: ItemId = Field(description="add y swap: el ítem que entraría; remove: el ítem que saldría.")
    why: str = Field(description="Una oración breve.")


class ReadingOut(BaseModel):
    summary: str = Field(description="De 2 a 5 oraciones sobre lo que dice el ramo en conjunto.")
    tone: str = Field(description="Una o dos palabras, por ejemplo: romántico, sereno, festivo, solemne.")
    meanings: list[MeaningWeight] = Field(description="De 1 a 4 significados, del más fuerte al más débil.")
    per_item: list[ItemSays] = Field(description="Una entrada por cada ítem del ramo.")
    cultural_notes: list[str] = Field(description="De 0 a 3 notas breves cuando el sentido cambia según la cultura o la época.")
    warnings: list[str] = Field(description="Toxicidad, precauciones del catálogo, número par de flores en un regalo.")
    suggestions: list[Suggestion] = Field(description="De 0 a 3 cambios concretos.")


class StemOut(BaseModel):
    item: ItemId
    n: int = Field(description="Tallos de este ítem (de 1 a 24).")
    why: str = Field(description="Una oración: qué aporta este ítem al ramo.")


class ComposeOut(BaseModel):
    stems: list[StemOut] = Field(description="De 2 a 5 ítems distintos; el primero es el protagonista.")
    wrap_style: WrapStyle
    wrap_color: WrapColor = Field(description="Un color del estilo elegido; vacío si el estilo es «ninguno».")
    ribbon_color: RibbonColor
    occasion: Optional[OccasionId] = Field(description="La ocasión si el pedido la trae o la deja clara; si no, null.")
    lead: str = Field(description="1 o 2 oraciones, en segunda persona, con la idea del ramo.")
    reading: ReadingOut = Field(description="La lectura del ramo propuesto.")
