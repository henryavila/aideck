/* Demo data for the Catalog component card + the widget-catalog specimen.
   Domain data lives HERE (a tool's "skill catalog"), never in the component's
   props or defaults — the component itself is agnostic. */
window.__CatalogDemo = {
  SECTIONS: [
    { kind:'summary',  field:'summary',  label:'summary' },
    { kind:'examples', field:'examples', label:'examples' },
    { kind:'prosCons', proField:'pros', conField:'cons', label:'when · when not' },
    { kind:'subItems', field:'subItems', label:'items', groupKey:'g', nameKey:'n', descKey:'d' },
    { kind:'fields',   field:'fields',   label:'fields',
      columns:[
        { key:'n', label:'arg', mono:true },
        { key:'k', label:'kind', mono:true },
        { key:'r', label:'req', mono:true, bool:true },
        { key:'d', label:'description' },
      ] },
    { kind:'meta', label:'deps · outputs',
      groups:[ { field:'deps', prefix:'↳ ', emptyLabel:'none' }, { field:'outputs', prefix:'→ ' } ] },
    { kind:'refs', field:'refs', label:'related' },
  ],
  RECORDS: [
    { id:'http.request', icon:'⇄', facets:['io','net'], oneLiner:'Issue an HTTP request',
      summary:"Performs an outbound HTTP request and returns the parsed response. Honors the consumer's timeout and retry policy; never follows redirects across hosts.",
      examples:["http.request({ url, method: 'GET' })","→ { status, headers, body }"],
      pros:['streams large bodies','retries idempotent verbs'], cons:['no cross-host redirect','blocks on slow DNS'],
      subItems:[ {g:'options',n:'timeout',d:'per-attempt ms ceiling'}, {g:'options',n:'retries',d:'max attempts for idempotent verbs'}, {g:'hooks',n:'onChunk',d:'called per streamed chunk'} ],
      fields:[ {n:'url',k:'string',r:true,d:'absolute request URL'}, {n:'method',k:'enum',r:false,d:'GET · POST · …'}, {n:'body',k:'bytes',r:false,d:'request payload'} ],
      deps:['net.dial'], outputs:['response','metrics'], refs:['net.dial','fs.read'] },

    { id:'fs.read', icon:'▤', facets:['io','fs'], oneLiner:'Read a file from disk',
      summary:"Reads a file under the consumer's data root and validates it against the declared JSON Schema before returning. Path traversal outside the root is rejected.",
      examples:["fs.read({ path: 'data/items.jsonl' })","→ Record[]  // schema-validated"],
      pros:['schema-validated on read','sandboxed to data root'], cons:['whole-file only','no watch (use fs.watch)'],
      subItems:[ {g:'options',n:'encoding',d:'utf-8 · bytes'}, {g:'options',n:'schema',d:'ref to a declared schema'} ],
      fields:[ {n:'path',k:'string',r:true,d:'path relative to data root'}, {n:'schema',k:'ref',r:false,d:'validate against this'} ],
      deps:[], outputs:['records'], refs:['fs.watch','http.request'] },

    { id:'fs.watch', icon:'◎', facets:['io','fs','stream'], oneLiner:'Watch a path for changes',
      summary:'Emits an event over SSE whenever a watched file changes on disk. Drives the .is-live widget state — the dashboard re-reads and re-renders without user action.',
      examples:["fs.watch({ path: 'data/*.jsonl' })","→ stream<{ path, kind }>"],
      pros:['powers live widgets','debounced by default'], cons:['one process per watch','no recursive globs'],
      subItems:[ {g:'events',n:'change',d:'file content changed'}, {g:'events',n:'unlink',d:'file removed'} ],
      fields:[ {n:'path',k:'glob',r:true,d:'file or glob to watch'}, {n:'debounce',k:'int',r:false,d:'ms to coalesce'} ],
      deps:['fs.read'], outputs:['stream'], refs:['fs.read'] },

    { id:'net.dial', icon:'⊕', facets:['net'], oneLiner:'Open a raw socket',
      summary:'Low-level TCP dial used by higher-level transports. Most consumers should reach for http.request instead unless they need a custom protocol.',
      examples:['net.dial({ host, port })','→ Socket'],
      pros:['custom protocols','keep-alive pooling'], cons:['no TLS helpers','manual framing'],
      subItems:[ {g:'options',n:'keepAlive',d:'reuse idle sockets'} ],
      fields:[ {n:'host',k:'string',r:true,d:'target host'}, {n:'port',k:'int',r:true,d:'target port'} ],
      deps:[], outputs:['socket'], refs:['http.request'] },

    { id:'schema.validate', icon:'✓', facets:['data'], oneLiner:'Validate against a schema',
      summary:'Validates a value against a declared JSON Schema and returns structured errors with a concrete suggestion per failure — the same shape widgets render in their error state.',
      examples:["schema.validate(value, 'item')","→ { ok, errors[] }"],
      pros:['structured error + suggestion','reused by fs.read'], cons:['no async refs','draft-07 only'],
      subItems:[ {g:'errors',n:'path',d:'json-pointer to the failure'}, {g:'errors',n:'suggestion',d:'concrete next step'} ],
      fields:[ {n:'value',k:'any',r:true,d:'value to check'}, {n:'schema',k:'ref',r:true,d:'declared schema id'} ],
      deps:[], outputs:['report'], refs:['fs.read'] },
  ],
};
