import * as React from 'react';

/** One record in the catalog. `id` is required; everything else is optional
 *  and addressed by the section descriptors / facetField the consumer passes.
 *  Domain field names live in the data, never in this type. */
export interface CatalogRecord {
  id: string;
  icon?: string;
  title?: string;
  oneLiner?: string;
  badge?: string | number;
  [field: string]: any;
}

/** A column in a `fields`-kind section's table. */
export interface FieldColumn {
  key: string;
  label: string;
  mono?: boolean;
  /** Render the cell as a glyph from its truthiness. */
  bool?: boolean;
  trueGlyph?: string;
  falseGlyph?: string;
}

/** One detail section. A section whose backing field(s) are empty does not render. */
export type CatalogSection =
  | { kind: 'summary'; field: string; label: string }
  | { kind: 'examples'; field: string; label: string }
  | { kind: 'prosCons'; proField: string; conField: string; label: string; proGlyph?: string; conGlyph?: string }
  | { kind: 'subItems'; field: string; label: string; groupKey?: string; nameKey?: string; descKey?: string }
  | { kind: 'fields'; field: string; label: string; columns: FieldColumn[] }
  | { kind: 'meta'; label: string; groups: Array<{ field: string; prefix?: string; emptyLabel?: string }> }
  | { kind: 'refs'; field: string; label: string };

/**
 * RecordDetail — the catalog's right-hand panel in isolation, for a
 * `single`-layout page that renders one record with no master list. Pure:
 * renders the head (icon · title · facet meta) then every section that has
 * data. `refs`-kind sections emit clickable chips via onSelectRef.
 */
export interface RecordDetailProps {
  /** The record to render. */
  record: CatalogRecord;
  /** Ordered section descriptors. */
  sections: CatalogSection[];
  /** Field holding the record's facet value(s); shown as the head meta line. */
  facetField?: string;
  /** Called with a ref id when a `refs` chip is clicked. */
  onSelectRef?: (id: string) => void;
}

export function RecordDetail(props: RecordDetailProps): React.ReactElement;
