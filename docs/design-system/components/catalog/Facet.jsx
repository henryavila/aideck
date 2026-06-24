/* eslint-disable */
/* Facet — a single toggleable filter pill. Stateless: the parent owns the
   on/off flag and handles onClick. Pill geometry + the active treatment
   (status-info bg/line/text) match the widget-catalog specimen verbatim. */

export function Facet({ label, active, onClick }) {
  if (window.__AidCatalogKit) window.__AidCatalogKit.ensureCatalogStyles();
  return (
    <span
      className={'facet' + (active ? ' on' : '')}
      onClick={onClick}
      role="button"
      aria-pressed={!!active}
    >
      {label}
    </span>
  );
}
