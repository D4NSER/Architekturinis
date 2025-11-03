import { memo } from 'react';
import type { CSSProperties } from 'react';

import { ALLERGEN_LABEL_MAP } from '../constants/allergens';
import type { AllergenId } from '../types';

type BadgeSize = 'default' | 'compact';

const getBadgeStyle = (size: BadgeSize, highlight: boolean) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: size === 'compact' ? '0.2rem 0.5rem' : '0.25rem 0.6rem',
  borderRadius: 999,
  backgroundColor: highlight ? '#fee2e2' : '#eef2ff',
  color: highlight ? '#991b1b' : '#312e81',
  fontSize: size === 'compact' ? '0.75rem' : '0.8rem',
  fontWeight: 500,
});

interface AllergenBadgeListProps {
  allergens: AllergenId[];
  highlight?: (id: AllergenId) => boolean;
  emptyLabel?: string;
  size?: BadgeSize;
  style?: CSSProperties;
}

export const AllergenBadgeList = memo(
  ({ allergens, highlight, emptyLabel, size = 'default', style }: AllergenBadgeListProps) => {
    if (!allergens.length) {
      return emptyLabel ? (
        <span style={{ fontSize: '0.85rem', color: '#047857', ...style }}>{emptyLabel}</span>
      ) : null;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>
        {allergens.map((id) => {
          const label = ALLERGEN_LABEL_MAP[id] ?? id;
          const isHighlighted = highlight?.(id) ?? false;
          return (
            <span key={id} style={getBadgeStyle(size, isHighlighted)}>
              {label}
              {isHighlighted && <span aria-hidden="true">⚠</span>}
            </span>
          );
        })}
      </div>
    );
  },
);

AllergenBadgeList.displayName = 'AllergenBadgeList';
