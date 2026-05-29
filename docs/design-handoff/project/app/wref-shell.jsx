/* eslint-disable */
/* aiDeck — Widget reference shell: section header + cells + caption */

function WRefSection({ num, name, src, sub, children }) {
  return (
    <div className="wref-section">
      <div className="wref-head">
        <h2>
          {num != null && <span className="num">{String(num).padStart(2, "0")}</span>}
          <span>{name}</span>
        </h2>
        {sub && <span className="sub">— {sub}</span>}
        {src && <span className="src">source · <code>{src}</code></span>}
      </div>
      {children}
    </div>
  );
}

function WRefGrid({ cols = 4, children }) {
  return <div className={"wref-grid cols-" + cols}>{children}</div>;
}

function WRefCell({ id, name, span, children }) {
  return (
    <div className={"wref-cell" + (span ? " span-" + span : "")}>
      <div className="wref-cap">
        <span className="var">{id}</span>
        {name && <span className="name">· {name}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Tiny canonical widget frame for refs (no fancy options) ─────────
function WCell({ title, meta, children, bodyStyle, bodyClass }) {
  return (
    <div className="w">
      {(title || meta) && (
        <div className="w-head">
          <span className="w-title">{title}</span>
          <span className="w-meta">{meta}</span>
        </div>
      )}
      <div className={"w-body " + (bodyClass || "")} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { WRefSection, WRefGrid, WRefCell, WCell });
