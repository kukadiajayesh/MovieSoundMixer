/* global React, Icon, SAMPLE_VIDEOS, SAMPLE_MERGE, SAMPLE_LOG, SAMPLE_RECENTS */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── Helpers ────────────────────────────────────────────────────────
const fmtPct = (n) => `${Math.round(n * 100)}%`;
const fileExt = (name) => (name.split(".").pop() || "").toLowerCase();
const baseName = (name) => name.replace(/\.[^.]+$/, "");

// ─── Toast system ───────────────────────────────────────────────────
const ToastCtx = React.createContext(null);
function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((arr) => [...arr, { id, ...t }]);
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), t.duration || 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || ""}`}>
            <Icon name={t.kind === "ok" ? "check" : t.kind === "error" ? "error" : "info"} />
            <div className="body">
              <div className="title">{t.title}</div>
              {t.desc && <div className="desc">{t.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

// ─── Sidebar ────────────────────────────────────────────────────────
function Sidebar({ view, setView, counts, deps }) {
  const items = [
    { id: "extract", label: "Extract", icon: "extract", count: counts.extract },
    { id: "merge",   label: "Merge",   icon: "merge",   count: counts.merge },
    { id: "queue",   label: "History", icon: "history", count: counts.recents },
  ];
  return (
    <aside className="sidebar">
      <div className="sb-section">Workspace</div>
      <nav className="sb-nav">
        {items.map((it) => (
          <div key={it.id} className={`sb-item ${view === it.id ? "active" : ""}`} onClick={() => setView(it.id)}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.count > 0 && <span className="count">{it.count}</span>}
          </div>
        ))}
      </nav>
      <div className="sb-status">
        <div className="sb-stat-row">
          <span className={`sb-dot ${deps.ffmpeg ? "" : "off"}`} />
          <span>FFmpeg {deps.ffmpeg ? "ready" : "missing"}</span>
        </div>
        <div className="sb-stat-row">
          <span className={`sb-dot ${deps.mkvmerge ? "" : "warn"}`} />
          <span>mkvmerge {deps.mkvmerge ? "ready" : "optional"}</span>
        </div>
        <div className="sb-stat-row">
          <span className={`sb-dot ${deps.gpu ? "" : "off"}`} />
          <span>{deps.gpu ? `${deps.gpuCount} GPU encoders` : "GPU not detected"}</span>
        </div>
      </div>
    </aside>
  );
}

// ─── Stream picker popover ──────────────────────────────────────────
function StreamPicker({ streams, pickedIdx, onPick, anchor, onClose }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 4 });
    const onDocClick = (e) => {
      if (!e.target.closest(".popover") && !e.target.closest(".stream-pick")) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [anchor, onClose]);
  if (!pos) return null;
  return (
    <div className="popover" style={{ left: pos.left, top: pos.top }}>
      {streams.map((s) => (
        <div key={s.idx} className={`po-item ${s.idx === pickedIdx ? "active" : ""}`} onClick={() => { onPick(s.idx); onClose(); }}>
          <span className="po-check">{s.idx === pickedIdx ? <Icon name="check" /> : null}</span>
          <span className="badges">
            <span className="codec">{s.codec.toUpperCase()}</span>
            {s.lang && <span className="lang">{s.lang.toUpperCase()}</span>}
          </span>
          <span className="label">{s.title || `Stream a:${s.idx}`}</span>
          <span className="ch">{s.channels}ch · {s.bitrate}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Status cell ────────────────────────────────────────────────────
function StatusCell({ row }) {
  if (row.status === "running") {
    return (
      <div className="status running">
        <span className="dot" />
        <span className="mini-prog"><span className="fill" style={{ transform: `scaleX(${row.progress})` }} /></span>
        <span className="pct">{fmtPct(row.progress)}</span>
      </div>
    );
  }
  if (row.status === "done") {
    return <div className="status done"><span className="dot" /><span>Done</span></div>;
  }
  if (row.status === "probing") {
    return <div className="status probing"><span className="dot" /><span>Probing…</span></div>;
  }
  if (row.status === "error") {
    return <div className="status error"><span className="dot" /><span title={row.error}>{row.error || "Error"}</span></div>;
  }
  return <div className="status ready"><span className="dot" /><span>Ready</span></div>;
}

// ─── File row (extract) ─────────────────────────────────────────────
function FileNameCell({ row }) {
  return (
    <div className={`fname ext-${row.ext}`}>
      <span className="ext">{row.ext}</span>
      <span className="label">{baseName(row.name)}</span>
      {row.episode && <span className="ep">{row.episode}</span>}
    </div>
  );
}

// ─── Dropzone ───────────────────────────────────────────────────────
function Dropzone({ slim, title, sub, onAddFiles, onAddFolder, hint, kind = "video" }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`dropzone ${slim ? "slim" : ""} ${drag ? "drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onAddFiles && onAddFiles(); }}
    >
      <div className="dz-icon"><Icon name={kind === "audio" ? "music" : kind === "folder" ? "folder" : "file"} /></div>
      <div className="dz-text">
        <p className="dz-title">{title}</p>
        <p className="dz-sub">{sub}</p>
      </div>
      <div className="dz-actions">
        <button className="btn" onClick={onAddFiles}><Icon name="plus" />Add files</button>
        <button className="btn" onClick={onAddFolder}><Icon name="folder" />Add folder</button>
      </div>
    </div>
  );
}

