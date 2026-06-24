import * as React from 'react';

/**
 * Facet — a single toggleable filter pill. Stateless; the parent owns the
 * active flag and the click handler. Active pills take the status-info
 * background, line, and text treatment.
 */
export interface FacetProps {
  /** Pill text. */
  label: string;
  /** Whether the pill reads as selected. */
  active?: boolean;
  /** Click handler — toggle the active flag in the parent. */
  onClick?: (e: React.MouseEvent) => void;
}

export function Facet(props: FacetProps): React.ReactElement;
