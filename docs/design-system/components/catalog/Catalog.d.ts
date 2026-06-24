import * as React from 'react';
import { CatalogRecord, CatalogSection } from './RecordDetail';

export { CatalogRecord, CatalogSection } from './RecordDetail';

/** Widget state, shared across the aiDeck library. */
export type CatalogState = 'default' | 'loading' | 'empty' | 'error' | 'live';

/**
 * Catalog — searchable + faceted master-detail browser. Manages search,
 * facets, and selection internally; `refs`-kind section chips swap the
 * selection (clearing filters) so the record graph is navigable. Fully
 * domain-agnostic — record shape, sections, facet field, and search fields
 * are all supplied by the consumer.
 *
 * Composes SearchInput · Facet · RecordDetail internally.
 */
export interface CatalogProps {
  /** The flat collection to browse. */
  records: CatalogRecord[];
  /** Ordered detail-section descriptors. A section with no data is skipped. */
  sections: CatalogSection[];
  /** Record field holding facet value(s) for the facet bar + detail meta. Default "tags". */
  facetField?: string;
  /** Record fields the free-text search scans. Default ["id","title","summary"]. */
  searchFields?: string[];
  /** Controlled selection. When null/omitted, the first filtered record is auto-selected. */
  selectedId?: string | null;
  /** Fired with the record id whenever the selection changes (row click or ref chip). */
  onSelect?: (id: string) => void;
  /** Terse copy for the empty state / empty filter result. */
  emptyText?: string;
  /** Widget state. */
  state?: CatalogState;
  /** Error message (state="error"). */
  error?: string;
  /** Concrete next step shown beneath the error (state="error"). */
  suggestion?: string;
}

export function Catalog(props: CatalogProps): React.ReactElement;
