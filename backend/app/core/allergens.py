from __future__ import annotations

from typing import Iterable, List


ALLERGEN_OPTIONS: List[dict[str, str]] = [
    {"id": "gluten", "label": "Glitimas (kviečiai, rugiai, miežiai)"},
    {"id": "milk", "label": "Pienas ir laktozė"},
    {"id": "egg", "label": "Kiaušiniai"},
    {"id": "peanut", "label": "Žemės riešutai"},
    {"id": "tree_nut", "label": "Medžių riešutai (migdolai, lazdyno riešutai ir kt.)"},
    {"id": "soy", "label": "Soja"},
    {"id": "fish", "label": "Žuvis"},
    {"id": "shellfish", "label": "Vėžiagyviai ir moliuskai"},
    {"id": "sesame", "label": "Sezamo sėklos"},
    {"id": "mustard", "label": "Garstyčios"},
    {"id": "celery", "label": "Salieras"},
    {"id": "sulfites", "label": "Sulfatai ir sieros dioksidas"},
    {"id": "lupin", "label": "Lubinai"},
]

ALLERGEN_IDS = [option["id"] for option in ALLERGEN_OPTIONS]
_ALLERGEN_SORT_INDEX = {slug: index for index, slug in enumerate(ALLERGEN_IDS)}


def normalize_allergen_id(value: str | None) -> str | None:
    if not value:
        return None
    slug = value.strip().lower().replace(" ", "_").replace("-", "_")
    return slug if slug in _ALLERGEN_SORT_INDEX else None


def normalize_allergen_list(values: Iterable[str] | None) -> list[str]:
    if not values:
        return []

    unique: set[str] = set()
    for value in values:
        normalized = normalize_allergen_id(value)
        if normalized:
            unique.add(normalized)

    return sorted(unique, key=lambda slug: _ALLERGEN_SORT_INDEX.get(slug, 999))


def serialize_allergens(values: Iterable[str] | None) -> str | None:
    normalized = normalize_allergen_list(values)
    if not normalized:
        return None
    return ",".join(normalized)


def deserialize_allergens(value: str | None) -> list[str]:
    if not value:
        return []
    return normalize_allergen_list(value.split(","))
