import type { AllergenId } from '../types';

export const ALLERGEN_OPTIONS: ReadonlyArray<{ id: AllergenId; label: string }> = [
  { id: 'gluten', label: 'Glitimas (kviečiai, rugiai, miežiai)' },
  { id: 'milk', label: 'Pienas ir laktozė' },
  { id: 'egg', label: 'Kiaušiniai' },
  { id: 'peanut', label: 'Žemės riešutai' },
  { id: 'tree_nut', label: 'Medžių riešutai' },
  { id: 'soy', label: 'Soja' },
  { id: 'fish', label: 'Žuvis' },
  { id: 'shellfish', label: 'Vėžiagyviai ir moliuskai' },
  { id: 'sesame', label: 'Sezamo sėklos' },
  { id: 'mustard', label: 'Garstyčios' },
  { id: 'celery', label: 'Salieras' },
  { id: 'sulfites', label: 'Sulfatai / SO₂' },
  { id: 'lupin', label: 'Lubinai' },
] as const;

export const ALLERGEN_LABEL_MAP: Record<AllergenId, string> = ALLERGEN_OPTIONS.reduce(
  (acc, option) => {
    acc[option.id] = option.label;
    return acc;
  },
  {} as Record<AllergenId, string>,
);

export const formatAllergenLabels = (allergens: AllergenId[]): string[] =>
  allergens.map((id) => ALLERGEN_LABEL_MAP[id] ?? id);
