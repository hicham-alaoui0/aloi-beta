/* The Aloi website. Every terminal frame comes from demos.js and charts.js, which
   site/generate.py writes by running Aloi's own code; this file only arranges and replays them. */
(() => {
  "use strict";

  // Where the release archives and install scripts are hosted: the same value as in
  // packaging/install.sh and packaging/install.ps1.
  const INSTALL_HOST = "hicham-alaoui0.github.io/aloi-beta";

  const A = window.ALOI;
  if (!A) return;
  const CHARTS = window.ALOI_CHARTS || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const el = (tag, attrs = {}, html) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    if (html != null) node.innerHTML = html;
    return node;
  };
  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  };

  /* ---------------- theme ---------------- */
  const root = document.documentElement;
  const saved = store.get("aloi-theme");
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  $("#theme-toggle")?.addEventListener("click", () => {
    const now = root.dataset.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = now === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.set("aloi-theme", next);
  });

  /* ---------------- counts written from the data ---------------- */
  const counts = {
    definitions: A.catalogue.definitions,
    skills: A.catalogue.skills.length,
    version: A.version.split(".").slice(0, 2).join("."),
    charts: Object.keys(CHARTS).length ? `${Object.keys(CHARTS).length}` : "a few hundred",
  };
  $$("[data-count]").forEach((node) => { node.textContent = counts[node.dataset.count]; });
  // Where the prices came from: simulated, or read from a real source on the day the page was built.
  const pricesNote = $("#prices-note");
  if (pricesNote) pricesNote.textContent = A.source.sentence;
  const about = $("#about-demo");
  if (about) about.textContent = `Every terminal frame on this page was printed by Aloi ${A.version}'s own code on ${A.generated}, from ${A.source.prices} and scripted model replies. ${about.textContent.split(". ").slice(1).join(". ")}`.trim();

  /* ---------------- terminal windows ---------------- */
  function makeTerm({ title, tag = A.source.tag, cls = "", cols = A.width, controls = null }) {
    const term = el("div", { class: `term ${cls}`.trim() });
    const bar = el("div", { class: "term-bar" });
    bar.append(el("span", { class: "term-title", text: title }));
    if (controls) bar.append(controls);
    // One tag or several: each is its own chip, so a narrow bar wraps between them instead of cutting one.
    for (const text of [].concat(tag || [])) bar.append(el("span", { class: "term-tag", text }));
    const body = el("div", { class: "term-body", tabindex: "0" });
    const screen = el("div", { class: "screen" });
    screen.style.setProperty("--cols", cols);
    body.append(screen);
    term.append(bar, body);
    return { term, body, screen, title: bar.firstChild };
  }

  function frameNode(frame) {
    if (frame.k === "cmd") {
      const node = el("div", { class: "f f-cmd" });
      node.append(el("span", { class: frame.shell ? "shell" : "prompt", text: frame.shell ? "$ " : "› " }), el("span", { class: "typed", text: frame.t }));
      return node;
    }
    const node = el("div", { class: `f f-${frame.k}` });
    // White space is preserved, so a frame ending on a blank line needs one more break to show it.
    node.innerHTML = frame.h.endsWith("\n") ? `${frame.h}\n` : frame.h;
    return node;
  }

  function renderStatic(screen, frames) {
    screen.replaceChildren(...frames.map(frameNode));
  }

  /* ---------------- the replay of a session ---------------- */
  const SPIN = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

  class Player {
    constructor(view) {
      this.view = view;
      this.speed = 1;
      this.token = 0;
      this.frames = [];
      this.onState = () => {};
    }

    load(frames) {
      this.stop();
      this.frames = frames;
    }

    stop() {
      this.token += 1;
      this._clearStatus();
      this.onState(false);
    }

    showAll() {
      this.stop();
      renderStatic(this.view.screen, this.frames);
      this.view.body.scrollTop = 0;
    }

    _wait(ms) {
      return sleep(ms / this.speed);
    }

    _scroll() {
      const body = this.view.body;
      body.scrollTop = body.scrollHeight;
    }

    _status(label) {
      this._clearStatus();
      const line = el("div", { class: "f status" });
      const spin = el("span", { class: "c2", text: SPIN[0] });
      line.append(spin, el("span", { class: "d", text: ` ${label}…` }));
      this.view.screen.append(line);
      let i = 0;
      this.spinTimer = setInterval(() => { i = (i + 1) % SPIN.length; spin.textContent = SPIN[i]; }, 80);
      this.statusLine = line;
      this._scroll();
    }

    _clearStatus() {
      clearInterval(this.spinTimer);
      this.statusLine?.remove();
      this.statusLine = null;
    }

    async play() {
      this.stop();
      const token = this.token;
      const alive = () => token === this.token;
      this.onState(true);
      const screen = this.view.screen;
      screen.replaceChildren();
      this.view.body.scrollTop = 0;
      const frames = this.frames;
      for (let i = 0; i < frames.length; i += 1) {
        if (!alive()) return;
        const frame = frames[i];
        const next = frames[i + 1];
        if (frame.k === "cmd") {
          const node = frameNode({ ...frame, t: "" });
          const typed = node.lastChild;
          const cursor = el("span", { class: "cursor", text: " " });
          node.append(cursor);
          screen.append(node);
          this._scroll();
          for (const ch of frame.t) {
            typed.textContent += ch;
            await this._wait(frame.t.length > 40 ? 18 : 32);
            if (!alive()) return;
          }
          await this._wait(380);
          cursor.remove();
          if (next && next.k !== "banner" && next.k !== "cmd" && next.k !== "out") {
            this._status("Thinking");
            await this._wait(next.k === "tool" ? 900 : 600);
          }
          continue;
        }
        if (frame.k === "tool") {
          this._clearStatus();
          screen.append(Object.assign(frameNode(frame), { className: "f f-tool reveal-fade" }));
          const label = frameNode(frame).querySelector(".b")?.textContent || "Working";
          const seconds = next && next.k === "done" ? parseFloat((next.h.match(/· ([\d.]+)s/) || [])[1] || "0.5") : 0.5;
          this._status(label);
          await this._wait(Math.min(1500, Math.max(380, seconds * 900)));
          continue;
        }
        this._clearStatus();
        if (frame.k === "md") {
          const lines = frame.h.split("\n");
          const node = el("div", { class: "f f-md" });
          screen.append(node);
          for (let j = 0; j < lines.length; j += 1) {
            const line = el("div", { class: "reveal-fade" }, lines[j] || " ");
            node.append(line);
            this._scroll();
            await this._wait(lines[j] ? 55 : 20);
            if (!alive()) return;
          }
        } else {
          const node = frameNode(frame);
          node.classList.add(frame.k === "visual" ? "reveal-wipe" : "reveal-fade");
          screen.append(node);
          this._scroll();
          await this._wait({ visual: 1100, banner: 650, warn: 700, done: 140 }[frame.k] || 200);
        }
        if (!alive()) return;
        if (frame.k === "done" && next && next.k !== "tool" && next.k !== "visual") {
          this._status("Thinking");
          await this._wait(next.k === "md" ? 1100 : 700);
        } else if (frame.k === "visual" && next && next.k !== "tool") {
          this._status("Thinking");
          await this._wait(next.k === "md" ? 1000 : 600);
        }
      }
      this._clearStatus();
      if (alive()) this.onState(false);
    }
  }

  const sessions = A.sessions;
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]));

  /* ---------------- hero ---------------- */
  const heroHost = $("#hero-term");
  if (heroHost) {
    const replay = el("button", { type: "button", class: "ctl ctl-small", text: "Replay" });
    const view = makeTerm({ title: "~ aloi", cls: "term-hero", controls: replay });
    heroHost.append(view.term);
    const player = new Player(view);
    player.load(sessions[0].frames);
    replay.addEventListener("click", () => player.play());
    if (reduced) player.showAll();
    else player.play();
  }

  /* ---------------- pipeline ---------------- */
  const pipeline = $("#pipeline");
  if (pipeline) {
    const s = sessions[0];
    const calls = s.xray.filter((m) => m.calls).flatMap((m) => m.calls);
    const result = (name) => s.results[name] || null;
    const compare = result("compare_performance");
    const risk = result("get_risk_metrics");
    const first = compare ? compare.ranked.find((r) => r.ticker === "NVDA") : null;
    const riskRow = risk ? risk.instruments.find((r) => r.ticker === "NVDA") : null;
    const fmtCall = (c) => `${c.name}(${Object.entries(c.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})`;
    const kv = (obj, keys) => keys.filter((k) => obj && k in obj).map((k) => `<span class="k">${k}</span>: <span class="v">${esc(JSON.stringify(obj[k]))}</span>`).join("\n");
    const spark = (points, width = 26) => {
      const bars = "▁▂▃▄▅▆▇█";
      const picked = Array.from({ length: width }, (_, i) => points[Math.round((i * (points.length - 1)) / (width - 1))]);
      const lo = Math.min(...picked), hi = Math.max(...picked);
      return picked.map((p) => bars[Math.round(((p - lo) / (hi - lo || 1)) * 7)]).join("");
    };
    const figures = s.figures || [];
    // How many tools the model is shown: on a free source, and on Bloomberg, whose own tools add to them and replace a few.
    const defined = A.catalogue.groups.flatMap((g) => g.tools);
    const onFree = defined.filter((t) => !t.only).length;
    const onTerminal = defined.length - defined.filter((t) => t.replacedOnBloomberg).length;
    const steps = [
      ["You ask", "In plain language, in a session or straight from the shell.", esc(s.typed)],
      ["The model picks tools", `It sees ${onFree} to ${onTerminal} tool descriptions and decides what to call, often several at once.`, calls.slice(0, 2).map((c) => esc(fmtCall(c))).join("\n")],
      ["Tools fetch the data", "From Bloomberg or Yahoo Finance, and from free sources for crypto, macro, filings, news and prediction markets.", kv(first, ["ticker", "first_close", "last_close", "price_change_pct"])],
      ["Code does the maths", "Changes, volatility, drawdowns, betas and indicators are computed in Python, so the model never does arithmetic it could get wrong.", kv(riskRow, ["annualized_volatility_pct", "beta_vs_benchmark", "sharpe_ratio"])],
      ["The terminal draws", "Charts come from the same data, drawn by code. The model only reads the figures behind them.", `<span class="ok">${spark(A.streaks.NVDA)}</span>\nNVDA ${first ? (first.price_change_pct > 0 ? "+" : "") + first.price_change_pct.toFixed(1) + "%" : ""}`],
      ["Every figure is checked", `Each price and percentage in the answer is matched against what the tools returned. In this answer, ${figures.filter((f) => f.ok).length} of ${figures.length} matched.`, figures.slice(0, 4).map((f) => `${esc(f.t)} <span class="${f.ok ? "ok" : "v"}">${f.ok ? "✓ fetched" : "⚠ not fetched"}</span>`).join("\n")],
    ];
    pipeline.replaceChildren(...steps.map(([title, text, specimen]) => {
      const li = el("li");
      li.append(el("h3", { text: title }), el("p", { text }), el("pre", { class: "specimen" }, specimen));
      return li;
    }));
  }

  /* ---------------- session player ---------------- */
  const sessionList = $("#session-list");
  const playerHost = $("#player-term");
  let sessionPlayer = null;
  let current = null;
  if (sessionList && playerHost) {
    const view = makeTerm({ title: "aloi", cls: "term-tall", tag: [A.source.tag, "scripted replies"] });
    playerHost.append(view.term);
    sessionPlayer = new Player(view);
    const playBtn = $("#play-btn");
    sessionPlayer.onState = (playing) => { playBtn.textContent = playing ? "Stop" : "Replay"; };
    playBtn.addEventListener("click", () => {
      if (playBtn.textContent === "Stop") sessionPlayer.showAll();
      else sessionPlayer.play();
    });
    $("#skip-btn").addEventListener("click", () => sessionPlayer.showAll());
    $$(".speed [data-speed]").forEach((btn) => btn.addEventListener("click", () => {
      sessionPlayer.speed = Number(btn.dataset.speed);
      $$(".speed [data-speed]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    }));
    const xrayBtn = $("#xray-btn");
    const xray = $("#xray");
    xrayBtn.addEventListener("click", () => {
      const open = xrayBtn.getAttribute("aria-expanded") !== "true";
      xrayBtn.setAttribute("aria-expanded", String(open));
      xray.hidden = !open;
    });

    sessions.forEach((s) => {
      const item = el("button", { type: "button", class: "session-item", role: "tab", "aria-selected": "false", "data-id": s.id });
      item.append(el("span", { class: "t", text: s.title }), el("span", { class: "c", text: s.shell ? `$ ${s.typed}` : `› ${s.typed}` }));
      item.addEventListener("click", () => selectSession(s.id, true));
      sessionList.append(item);
    });

    function selectSession(id, play) {
      const s = byId[id];
      if (!s) return;
      current = s;
      $$(".session-item", sessionList).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.id === id)));
      view.title.textContent = s.shell ? "~ aloi" : "aloi";
      $("#session-blurb").textContent = s.blurb;
      renderXray(s);
      sessionPlayer.load(s.frames);
      if (play && !reduced) sessionPlayer.play();
      else sessionPlayer.showAll();
    }

    function renderXray(s) {
      const rows = [];
      s.xray.forEach((m, i) => {
        const nextIsCheck = s.xray[i + 1] && s.xray[i + 1].role === "check";
        let role = m.role;
        let cls = "";
        let body = "";
        if (m.role === "user") {
          role = "you";
          body = esc(m.text);
        } else if (m.role === "assistant" && m.calls) {
          role = "model";
          body = m.calls.map((c) => `<span class="xray-call">${esc(c.name)}</span>(${Object.entries(c.args).map(([k, v]) => `${esc(k)}=<span class="arg">${esc(JSON.stringify(v))}</span>`).join(", ")})`).join("\n");
          if (m.text) body = `${esc(m.text)}\n${body}`;
        } else if (m.role === "assistant") {
          role = nextIsCheck ? "model, held" : "model";
          cls = nextIsCheck ? "is-held" : "";
          body = esc(m.text);
        } else if (m.role === "tool") {
          role = m.error ? "tool, refused" : "tool";
          cls = m.error ? "is-tool is-error" : "is-tool";
          body = `<span class="xray-call">${esc(m.name)}</span> returned\n${esc(m.text)}`;
        } else if (m.role === "check") {
          role = "aloi";
          cls = "is-check";
          body = esc(m.text);
        }
        rows.push(`<div class="xray-msg ${cls}"><div class="xray-role">${esc(role)}</div><div class="xray-body">${body}</div></div>`);
      });
      xray.innerHTML = `<p class="small">The turn as the model saw it: your request, its tool calls, what each tool returned, and any correction from Aloi. The system prompt and the playbooks are compiled into the program and are left out.</p>${rows.join("")}`;
    }

    window.aloiSelectSession = selectSession;
    selectSession("technicals", false);
  }

  $$("[data-session]").forEach((btn) => btn.addEventListener("click", () => {
    if (!window.aloiSelectSession) return;
    document.getElementById("sessions").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    window.aloiSelectSession(btn.dataset.session, true);
  }));

  /* ---------------- gallery ---------------- */
  const gallery = $("#gallery");
  const viewer = $("#viewer");
  if (gallery) {
    const kinds = {
      all: "All",
      price: "Prices",
      risk: "Risk",
      heat: "Heatmaps and maps",
      bars: "Bars",
      curves: "Curves",
    };
    const kindOf = { line: "price", candles: "price", compare: "price", intraday: "price", dashboard: "heat", map: "heat", heatmap: "heat", calendar: "heat", bars: "bars", drawdown: "risk", distribution: "bars", backtest: "risk", spread: "risk", curve: "curves", smile: "curves", funding: "curves" };
    const filters = $("#gallery-filters");
    Object.entries(kinds).forEach(([key, label]) => {
      const chip = el("button", { type: "button", class: "chip", "aria-pressed": String(key === "all"), "data-kind": key, text: label });
      chip.addEventListener("click", () => {
        $$(".chip", filters).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        $$(".card", gallery).forEach((card) => { card.hidden = key !== "all" && card.dataset.kind !== key; });
      });
      filters.append(chip);
    });
    A.gallery.forEach((item) => {
      const card = el("figure", { class: "card", "data-kind": kindOf[item.kind] || "price" });
      const open = el("button", { type: "button", class: "card-open", "aria-label": `Enlarge: ${item.title}` });
      const view = makeTerm({ title: item.call, tag: null });
      renderStatic(view.screen, [{ k: "visual", h: item.h }]);
      open.append(view.term);
      open.addEventListener("click", () => showViewer(item));
      const cap = el("figcaption");
      cap.append(el("p", { class: "card-title", text: item.title }), el("p", { class: "card-caption", text: item.caption }));
      card.append(open, cap);
      gallery.append(card);
    });
  }

  function showViewer(item) {
    if (!viewer) return;
    $("#viewer-title").textContent = item.title;
    $("#viewer-caption").textContent = item.caption;
    const host = $("#viewer-term");
    const view = makeTerm({ title: item.call, tag: item.tag });
    renderStatic(view.screen, [{ k: "visual", h: item.h }]);
    host.replaceChildren(view.term);
    if (typeof viewer.showModal === "function") viewer.showModal();
    else viewer.setAttribute("open", "");
  }
  $("#viewer-close")?.addEventListener("click", () => viewer.close ? viewer.close() : viewer.removeAttribute("open"));
  viewer?.addEventListener("click", (event) => { if (event.target === viewer) viewer.close(); });

  /* ---------------- /chart playground ---------------- */
  const OVERLAYS = ["sma20", "sma50", "sma200", "ema20", "ema50", "bollinger"];
  const PANELS = ["volume", "rsi", "macd"];
  const PERIODS = ["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "2y", "5y", "10y"];

  // The parsing of cli.parse_chart_command: options are the words at the end.
  function parseChart(arg) {
    const words = arg.trim().split(/\s+/).filter(Boolean);
    const req = { tickers: [], period: "6mo", candles: false, overlays: [], panels: [] };
    while (words.length) {
      const word = words[words.length - 1].toLowerCase();
      if (PERIODS.includes(word)) req.period = word;
      else if (word === "candles") req.candles = true;
      else if (OVERLAYS.includes(word)) req.overlays.unshift(word);
      else if (PANELS.includes(word)) req.panels.unshift(word);
      else break;
      words.pop();
    }
    req.tickers = words.join(" ").split(",").map((t) => t.trim()).filter(Boolean);
    return req;
  }

  // The key generate.py files each chart under.
  function canonical(req) {
    const single = req.tickers.length === 1;
    const words = [req.tickers.map((t) => t.toUpperCase()).join(", "), req.period];
    if (single) {
      if (req.candles) words.push("candles");
      words.push(...OVERLAYS.filter((o) => req.overlays.includes(o)), ...PANELS.filter((p) => req.panels.includes(p)));
    }
    return words.join(" ");
  }

  function commandOf(req) {
    const single = req.tickers.length === 1;
    const words = [req.tickers.join(", "), req.period];
    if (single) {
      if (req.candles) words.push("candles");
      words.push(...req.overlays, ...req.panels);
    }
    return words.join(" ");
  }

  const chartHost = $("#chart-term");
  const chartInput = $("#chart-cmd");
  if (chartHost && chartInput) {
    const view = makeTerm({ title: "aloi", cls: "term-tall" });
    chartHost.append(view.term);
    const options = $("#chart-options");
    const groups = [
      ["ticker", "Ticker", A.chartTickers.map((t) => [t, t])],
      ["period", "Period", [["6mo", "6mo"], ["1y", "1y"]]],
      ["style", "Style", [["line", "line"], ["candles", "candles"]]],
      ["overlay", "Overlay", [["", "none"], ["sma20", "sma20"], ["sma50 sma200", "sma50 + sma200"], ["bollinger", "bollinger"]]],
      ["panel", "Panels", PANELS.map((p) => [p, p])],
    ];
    groups.forEach(([key, label, values]) => {
      const group = el("div", { class: "opt-group", role: "group", "aria-label": label });
      group.append(el("span", { class: "label", text: label }));
      values.forEach(([value, text]) => {
        const chip = el("button", { type: "button", class: "chip", "data-key": key, "data-value": value, "aria-pressed": "false", text });
        chip.addEventListener("click", () => applyOption(key, value));
        group.append(chip);
      });
      options.append(group);
    });

    function applyOption(key, value) {
      const req = parseChart(chartInput.value);
      if (key === "ticker") req.tickers = [value];
      if (key === "period") req.period = value;
      if (key === "style") req.candles = value === "candles";
      if (key === "overlay") req.overlays = value ? value.split(" ") : [];
      if (key === "panel") req.panels = req.panels.includes(value) ? req.panels.filter((p) => p !== value) : PANELS.filter((p) => p === value || req.panels.includes(p));
      if (req.tickers.length !== 1 && key !== "ticker" && key !== "period") req.tickers = [A.chartTickers[0]];
      chartInput.value = commandOf(req);
      draw();
    }

    function syncChips(req) {
      const single = req.tickers.length === 1;
      $$(".chip", options).forEach((chip) => {
        const { key, value } = chip.dataset;
        let on = false;
        if (key === "ticker") on = single && req.tickers[0].toUpperCase() === value;
        if (key === "period") on = req.period === value;
        if (key === "style") on = single && (value === "candles") === req.candles;
        if (key === "overlay") on = single && req.overlays.join(" ") === value;
        if (key === "panel") on = single && req.panels.includes(value);
        chip.setAttribute("aria-pressed", String(on));
      });
    }

    function draw() {
      const req = parseChart(chartInput.value);
      syncChips(req);
      const line = { k: "cmd", t: `/chart ${chartInput.value.trim()}` };
      if (!req.tickers.length) {
        renderStatic(view.screen, [line, { k: "info", h: `<span class="d">Usage: /chart AAPL, MSFT 1y  or  /chart AAPL 6mo candles volume rsi</span>` }]);
        return;
      }
      const html = CHARTS[canonical(req)];
      if (html) {
        renderStatic(view.screen, [line, { k: "visual", h: `\n${html}\n` }]);
        const node = view.screen.lastChild;
        if (!reduced) node.classList.add("reveal-wipe");
      } else {
        renderStatic(view.screen, [line, { k: "info", h: `\n<span class="chart-missing">This page has no drawing of that one. Try a combination from the options above or the list below.</span>\n<span class="d">Aloi itself draws any ticker your data source knows.</span>` }]);
      }
    }

    $("#chart-form").addEventListener("submit", (event) => { event.preventDefault(); draw(); });
    chartInput.addEventListener("change", draw);

    const extras = Object.keys(CHARTS).filter((key) => {
      const req = parseChart(key);
      return !(req.tickers.length === 1 && A.chartTickers.includes(req.tickers[0]) && ["6mo", "1y"].includes(req.period));
    });
    const more = $("#chart-more");
    extras.forEach((key) => {
      const chip = el("button", { type: "button", class: "chip", text: key });
      chip.addEventListener("click", () => { chartInput.value = key; draw(); });
      more.append(chip);
    });
    if (!Object.keys(CHARTS).length) $(".chart-more")?.setAttribute("hidden", "");
    draw();
  }

  /* ---------------- the answer check ---------------- */
  const drafts = $("#drafts");
  if (drafts) {
    const assay = A.assay;
    $("#assay-question").textContent = `“${assay.question}”`;
    const sources = $("#assay-sources");

    function showDraft(index) {
      const d = assay.drafts[index];
      $$(".tab", drafts).forEach((t, i) => t.setAttribute("aria-selected", String(i === index)));
      $("#draft-note").textContent = d.note;
      let html = "";
      let at = 0;
      d.spans.forEach((span) => {
        // The check ignores signs; the mark takes in a sign written against the figure.
        const start = /[+\-−]/.test(d.text[span.start - 1] || "") ? span.start - 1 : span.start;
        html += esc(d.text.slice(at, start));
        html += `<mark class="fig ${span.ok ? "fig-ok" : "fig-bad"}" title="${span.ok ? "Found in the fetched data" : "Not in the fetched data"}">${esc(d.text.slice(start, span.end))}</mark>`;
        at = span.end;
      });
      html += esc(d.text.slice(at));
      $("#draft-text").innerHTML = html;
      const bad = d.spans.filter((s) => !s.ok).map((s) => d.text.slice(s.start, s.end).trim());
      const verdict = $("#draft-verdict");
      verdict.classList.toggle("bad", bad.length > 0);
      verdict.textContent = bad.length
        ? `⚠ Not in the fetched data (worked out or made up by the model), check: ${bad.join(", ")}`
        : `No warning. All ${d.spans.length} figures were found in what the tools returned.`;
      sources.replaceChildren(...d.sources.map((name, i) => {
        const det = el("details", { class: "source" });
        if (i === 0) det.open = true;
        det.append(el("summary", { text: name }));
        let pretty = assay.sources[name];
        try { pretty = JSON.stringify(JSON.parse(pretty), null, 2); } catch { /* keep as sent */ }
        det.append(el("pre", {}, esc(pretty)));
        return det;
      }));
    }

    assay.drafts.forEach((d, i) => {
      const tab = el("button", { type: "button", class: "tab", role: "tab", "aria-selected": String(i === 0), text: d.name });
      tab.addEventListener("click", () => showDraft(i));
      drafts.append(tab);
    });
    showDraft(0);
  }

  /* ---------------- slash commands ---------------- */
  const commandTabs = $("#command-tabs");
  if (commandTabs) {
    const view = makeTerm({ title: "aloi", cls: "term-tall" });
    $("#command-term").append(view.term);
    const names = Object.keys(A.commands);
    names.forEach((name, i) => {
      const tab = el("button", { type: "button", class: "tab", role: "tab", "aria-selected": String(i === 0), text: name });
      tab.addEventListener("click", () => {
        $$(".tab", commandTabs).forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
        renderStatic(view.screen, A.commands[name].frames);
        view.body.scrollTop = 0;
      });
      commandTabs.append(tab);
    });
    renderStatic(view.screen, A.commands[names[0]].frames);
  }

  /* ---------------- tools ---------------- */
  const groupList = $("#group-list");
  if (groupList) {
    const groups = A.catalogue.groups;
    const state = { source: "yahoo", on: new Set(groups.map((g) => g.name)), last: "/tools all" };
    const detail = $("#tool-detail");
    const meter = $("#tool-meter");

    const available = (g) => g.tools.filter((t) => (state.source === "bloomberg" ? !(t.replacedOnBloomberg) : !t.only));
    const present = (g) => available(g).length > 0;

    groups.forEach((g) => {
      const li = el("li", { class: "group-row", "data-group": g.name });
      const id = `group-${g.name}`;
      const label = el("label", { for: id });
      const input = el("input", { type: "checkbox", id, checked: true });
      input.addEventListener("change", () => {
        if (input.checked) state.on.add(g.name); else state.on.delete(g.name);
        state.last = `/tools ${input.checked ? "on" : "off"} ${g.name}`;
        update();
      });
      const name = el("span", { class: "group-name" }, `${esc(g.name)}${g.core ? '<span class="core">core</span>' : ""}`);
      label.append(input, name, el("span", { class: "group-count" }));
      li.append(label);
      groupList.append(li);
    });

    const sections = groups.map((g) => {
      const sec = el("section", { class: "tool-group", "data-group": g.name });
      sec.append(el("h3", {}, `${esc(g.name)}${g.source ? ` <small>${esc(g.source)}</small>` : ""}`), el("p", { class: "what", text: g.what }));
      const ul = el("ul", { class: "tool-rows" });
      g.tools.forEach((t) => {
        const row = el("li", { "data-only": t.only || "", "data-replaced": String(!!t.replacedOnBloomberg) });
        row.append(el("div", { class: "nm" }, `${esc(t.name)}<span class="lb">${esc(t.label)}</span>`), el("div", { class: "ds", text: t.description }));
        ul.append(row);
      });
      sec.append(ul);
      return sec;
    });
    detail.append(el("div", { class: "tool-groups" }));
    detail.firstChild.append(...sections);

    function update() {
      let tools = 0;
      let chars = 0;
      groups.forEach((g, i) => {
        const avail = available(g);
        const on = state.on.has(g.name);
        const row = $(`.group-row[data-group="${g.name}"]`, groupList);
        row.classList.toggle("is-absent", !present(g));
        row.classList.toggle("is-off", !on);
        $("input", row).checked = on;
        $(".group-count", row).textContent = String(avail.length);
        const sec = sections[i];
        sec.hidden = !present(g);
        sec.classList.toggle("is-off", !on);
        $$("li", sec).forEach((li) => {
          const only = li.dataset.only;
          li.hidden = only === "bloomberg" && state.source !== "bloomberg";
          li.classList.toggle("is-replaced", state.source === "bloomberg" && li.dataset.replaced === "true");
        });
        if (on && present(g)) {
          tools += avail.length;
          chars += avail.reduce((sum, t) => sum + t.chars, 0);
        }
      });
      // As /tools reports it: the tool schemas as JSON, about four characters a token.
      meter.innerHTML = `<span class="d">› ${esc(state.last)}</span>\n${tools} tools enabled, about <span class="n">${Math.floor(chars / 4).toLocaleString("en-US")}</span> tokens of every request.`;
      meter.style.whiteSpace = "pre-wrap";
    }

    $$("[data-source]").forEach((btn) => btn.addEventListener("click", () => {
      state.source = btn.dataset.source;
      $$("[data-source]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      state.last = `/data ${state.source}`;
      update();
    }));
    $$("[data-preset]").forEach((btn) => btn.addEventListener("click", () => {
      const core = btn.dataset.preset === "core";
      state.on = new Set(groups.filter((g) => !core || g.core).map((g) => g.name));
      state.last = `/tools ${btn.dataset.preset}`;
      update();
    }));
    update();
  }

  /* ---------------- skills ---------------- */
  const skillGrid = $("#skill-grid");
  if (skillGrid) {
    A.catalogue.skills.forEach((s) => {
      const card = el("article", { class: "skill" });
      card.append(
        el("p", { class: "skill-meta", text: `${s.steps} steps · ${s.tools.length} tools` }),
        el("p", { class: "skill-usage", text: s.usage }),
        el("p", { class: "skill-desc", text: s.description }),
      );
      const tools = el("div", { class: "skill-tools" });
      s.tools.forEach((t) => tools.append(el("span", { text: t })));
      card.append(tools);
      if (byId[s.name]) {
        const run = el("button", { type: "button", class: "link-btn skill-run", text: `Replay /${s.name}` });
        run.addEventListener("click", () => {
          document.getElementById("sessions").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
          window.aloiSelectSession?.(s.name, true);
        });
        card.append(run);
      }
      skillGrid.append(card);
    });
  }

  /* ---------------- free sources ---------------- */
  const tags = $("#source-tags");
  if (tags) {
    [
      ["CoinGecko", "coin markets"], ["CoinPaprika", "the fallback"], ["DefiLlama", "TVL, yields, stablecoins"], ["Hyperliquid", "perpetuals, funding"],
      ["GeckoTerminal", "on-chain pools"], ["Deribit", "implied volatility"], ["alternative.me", "Fear & Greed"], ["FRED", "about 60 macro series"],
      ["Google News", "headlines"], ["SEC EDGAR", "filings, financials, insiders"], ["Polymarket", "event odds"],
    ].forEach(([name, what]) => tags.append(el("li", {}, `${esc(name)}<small>${esc(what)}</small>`)));
  }

  /* ---------------- the usage line ---------------- */
  const usageLine = $("#usage-line");
  if (usageLine) {
    const foot = sessions[0].frames.find((f) => f.k === "foot");
    const text = foot ? foot.h.replace(/<[^>]+>/g, "").trim() : "Worked for 4.4s · 2 tool call(s) · 25.4K tokens in (24.5K cached) · 568 out · $0.0006";
    const explain = {
      worked: "Wall time of the turn: the model's requests and the tool calls together.",
      tool: "How many tools the model called in this turn.",
      in: "Everything sent to the model over the turn's requests. “Cached” is the part the provider served from its prompt cache, at a discount.",
      out: "What the model wrote, its reasoning included.",
      cost: "Worked out from Anthropic's list prices, with the cheaper cache reads, the dearer cache writes, and Haiku's higher rate for prompts over 100K tokens. It is an estimate; your invoice is the reference. A local model shows its tokens and “no charge”.",
      session: "The running total of the session, once there is more than one answer in it. /usage gives the same.",
    };
    const keyOf = (part) => part.startsWith("Worked") ? "worked" : part.includes("tool call") ? "tool" : part.includes("tokens in") ? "in" : part.endsWith(" out") ? "out" : part.startsWith("session") ? "session" : part.startsWith("$") ? "cost" : null;
    const parts = text.split(" · ");
    parts.forEach((part, i) => {
      if (i) usageLine.append(document.createTextNode(" · "));
      const key = keyOf(part);
      if (!key) { usageLine.append(document.createTextNode(part)); return; }
      const btn = el("button", { type: "button", "aria-pressed": "false", text: part });
      btn.addEventListener("click", () => {
        $$("button", usageLine).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        $("#usage-explain").textContent = explain[key];
      });
      usageLine.append(btn);
    });
    $("#usage-explain").textContent = "From the session at the top of this page, priced as Claude Sonnet 5.5.";
  }

  /* ---------------- install ---------------- */
  $$(".install-line").forEach((node) => {
    const [before, after] = node.dataset.template.split("{host}");
    node.replaceChildren(document.createTextNode(before), el("span", { class: "host", text: INSTALL_HOST }), document.createTextNode(after));
  });
  $$(".install .tab").forEach((tab) => tab.addEventListener("click", () => {
    $$(".install .tab").forEach((t) => {
      t.setAttribute("aria-selected", String(t === tab));
      document.getElementById(t.getAttribute("aria-controls")).hidden = t !== tab;
    });
  }));
  $$(".copy").forEach((btn) => btn.addEventListener("click", () => {
    const code = btn.parentElement.querySelector("code");
    const text = code.textContent;
    const done = () => { btn.textContent = "Copied"; setTimeout(() => { btn.textContent = "Copy"; }, 1600); };
    const select = () => {
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = "Selected";
      setTimeout(() => { btn.textContent = "Copy"; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, select);
    else select();
  }));

  const setupHost = $("#setup-term");
  if (setupHost) {
    const view = makeTerm({ title: "~", tag: null, cls: "term-tall" });
    setupHost.append(view.term);
    renderStatic(view.screen, A.setup);
  }

  const codeHost = $("#code-term");
  if (codeHost) {
    const view = makeTerm({ title: "drawn by Aloi's own bar chart", tag: null, cols: 74 });
    codeHost.append(view.term);
    renderStatic(view.screen, [{ k: "visual", h: A.code.h }]);
  }

  /* ---------------- the touchstone ---------------- */
  const canvas = $("#touchstone");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const paths = Object.entries(A.streaks);
    const labels = { "NVDA": "NVDA · 1y", "GC=F": "Gold · 2y", "BTC-USD": "Bitcoin · 1y", "^GSPC": "S&P 500 · 5y", "XLK": "Technology · 2y" };
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    function paintStone(w, h) {
      seed = 7;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#151a18");
      g.addColorStop(1, "#0c0f0e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < (w * h) / 55; i += 1) {
        ctx.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${0.012 + rand() * 0.035})` : `rgba(0,0,0,${0.08 + rand() * 0.2})`;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.4, 1 + rand() * 1.4);
      }
      ctx.lineWidth = 1;
      for (let v = 0; v < 5; v += 1) {
        ctx.strokeStyle = `rgba(200,210,200,${0.025 + rand() * 0.03})`;
        ctx.beginPath();
        const y = rand() * h;
        ctx.moveTo(-20, y);
        ctx.bezierCurveTo(w * 0.3, y + (rand() - 0.5) * 120, w * 0.6, y + (rand() - 0.5) * 120, w + 20, y + (rand() - 0.5) * 60);
        ctx.stroke();
      }
    }

    function paintStreaks(w, h, progress) {
      const shown = w < 700 ? paths.slice(0, 3) : paths;
      const slot = w / shown.length;
      shown.forEach(([ticker, values], i) => {
        const lag = 0.08;
        const p = Math.max(0, Math.min(1, progress * (1 + lag * (shown.length - 1)) - i * lag));
        if (p <= 0) return;
        const left = i * slot + slot * 0.1;
        const width = slot * 0.8;
        const top = h * 0.16;
        const height = h * 0.52;
        const lo = Math.min(...values), hi = Math.max(...values);
        const n = Math.max(2, Math.floor(values.length * p));
        const point = (k) => [left + (k / (values.length - 1)) * width, top + height - ((values[k] - lo) / (hi - lo || 1)) * height + (k / values.length) * -8];
        seed = 31 + i * 101;
        for (let pass = 0; pass < 16; pass += 1) {
          const jitter = (rand() - 0.5) * 7;
          ctx.strokeStyle = ["rgba(226,182,90,", "rgba(243,212,138,", "rgba(186,138,46,"][pass % 3] + (0.05 + rand() * 0.16) + ")";
          ctx.lineWidth = 0.8 + rand() * 2.4;
          ctx.lineCap = "round";
          ctx.beginPath();
          for (let k = 0; k < n; k += 1) {
            const [x, y] = point(k);
            if (k === 0) ctx.moveTo(x, y + jitter); else ctx.lineTo(x, y + jitter + (rand() - 0.5) * 1.6);
          }
          ctx.stroke();
        }
        for (let k = 0; k < n; k += 1) {
          const [x, y] = point(k);
          if (rand() < 0.5) {
            ctx.fillStyle = `rgba(250,226,160,${0.2 + rand() * 0.5})`;
            ctx.fillRect(x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8, 1, 1);
          }
        }
        if (p > 0.999) {
          ctx.fillStyle = "rgba(200,206,200,0.62)";
          ctx.font = "500 11px 'Aloi Term', 'DejaVu Sans Mono', monospace";
          ctx.fillText(labels[ticker] || ticker, left, h * 0.9);
        }
      });
    }

    let started = null;
    function frame(time) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!started) started = time;
      const progress = reduced ? 1 : Math.min(1, (time - started) / 2400);
      paintStone(w, h);
      paintStreaks(w, h, progress);
      if (progress < 1) requestAnimationFrame(frame);
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const start = () => requestAnimationFrame(frame);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start, start);
    let timer;
    window.addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { resize(); started = -1e9; requestAnimationFrame(frame); }, 150);
    });
  }
})();