// ─── Extract view ───────────────────────────────────────────────────
function ExtractView({ rows, setRows, outputDir, setOutputDir, running, onRun, onStop, overall }) {
  const [picker, setPicker] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const toast = useToast();

  const filtered = useMemo(
    () => rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const toggleSel = (id) => {
    const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s);
  };

  const removeSelected = () => {
    setRows((rs) => rs.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    toast({ kind: "info", title: "Removed", desc: `${selected.size} file(s) removed from queue` });
  };

  const ready = rows.filter((r) => r.status === "ready" || r.status === "done").length;
  const total = rows.length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="ph-title">Extract Audio</h1>
          <p className="ph-sub">Probe video files, pick a stream, save audio as a standalone file.</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ghost" onClick={() => { setRows([]); setSelected(new Set()); }} disabled={!rows.length || running}>
            <Icon name="trash" />Clear
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Dropzone
          title="Drop video files here"
          sub="Or use the buttons below — supports MKV, MP4, AVI, MOV, TS, M2TS"
          onAddFiles={() => { setRows(SAMPLE_VIDEOS); toast({ kind: "ok", title: "Loaded 6 sample files" }); }}
          onAddFolder={() => { setRows(SAMPLE_VIDEOS); toast({ kind: "ok", title: "Loaded 6 sample files" }); }}
        />
      ) : (
        <Dropzone
          slim
          title="Drag more files anywhere"
          sub={`${total} file${total !== 1 ? "s" : ""} loaded · drop to add`}
          onAddFiles={() => toast({ kind: "info", title: "File picker (mock)" })}
          onAddFolder={() => toast({ kind: "info", title: "Folder picker (mock)" })}
        />
      )}

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sep" />
        <button className="btn btn-sm" disabled={!selected.size} onClick={removeSelected}>
          <Icon name="trash" />Remove ({selected.size})
        </button>
        <div className="spacer" />
        <span className="chip-counter">{ready}/{total} ready</span>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="col-check"></th>
              <th className="col-idx">#</th>
              <th className="col-name">File</th>
              <th className="col-meta">Size</th>
              <th className="col-stream">Stream</th>
              <th className="col-status">Status</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const picked = row.streams[row.pickedIdx];
              return (
                <tr key={row.id} className={selected.has(row.id) ? "sel" : ""}>
                  <td className="col-check">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSel(row.id)} />
                  </td>
                  <td className="col-idx">{i + 1}</td>
                  <td className="col-name"><FileNameCell row={row} /></td>
                  <td className="col-meta">{row.size}</td>
                  <td className="col-stream">
                    {picked ? (
                      <span
                        className="stream-pick"
                        onClick={(e) => setPicker({ row, anchor: e.currentTarget })}
                      >
                        <span className="badge">{picked.codec.toUpperCase()}</span>
                        {picked.lang && <span className="lang">{picked.lang.toUpperCase()}</span>}
                        <span className="ch">{picked.channels}ch</span>
                        <Icon name="chevron" className="caret" />
                      </span>
                    ) : (
                      <span style={{ color: "var(--fg-4)", fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td className="col-status"><StatusCell row={row} /></td>
                  <td className="col-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}>
                      <Icon name="close" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {picker && (
        <StreamPicker
          streams={picker.row.streams}
          pickedIdx={picker.row.pickedIdx}
          anchor={picker.anchor}
          onPick={(idx) => setRows((rs) => rs.map((r) => (r.id === picker.row.id ? { ...r, pickedIdx: idx } : r)))}
          onClose={() => setPicker(null)}
        />
      )}

      <RunFooter
        outputDir={outputDir}
        setOutputDir={setOutputDir}
        running={running}
        onRun={onRun}
        onStop={onStop}
        overall={overall}
        runLabel="Extract Audio"
        canRun={total > 0}
      />
    </>
  );
}

// ─── Merge view ─────────────────────────────────────────────────────
function MergeView({ rows, setRows, outputDir, setOutputDir, running, onRun, onStop, overall, settings, setSettings, gpuEncoders }) {
  const matched = rows.filter((r) => r.matched).length;
  const unmatched = rows.length - matched;
  const toast = useToast();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="ph-title">Merge Audio</h1>
          <p className="ph-sub">Add an external audio track to videos. Auto-matches by episode (SxxExx).</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Dropzone
          title="Drop videos and audio files"
          sub="Files are paired automatically by episode number"
          onAddFiles={() => { setRows(SAMPLE_MERGE); toast({ kind: "ok", title: "Loaded 5 video/audio pairs" }); }}
          onAddFolder={() => { setRows(SAMPLE_MERGE); toast({ kind: "ok", title: "Loaded 5 video/audio pairs" }); }}
          kind="folder"
        />
      ) : (
        <>
          <Dropzone
            slim
            title="Drag more files"
            sub={`${rows.length} pair${rows.length !== 1 ? "s" : ""} · auto-matched by episode`}
            onAddFiles={() => toast({ kind: "info", title: "File picker (mock)" })}
            onAddFolder={() => toast({ kind: "info", title: "Folder picker (mock)" })}
            kind="folder"
          />
          <div className="match-preview">
            <Icon name="info" className="ico" />
            <span className="label">Episode auto-match:</span>
            <span className="stat">{matched} matched</span>
            {unmatched > 0 && <><span style={{ color: "var(--fg-4)" }}>·</span><span className="stat warn">{unmatched} unmatched</span></>}
            <span style={{ color: "var(--fg-4)", marginLeft: "auto", fontSize: 11 }}>Click any audio cell to override</span>
          </div>
        </>
      )}

      {rows.length > 0 && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="col-idx">#</th>
                <th>Video</th>
                <th>Audio</th>
                <th className="col-meta">Episode</th>
                <th className="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="col-idx">{i + 1}</td>
                  <td>
                    <div className={`fname ext-${r.videoExt}`}>
                      <span className="ext">{r.videoExt}</span>
                      <span className="label">{baseName(r.video)}</span>
                    </div>
                  </td>
                  <td>
                    {r.audio ? (
                      <div className={`fname ext-${r.audioExt}`}>
                        <span className="ext">{r.audioExt}</span>
                        <span className="label">{baseName(r.audio)}</span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--warn)", fontSize: 11, fontStyle: "italic" }}>
                        ⚠ No match — click to assign manually
                      </span>
                    )}
                  </td>
                  <td className="col-meta mono" style={{ fontSize: 11 }}>{r.episode}</td>
                  <td className="col-status"><StatusCell row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MergeSettings settings={settings} setSettings={setSettings} gpuEncoders={gpuEncoders} />

      <RunFooter
        outputDir={outputDir}
        setOutputDir={setOutputDir}
        running={running}
        onRun={onRun}
        onStop={onStop}
        overall={overall}
        runLabel="Start Merging"
        canRun={rows.length > 0}
      />
    </>
  );
}

