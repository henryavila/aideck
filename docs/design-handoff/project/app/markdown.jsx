/* eslint-disable */
/* aiDeck — tiny markdown + code tokenizer (no external libs)
   Deliberately minimal: covers the demo content, renders synchronously. */

// ───── Markdown → React nodes ────────────────────────────────────────
function mdInline(text, keyPrefix) {
  // handle **bold**, *em*, `code`, [link](url)
  const out = [];
  let i = 0, k = 0;
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\*([^*]+)\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={keyPrefix + "-t" + (k++)}>{text.slice(last, m.index)}</span>);
    if (m[1]) out.push(<strong key={keyPrefix + "-b" + (k++)}>{m[2]}</strong>);
    else if (m[3]) out.push(<code key={keyPrefix + "-c" + (k++)}>{m[4]}</code>);
    else if (m[5]) out.push(<a key={keyPrefix + "-l" + (k++)} href={m[7]} onClick={(e) => e.preventDefault()}>{m[6]}</a>);
    else if (m[8]) out.push(<em key={keyPrefix + "-e" + (k++)}>{m[9]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={keyPrefix + "-t" + (k++)}>{text.slice(last)}</span>);
  return out;
}

function Markdown({ source }) {
  if (!source || !source.trim()) {
    return <div className="md-empty">// no content</div>;
  }
  const lines = source.replace(/\t/g, "  ").split("\n");
  const blocks = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // blank
    if (!line.trim()) { i++; continue; }

    // heading
    let hm = /^(#{1,3})\s+(.*)$/.exec(line);
    if (hm) {
      const lvl = hm[1].length;
      const Tag = "h" + lvl;
      blocks.push(<Tag key={key++}>{mdInline(hm[2], "h" + key)}</Tag>);
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push(<blockquote key={key++}><p>{mdInline(buf.join(" "), "bq" + key)}</p></blockquote>);
      continue;
    }

    // table
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const header = line.split("|").map((c) => c.trim()).filter(Boolean);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map((c) => c.trim()).filter(Boolean));
        i++;
      }
      blocks.push(
        <table key={key++}>
          <thead><tr>{header.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, ci) => <td key={ci}>{mdInline(c, "td" + ri + ci)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }

    // fenced code
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push(
        <pre key={key++}><CodeBlock code={buf.join("\n")} lang={lang || "text"} inMarkdown /></pre>
      );
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "")); i++;
      }
      blocks.push(<ul key={key++}>{items.map((it, j) => <li key={j}>{mdInline(it, "li" + key + j)}</li>)}</ul>);
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, "")); i++;
      }
      blocks.push(<ol key={key++}>{items.map((it, j) => <li key={j}>{mdInline(it, "ol" + key + j)}</li>)}</ol>);
      continue;
    }

    // paragraph
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|[-*]\s|\d+\.\s|>|```)/.test(lines[i]) && !lines[i].includes("|")) {
      buf.push(lines[i]); i++;
    }
    blocks.push(<p key={key++}>{mdInline(buf.join(" "), "p" + key)}</p>);
  }

  return <div className="md">{blocks}</div>;
}

// ───── Code tokenizer (lightweight, per-language) ────────────────────
const KW = {
  ts: /\b(export|import|interface|type|const|let|var|function|return|if|else|for|while|class|extends|implements|new|async|await|public|private|readonly|enum|namespace|as|from|default)\b/,
  yaml: null,
  shell: /\b(sudo|cd|ls|cat|echo|export|npm|npx|node|aideck|git|curl|cp|mv|rm|mkdir)\b/,
};
const TYPES = /\b(string|number|boolean|void|any|unknown|never|object|Promise|Array|Record|Consumer|Widget|Page)\b/;

function tokenizeLine(line, lang) {
  // returns array of {t, cls}
  const tokens = [];
  if (lang === "yaml") {
    // comment
    const cm = line.indexOf("#");
    let work = line, trailing = null;
    if (cm >= 0) { trailing = line.slice(cm); work = line.slice(0, cm); }
    const kv = /^(\s*)([\w.-]+)(:)(.*)$/.exec(work);
    const li = /^(\s*)(- )(.*)$/.exec(work);
    if (kv) {
      tokens.push({ t: kv[1] });
      tokens.push({ t: kv[2], cls: "tk-key" });
      tokens.push({ t: kv[3], cls: "tk-pun" });
      if (kv[4]) tokens.push(...valueTokens(kv[4]));
    } else if (li) {
      tokens.push({ t: li[1] });
      tokens.push({ t: li[2], cls: "tk-pun" });
      tokens.push(...valueTokens(li[3]));
    } else {
      tokens.push({ t: work });
    }
    if (trailing) tokens.push({ t: trailing, cls: "tk-com" });
    return tokens;
  }
  if (lang === "shell") {
    const cm = line.indexOf("#");
    let work = line, trailing = null;
    if (cm >= 0 && !line.slice(0, cm).includes('"')) { trailing = line.slice(cm); work = line.slice(0, cm); }
    const parts = work.split(/(\s+)/);
    parts.forEach((p, idx) => {
      if (/^\s+$/.test(p)) { tokens.push({ t: p }); return; }
      if (idx === 0 && /^[\w-]+$/.test(p)) { tokens.push({ t: p, cls: "tk-fn" }); return; }
      if (/^--?[\w-]+$/.test(p)) { tokens.push({ t: p, cls: "tk-key" }); return; }
      if (/^\d+$/.test(p)) { tokens.push({ t: p, cls: "tk-num" }); return; }
      tokens.push({ t: p });
    });
    if (trailing) tokens.push({ t: trailing, cls: "tk-com" });
    return tokens;
  }
  // ts / js / default
  const cm = line.indexOf("//");
  let work = line, trailing = null;
  if (cm >= 0) { trailing = line.slice(cm); work = line.slice(0, cm); }
  // split on tokens, keep whitespace and punctuation
  const re = /(\s+|[{}()[\]<>:;,.?=|&]+|"[^"]*"|'[^']*'|`[^`]*`|[A-Za-z_$][\w$]*|\d+)/g;
  let m;
  while ((m = re.exec(work)) !== null) {
    const t = m[0];
    if (/^\s+$/.test(t)) tokens.push({ t });
    else if (/^["'`]/.test(t)) tokens.push({ t, cls: "tk-str" });
    else if (/^\d+$/.test(t)) tokens.push({ t, cls: "tk-num" });
    else if (KW.ts && KW.ts.test(t)) tokens.push({ t, cls: "tk-kw" });
    else if (TYPES.test(t)) tokens.push({ t, cls: "tk-typ" });
    else if (/^[{}()[\]<>:;,.?=|&]+$/.test(t)) tokens.push({ t, cls: "tk-pun" });
    else tokens.push({ t });
  }
  if (trailing) tokens.push({ t: trailing, cls: "tk-com" });
  return tokens;
}
function valueTokens(s) {
  const out = [];
  const trimmed = s.replace(/^\s+/, "");
  const lead = s.slice(0, s.length - trimmed.length);
  if (lead) out.push({ t: lead });
  if (!trimmed) return out;
  if (/^["'].*["']$/.test(trimmed)) out.push({ t: trimmed, cls: "tk-str" });
  else if (/^\d+$/.test(trimmed)) out.push({ t: trimmed, cls: "tk-num" });
  else if (/^(true|false|null)$/.test(trimmed)) out.push({ t: trimmed, cls: "tk-kw" });
  else out.push({ t: trimmed, cls: "tk-str" });
  return out;
}

function CodeBlock({ code, lang = "text", lineNumbers = false, tall = false, inMarkdown = false }) {
  const [copied, setCopied] = React.useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  const doCopy = () => {
    try { navigator.clipboard.writeText(code); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className={"code-block" + (tall ? " is-tall" : "")}>
      <div className="cb-head">
        <span className="cb-lang">{lang}</span>
        <button className={"cb-copy" + (copied ? " done" : "")} onClick={doCopy}>
          {copied ? "✓ copied" : "⧉ copy"}
        </button>
      </div>
      <div className="cb-scroll">
        <pre>
          {lines.map((ln, i) => (
            <div key={i} className="cb-line">
              {lineNumbers && <span className="cb-num">{i + 1}</span>}
              <span className="cb-code">
                {tokenizeLine(ln, lang).map((tk, j) =>
                  tk.cls ? <span key={j} className={tk.cls}>{tk.t}</span> : <span key={j}>{tk.t}</span>
                )}
                {ln === "" && " "}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

Object.assign(window, { Markdown, CodeBlock, tokenizeLine });
