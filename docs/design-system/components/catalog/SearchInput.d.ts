import * as React from 'react';

/**
 * SearchInput — controlled search-field atom (mono glyph + text input) styled
 * to the aiDeck catalog specimen. Owns no state; emits keystrokes upward.
 */
export interface SearchInputProps {
  /** Current text value. */
  value?: string;
  /** Called with the new string on every keystroke. */
  onChange?: (value: string) => void;
  /** Placeholder shown when empty. */
  placeholder?: string;
  /** Leading glyph. Defaults to the mono search glyph "⌕". */
  glyph?: string;
  /** Fixed width in px. Omit to use the default 200px. */
  width?: number;
  /** Focus the input on mount. */
  autoFocus?: boolean;
}

export function SearchInput(props: SearchInputProps): React.ReactElement;