// ─── Merge settings cards ───────────────────────────────────────────
function MergeSettings({ settings, setSettings, gpuEncoders }) {
  const update = (patch) => setSettings({ ...settings, ...patch });
  return (
    <div className="cards">
      <div className="card">
        <div className="card-head">
          <Icon name="zap" />
          <span>GPU Acceleration</span>
          <span className={`badge ${settings.gpu ? "on" : ""}`}>{settings.gpu ? "ON" : "OFF"}</span>
        </div>
        <Switch on={settings.gpu} onChange={(v) => update({ gpu: v })} label="Enable hardware encoding" />
        {settings.gpu && (
          <>
            <div className="field">
              <label>Encoder ({gpuEncoders.length} detected)</label>
              <select value={settings.encoder} onChange={(e) => update({ encoder: e.target.value })}>
                {gpuEncoders.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Quality</label>
              <div className="seg">
                {["fast", "balanced", "quality"].map((q) => (
                  <button key={q} className={settings.quality === q ? "on" : ""} onClick={() => update({ quality: q })}>
                    {q[0].toUpperCase() + q.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <Icon name="layers" />
          <span>Merge Backend</span>
        </div>
        <div>
          {[
            { id: "auto",     lbl: "Auto",          desc: "Use mkvmerge if available, else FFmpeg" },
            { id: "mkvmerge", lbl: "Force mkvmerge", desc: "External track first, all originals kept" },
            { id: "ffmpeg",   lbl: "Force FFmpeg",   desc: "Compatible with more containers" },
          ].map((o) => (
            <label key={o.id} className="radio-row">
              <input type="radio" name="backend" checked={settings.backend === o.id} onChange={() => update({ backend: o.id })} />
              <div>
                <div className="lbl">{o.lbl}</div>
                <div className="desc">{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <Icon name="cpu" />
          <span>Batch Processing</span>
          <span className={`badge ${settings.batch ? "on" : ""}`}>{settings.batch ? `${settings.processes}×` : "OFF"}</span>
        </div>
        <Switch on={settings.batch} onChange={(v) => update({ batch: v })} label="Run jobs in parallel" />
        {settings.batch && (
          <div className="field">
            <label>Concurrent processes (system: {settings.cpuCount} cores)</label>
            <input
              type="number" min="1" max={settings.cpuCount}
              value={settings.processes}
              onChange={(e) => update({ processes: Math.max(1, Math.min(settings.cpuCount, +e.target.value || 1)) })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <label className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <span className="track" />
      <span>{label}</span>
    </label>
  );
}

// ─── Run footer ─────────────────────────────────────────────────────
function RunFooter({ outputDir, setOutputDir, running, onRun, onStop, overall, runLabel, canRun }) {
  return (
    <div className="run-footer">
      {running ? (
        <>
          <div className="run-progress">
            <div className="rp-row">
              <span className="rp-current">{overall.currentFile || "Processing…"}</span>
              <span className="rp-stats">{overall.completed}/{overall.total} · {fmtPct(overall.pct)}</span>
            </div>
            <div className="rp-bar"><span className="fill" style={{ transform: `scaleX(${overall.pct})` }} /></div>
          </div>
          <button className="btn btn-danger" onClick={onStop}><Icon name="stop" />Stop</button>
        </>
      ) : (
        <>
          <div className="rf-output">
            <label>Output</label>
            <div className="rf-input">
              <input value={outputDir} onChange={(e) => setOutputDir(e.target.value)} placeholder="Choose output folder…" />
              <button onClick={() => setOutputDir("/Users/saro/Movies/extracted")}>Browse…</button>
            </div>
          </div>
          <button className="btn btn-primary" disabled={!canRun || !outputDir} onClick={onRun}>
            <Icon name="play" />{runLabel}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Log drawer ─────────────────────────────────────────────────────
function LogDrawer({ collapsed, setCollapsed, log, errCount }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log, collapsed]);
  return (
    <div className={`drawer ${collapsed ? "collapsed" : ""}`}>
      <div className="drawer-head" onClick={() => setCollapsed(!collapsed)}>
        <Icon name="chevron" className="caret" />
        <span className="title">Log Output</span>
        <span className="meta">{log.length} lines</span>
        {errCount > 0 && <span className="err-badge">{errCount} error{errCount !== 1 ? "s" : ""}</span>}
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(log.map(l => `[${l.ts}] ${l.tag.toUpperCase()} ${l.msg}`).join("\n")); }}>Copy</button>
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); }}>Clear</button>
        </div>
      </div>
      <div className="drawer-body" ref={ref}>
        {log.map((l, i) => (
          <div key={i} className={`log-line ${l.tag === "cmd" ? "cmd" : ""}`}>
            <span className="ts">{l.ts}</span>
            <span className={`tag ${l.tag}`}>[{l.tag.toUpperCase()}]</span>
            <span className="msg">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── History view ──────────────────────────────────────────────────
function HistoryView() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="ph-title">History</h1>
          <p className="ph-sub">Recent runs · click to re-queue with the same settings</p>
        </div>
      </div>
      <div className="recents">
        {SAMPLE_RECENTS.map((r) => (
          <div key={r.id} className={`recent-item ${r.status}`}>
            <div className="ico"><Icon name={r.kind === "extract" ? "extract" : "merge"} /></div>
            <div className="summary">
              <div className="name">{r.name}</div>
              <div className="when">{r.when} · {r.count} file{r.count !== 1 ? "s" : ""}</div>
            </div>
            <span className="pill">{r.kind}</span>
            <button className="btn btn-sm">Re-run</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── App ────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState("extract");
  const [extractRows, setExtractRows] = useState(SAMPLE_VIDEOS);
  const [mergeRows, setMergeRows] = useState(SAMPLE_MERGE);
  const [extractOut, setExtractOut] = useState("/Users/saro/Movies/extracted");
  const [mergeOut, setMergeOut] = useState("/Users/saro/Movies/merged");
  const [running, setRunning] = useState(false);
  const [overall, setOverall] = useState({ pct: 0, completed: 0, total: 0, currentFile: "" });
  const [log, setLog] = useState(SAMPLE_LOG);
  const [drawerCollapsed, setDrawerCollapsed] = useState(true);
  const [tweaks, setTweaks] = useState({
    theme: "dark",
    density: "comfortable",
    accent: 210,
  });
  const [settings, setSettings] = useState({
    gpu: true, encoder: "h264_nvenc", quality: "balanced",
    backend: "auto", batch: false, processes: 6, cpuCount: 7,
  });

  // Apply tweaks to root
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    document.documentElement.style.setProperty("--accent-h", tweaks.accent);
  }, [tweaks]);

  const startRun = (kind) => {
    const rows = kind === "extract" ? extractRows : mergeRows;
    const total = rows.length;
    setRunning(true);
    setOverall({ pct: 0, completed: 0, total, currentFile: rows[0]?.name || rows[0]?.video || "" });
    setDrawerCollapsed(false);
    let i = 0;
    let p = 0;
    const tick = () => {
      p += 0.04;
      if (p >= 1) {
        i += 1;
        p = 0;
        if (i >= total) {
          setRunning(false);
          setOverall({ pct: 1, completed: total, total, currentFile: "All done" });
          setLog((l) => [...l, { ts: new Date().toTimeString().slice(0, 8), tag: "ok", msg: `${kind === "extract" ? "Extract" : "Merge"} complete: ${total} files` }]);
          return;
        }
      }
      setOverall((o) => ({ ...o, pct: (i + p) / total, completed: i, currentFile: rows[i]?.name || rows[i]?.video || "" }));
      setTimeout(tick, 120);
    };
    setLog((l) => [...l, { ts: new Date().toTimeString().slice(0, 8), tag: "info", msg: `Started ${kind} job: ${total} files` }]);
    setTimeout(tick, 200);
  };
  const stopRun = () => {
    setRunning(false);
    setLog((l) => [...l, { ts: new Date().toTimeString().slice(0, 8), tag: "warn", msg: "Cancelled by user" }]);
  };

  const counts = {
    extract: extractRows.length,
    merge: mergeRows.length,
    recents: SAMPLE_RECENTS.length,
  };
  const errCount = log.filter((l) => l.tag === "error").length;

  return (
    <ToastHost>
      <div className="app">
        <div className="titlebar">
          <div className="tl-dots"><span /><span /><span /></div>
          <div className="tl-title">FFmpeg Audio Manager</div>
          <div className="tl-spacer" />
        </div>
        <Sidebar
          view={view}
          setView={setView}
          counts={counts}
          deps={{ ffmpeg: true, mkvmerge: true, gpu: true, gpuCount: 6 }}
        />
        <main className="main">
          {view === "extract" && (
            <ExtractView
              rows={extractRows}
              setRows={setExtractRows}
              outputDir={extractOut}
              setOutputDir={setExtractOut}
              running={running}
              onRun={() => startRun("extract")}
              onStop={stopRun}
              overall={overall}
            />
          )}
          {view === "merge" && (
            <MergeView
              rows={mergeRows}
              setRows={setMergeRows}
              outputDir={mergeOut}
              setOutputDir={setMergeOut}
              running={running}
              onRun={() => startRun("merge")}
              onStop={stopRun}
              overall={overall}
              settings={settings}
              setSettings={setSettings}
              gpuEncoders={["h264_nvenc", "hevc_nvenc", "h264_qsv", "hevc_qsv", "h264_amf", "hevc_amf"]}
            />
          )}
          {view === "queue" && <HistoryView />}
        </main>
        <LogDrawer collapsed={drawerCollapsed} setCollapsed={setDrawerCollapsed} log={log} errCount={errCount} />
      </div>
      {window.AppTweaks && <window.AppTweaks tweaks={tweaks} setTweaks={setTweaks} />}
    </ToastHost>
  );
}

window.App = App;
