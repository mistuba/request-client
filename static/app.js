"use strict";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const urlInput = document.getElementById("url");
const sendBtn = document.getElementById("send");
const methodBtn = document.getElementById("methodBtn");
const methodMenu = document.getElementById("methodMenu");
const methodWrap = document.getElementById("methodWrap");
const sslInput = document.getElementById("ssl");
const rawType = document.getElementById("rawType");
const beautifyBtn = document.getElementById("beautify");
const jsonHint = document.getElementById("jsonHint");
const rawBody = document.getElementById("rawBody");
const respContent = document.getElementById("respContent");
const statsEl = document.getElementById("stats");
const viewToggle = document.getElementById("viewToggle");
const respHeadersTab = document.getElementById("respHeadersTab");

let method = "GET";
let bodyMode = "none";
let respTab = "body";
let respView = "pretty";
let writingURL = false;
let controller = null;
let last = null;
let nextID = 1;

const params = [];
const headers = [];
const formFields = [];
const urlencodedFields = [];

function uid() {
  return nextID++;
}

function mountTable(parent, state) {
  parent.innerHTML = "";
  const head = document.createElement("div");
  head.className = "kv-head" + (state.description ? "" : " nodesc");
  const all = document.createElement("input");
  all.type = "checkbox";
  all.className = "check-all";
  head.append(all, label("Key"), label("Value"));
  if (state.description) head.append(label("Description"));
  head.append(document.createElement("span"));
  const body = document.createElement("div");
  body.className = "kv-body";
  parent.append(head, body);

  function label(text) {
    const span = document.createElement("span");
    span.textContent = text;
    return span;
  }

  function updateBulk() {
    if (state.rows.length === 0) {
      all.checked = false;
      all.indeterminate = false;
      return;
    }
    const on = state.rows.filter((row) => row.enabled).length;
    all.checked = on === state.rows.length;
    all.indeterminate = on > 0 && on < state.rows.length;
  }

  function paint() {
    body.replaceChildren();
    const rows = state.rows.concat([{ id: "ghost", enabled: true, key: "", value: "", description: "", ghost: true }]);
    for (const row of rows) {
      const el = document.createElement("div");
      el.className = "kv-row" + (state.description ? "" : " nodesc") + (row.enabled ? "" : " off");
      el.dataset.id = String(row.id);
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "row-check";
      check.checked = row.enabled;
      el.append(check, textField("key", "Key", row.key), textField("value", "Value", row.value));
      if (state.description) el.append(textField("description", "Description", row.description || ""));
      if (!row.ghost) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "del";
        del.textContent = "×";
        del.setAttribute("aria-label", "Remove");
        el.append(del);
      } else {
        el.append(document.createElement("span"));
      }
      body.append(el);
    }
    updateBulk();
  }

  function textField(field, placeholder, value) {
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.field = field;
    input.placeholder = placeholder;
    input.value = value;
    input.spellcheck = false;
    input.autocomplete = "off";
    return input;
  }

  function readRow(rowEl) {
    return {
      enabled: rowEl.querySelector(".row-check").checked,
      key: rowEl.querySelector('[data-field="key"]').value,
      value: rowEl.querySelector('[data-field="value"]').value,
      description: rowEl.querySelector('[data-field="description"]')?.value || "",
    };
  }

  function focusCell(id, field) {
    const input = body.querySelector(`[data-id="${id}"] [data-field="${field}"]`);
    if (!input) return;
    input.focus();
    const pos = input.value.length;
    input.setSelectionRange(pos, pos);
  }

  body.addEventListener("input", (event) => {
    const rowEl = event.target.closest(".kv-row");
    const field = event.target.dataset.field;
    if (!rowEl || !field) return;
    if (rowEl.dataset.id === "ghost") {
      const data = readRow(rowEl);
      const row = { id: uid(), ...data };
      state.rows.push(row);
      paint();
      focusCell(row.id, field);
      state.onChange();
      return;
    }
    const row = state.rows.find((item) => String(item.id) === rowEl.dataset.id);
    if (!row) return;
    row[field] = event.target.value;
    state.onChange();
  });

  body.addEventListener("change", (event) => {
    if (!event.target.classList.contains("row-check")) return;
    const rowEl = event.target.closest(".kv-row");
    if (!rowEl || rowEl.dataset.id === "ghost") {
      event.target.checked = true;
      return;
    }
    const row = state.rows.find((item) => String(item.id) === rowEl.dataset.id);
    if (!row) return;
    row.enabled = event.target.checked;
    rowEl.classList.toggle("off", !row.enabled);
    updateBulk();
    state.onChange();
  });

  body.addEventListener("click", (event) => {
    const del = event.target.closest(".del");
    if (!del) return;
    const rowEl = del.closest(".kv-row");
    const id = rowEl.dataset.id;
    state.rows.splice(0, state.rows.length, ...state.rows.filter((row) => String(row.id) !== id));
    paint();
    state.onChange();
  });

  all.addEventListener("change", () => {
    for (const row of state.rows) row.enabled = all.checked;
    paint();
    state.onChange();
  });

  paint();
  return { paint };
}

const paramsTable = mountTable(document.getElementById("params-table"), {
  rows: params,
  description: true,
  onChange: syncURLFromParams,
});
const headersTable = mountTable(document.getElementById("headers-table"), {
  rows: headers,
  description: true,
  onChange: updateCounts,
});
const formTable = mountTable(document.getElementById("body-formdata"), {
  rows: formFields,
  description: false,
  onChange: updateCounts,
});
const urlencodedTable = mountTable(document.getElementById("body-urlencoded"), {
  rows: urlencodedFields,
  description: false,
  onChange: updateCounts,
});

function activeFields() {
  if (bodyMode === "formdata") return formFields;
  if (bodyMode === "urlencoded") return urlencodedFields;
  return [];
}

function updateCounts() {
  const paramsTab = document.querySelector('.tab[data-tab="params"]');
  const headersTab = document.querySelector('.tab[data-tab="headers"]');
  const bodyTab = document.querySelector('.tab[data-tab="body"]');
  const paramCount = params.filter((row) => row.enabled && row.key !== "").length;
  const headerCount = headers.filter((row) => row.enabled && row.key.trim() !== "").length;
  paramsTab.textContent = paramCount ? `Params (${paramCount})` : "Params";
  headersTab.textContent = headerCount ? `Headers (${headerCount})` : "Headers";
  bodyTab.classList.toggle("dotted", bodyMode !== "none");
}

function readQuery(raw) {
  const hash = raw.indexOf("#");
  const before = hash >= 0 ? raw.slice(0, hash) : raw;
  const q = before.indexOf("?");
  if (q < 0) return [];
  const out = [];
  for (const [key, value] of new URLSearchParams(before.slice(q + 1))) {
    if (key === "" && value === "") continue;
    out.push({ key, value });
  }
  return out;
}

function samePairs(left, right) {
  if (left.length !== right.length) return false;
  return left.every((pair, index) => pair.key === right[index].key && pair.value === right[index].value);
}

function syncURLFromParams() {
  const raw = urlInput.value;
  const hashAt = raw.indexOf("#");
  const hash = hashAt >= 0 ? raw.slice(hashAt) : "";
  const before = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const qAt = before.indexOf("?");
  const base = qAt >= 0 ? before.slice(0, qAt) : before;
  const search = new URLSearchParams();
  for (const row of params) {
    if (row.enabled && row.key !== "") search.append(row.key, row.value);
  }
  const query = search.toString();
  const next = base + (query ? `?${query}` : "") + hash;
  if (next !== raw) {
    writingURL = true;
    urlInput.value = next;
    writingURL = false;
  }
  updateCounts();
}

function onURLInput() {
  if (writingURL) return;
  const query = readQuery(urlInput.value);
  const current = params.filter((row) => row.enabled && row.key !== "").map((row) => ({ key: row.key, value: row.value }));
  if (samePairs(current, query)) return;
  const extras = params.filter((row) => !row.enabled || row.key === "");
  const old = params.filter((row) => row.enabled && row.key !== "");
  const used = new Set();
  const merged = query.map((pair) => {
    let index = old.findIndex((row, i) => !used.has(i) && row.key === pair.key && row.value === pair.value);
    if (index < 0) index = old.findIndex((row, i) => !used.has(i) && row.key === pair.key);
    if (index >= 0) {
      used.add(index);
      return { ...old[index], key: pair.key, value: pair.value };
    }
    return { id: uid(), enabled: true, key: pair.key, value: pair.value, description: "" };
  });
  params.splice(0, params.length, ...merged, ...extras);
  paramsTable.paint();
  updateCounts();
}

function setMethod(next) {
  method = next;
  methodBtn.textContent = next;
  methodBtn.className = `method-btn ${next}`;
  methodMenu.hidden = true;
  methodBtn.setAttribute("aria-expanded", "false");
  for (const button of methodMenu.querySelectorAll("button")) {
    button.classList.toggle("selected", button.dataset.method === next);
  }
}

for (const name of METHODS) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.method = name;
  button.className = name + (name === method ? " selected" : "");
  const label = document.createElement("span");
  label.textContent = name;
  const tick = document.createElement("span");
  tick.className = "tick";
  button.append(label, tick);
  button.addEventListener("click", () => setMethod(name));
  methodMenu.append(button);
}

methodBtn.addEventListener("click", () => {
  const willOpen = methodMenu.hidden;
  methodMenu.hidden = !willOpen;
  methodBtn.setAttribute("aria-expanded", String(willOpen));
  if (!willOpen) return;
  const rect = methodBtn.getBoundingClientRect();
  methodMenu.style.left = `${rect.left}px`;
  methodMenu.style.top = `${rect.bottom + 4}px`;
});

document.addEventListener("click", (event) => {
  if (!methodWrap.contains(event.target)) {
    methodMenu.hidden = true;
    methodBtn.setAttribute("aria-expanded", "false");
  }
});

window.addEventListener("resize", () => {
  methodMenu.hidden = true;
  methodBtn.setAttribute("aria-expanded", "false");
});

function showTab(name) {
  for (const button of document.querySelectorAll(".tab")) {
    button.classList.toggle("active", button.dataset.tab === name);
  }
  for (const panel of document.querySelectorAll(".tab-panel")) {
    panel.classList.toggle("active", panel.id === `panel-${name}`);
  }
}

document.querySelector(".tabs").addEventListener("click", (event) => {
  const button = event.target.closest(".tab");
  if (button) showTab(button.dataset.tab);
});

function showBodyMode(mode) {
  bodyMode = mode;
  document.getElementById("body-none").hidden = mode !== "none";
  document.getElementById("body-formdata").hidden = mode !== "formdata";
  document.getElementById("body-urlencoded").hidden = mode !== "urlencoded";
  document.getElementById("body-raw").hidden = mode !== "raw";
  const raw = mode === "raw";
  rawType.hidden = !raw;
  beautifyBtn.hidden = !raw || rawType.value !== "json";
  if (!raw) jsonHint.hidden = true;
  updateCounts();
}

for (const input of document.querySelectorAll('input[name="bodyMode"]')) {
  input.addEventListener("change", () => {
    if (input.checked) showBodyMode(input.value);
  });
}

rawType.addEventListener("change", () => {
  beautifyBtn.hidden = rawType.value !== "json";
  jsonHint.hidden = true;
});

beautifyBtn.addEventListener("click", () => {
  try {
    rawBody.value = JSON.stringify(JSON.parse(rawBody.value), null, 2);
    jsonHint.hidden = true;
  } catch {
    jsonHint.hidden = false;
  }
});

rawBody.addEventListener("input", () => {
  jsonHint.hidden = true;
});

urlInput.addEventListener("input", onURLInput);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (!controller) void send();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    methodMenu.hidden = true;
    methodBtn.setAttribute("aria-expanded", "false");
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    if (!controller) void send();
  }
});

sendBtn.addEventListener("click", () => {
  if (controller) {
    controller.abort();
    return;
  }
  void send();
});

function ensureScheme(raw) {
  const text = raw.trim();
  if (!text) return text;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) return text;
  if (text.startsWith("//")) return `http:${text}`;
  return `http://${text}`;
}

function setSending(sending) {
  sendBtn.textContent = sending ? "Cancel" : "Send";
  sendBtn.classList.toggle("cancel", sending);
  sendBtn.title = sending ? "Cancel" : "Send (Ctrl+Enter)";
}

function showRespTab(name) {
  respTab = name;
  for (const button of document.querySelectorAll(".resp-tab")) {
    button.classList.toggle("active", button.dataset.rtab === name);
  }
  renderResponse();
}

document.querySelector(".resp-head").addEventListener("click", (event) => {
  const tab = event.target.closest(".resp-tab");
  if (tab) showRespTab(tab.dataset.rtab);
  const view = event.target.closest("[data-view]");
  if (view) {
    respView = view.dataset.view;
    for (const button of viewToggle.querySelectorAll("[data-view]")) {
      button.classList.toggle("active", button.dataset.view === respView);
    }
    renderResponse();
  }
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!last || last.error) return;
  const text = respView === "pretty" && last.pretty != null ? last.pretty : last.body || "";
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* clipboard can be unavailable */
  }
});

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 10 ? kb.toFixed(1) : kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb >= 10 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
}

function formatTime(ms) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function statusClass(status) {
  if (status >= 500) return "status-5xx";
  if (status >= 400) return "status-4xx";
  if (status >= 300) return "status-3xx";
  if (status >= 200) return "status-2xx";
  return "";
}

function escapeHTML(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightJSON(text) {
  let index = 0;
  let html = "";
  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === "\\") {
          end += 2;
          continue;
        }
        if (text[end] === '"') {
          end++;
          break;
        }
        end++;
      }
      const token = text.slice(index, end);
      let look = end;
      while (look < text.length && /\s/.test(text[look])) look++;
      const kind = text[look] === ":" ? "tok-key" : "tok-str";
      html += `<span class="${kind}">${escapeHTML(token)}</span>`;
      index = end;
      continue;
    }
    if (char === "-" || (char >= "0" && char <= "9")) {
      const match = text.slice(index).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (match) {
        html += `<span class="tok-num">${match[0]}</span>`;
        index += match[0].length;
        continue;
      }
    }
    const word = text.startsWith("true", index) ? "true" : text.startsWith("false", index) ? "false" : text.startsWith("null", index) ? "null" : "";
    if (word) {
      const after = text[index + word.length];
      if (!after || !/[A-Za-z0-9_]/.test(after)) {
        html += `<span class="tok-lit">${word}</span>`;
        index += word.length;
        continue;
      }
    }
    html += escapeHTML(char);
    index++;
  }
  return html;
}

function tryPretty(text, contentType) {
  const trimmed = text.trim();
  const looksJSON = (contentType || "").includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksJSON) return null;
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
}

function renderStats() {
  statsEl.replaceChildren();
  viewToggle.hidden = true;
  respHeadersTab.textContent = "Headers";
  if (!last || last.error || last.sending) return;
  const status = document.createElement("span");
  status.className = `status ${statusClass(last.status)}`;
  status.textContent = last.statusText || String(last.status);
  const time = document.createElement("span");
  time.className = "muted";
  time.textContent = formatTime(last.timeMs);
  const size = document.createElement("span");
  size.className = "muted";
  size.textContent = formatSize(last.size);
  statsEl.append(status, time, size);
  const count = (last.headers || []).length;
  respHeadersTab.textContent = count ? `Headers (${count})` : "Headers";
  viewToggle.hidden = respTab !== "body" || last.binary;
}

function renderResponse() {
  renderStats();
  respContent.replaceChildren();
  if (!last) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "Click <b>Send</b> to get a response";
    respContent.append(empty);
    return;
  }
  if (last.sending) {
    const sending = document.createElement("div");
    sending.className = "sending";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    sending.append(spinner, document.createTextNode("Sending…"));
    respContent.append(sending);
    return;
  }
  if (last.error) {
    const box = document.createElement("div");
    box.className = "callout";
    box.textContent = last.error;
    respContent.append(box);
    return;
  }
  if (last.redirected && last.finalUrl) {
    const note = document.createElement("div");
    note.className = "redirect";
    note.append("Redirected to ");
    const target = document.createElement("b");
    target.textContent = last.finalUrl;
    note.append(target);
    respContent.append(note);
  }
  if (last.truncated) {
    const banner = document.createElement("div");
    banner.className = "banner";
    banner.textContent = "Response is larger than the display limit. Showing the first part only.";
    respContent.append(banner);
  }
  if (respTab === "headers") {
    const table = document.createElement("table");
    table.className = "header-table";
    for (const header of last.headers || []) {
      const tr = document.createElement("tr");
      const key = document.createElement("td");
      const value = document.createElement("td");
      key.textContent = header.key;
      value.textContent = header.value;
      tr.append(key, value);
      table.append(tr);
    }
    respContent.append(table);
    return;
  }
  if (last.binary) {
    const note = document.createElement("div");
    note.className = "binary-note";
    note.textContent = last.bodyBase64 ? "Image response" : `Binary response, ${formatSize(last.size)}`;
    respContent.append(note);
    if (last.bodyBase64 && /^image\/[a-z0-9.+-]+$/.test((last.contentType || "").split(";")[0].trim().toLowerCase())) {
      const img = document.createElement("img");
      img.className = "preview";
      img.alt = "Response image";
      img.src = `data:${last.contentType.split(";")[0].trim()};base64,${last.bodyBase64}`;
      respContent.append(img);
    }
    return;
  }
  const pre = document.createElement("pre");
  pre.className = "code";
  if (respView === "pretty" && last.pretty != null) {
    pre.innerHTML = highlightJSON(last.pretty);
  } else {
    pre.textContent = last.body || "";
  }
  respContent.append(pre);
}

async function send() {
  let url = urlInput.value.trim();
  if (!url) {
    last = { error: "Enter a request URL" };
    renderResponse();
    urlInput.focus();
    return;
  }
  const normalized = ensureScheme(url);
  if (normalized !== url) {
    urlInput.value = normalized;
    onURLInput();
    url = normalized;
  }
  const payload = {
    method,
    url,
    headers: headers.filter((row) => row.enabled && row.key.trim()).map((row) => ({ key: row.key.trim(), value: row.value })),
    bodyMode,
    rawType: rawType.value,
    raw: bodyMode === "raw" ? rawBody.value : "",
    fields: activeFields().filter((row) => row.enabled && row.key.trim()).map((row) => ({ key: row.key.trim(), value: row.value })),
    insecure: !sslInput.checked,
  };
  controller = new AbortController();
  setSending(true);
  last = { sending: true };
  renderResponse();
  try {
    const response = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      last = { error: data.error || "Request failed" };
    } else {
      const pretty = data.binary ? null : tryPretty(data.body || "", data.contentType);
      last = { ...data, pretty };
      if (pretty == null) respView = "raw";
      else respView = "pretty";
      for (const button of viewToggle.querySelectorAll("[data-view]")) {
        button.classList.toggle("active", button.dataset.view === respView);
      }
    }
  } catch (error) {
    last = { error: error.name === "AbortError" ? "Request canceled" : "Could not reach the local app" };
  } finally {
    controller = null;
    setSending(false);
    renderResponse();
  }
}

const splitter = document.getElementById("splitter");
const requestPane = document.getElementById("requestPane");
splitter.addEventListener("mousedown", (event) => {
  event.preventDefault();
  const startY = event.clientY;
  const startH = requestPane.getBoundingClientRect().height;
  function move(ev) {
    const max = document.getElementById("workspace").getBoundingClientRect().height - 180;
    const next = Math.min(max, Math.max(180, startH + (ev.clientY - startY)));
    requestPane.style.height = `${next}px`;
  }
  function up() {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    document.body.classList.remove("dragging");
  }
  document.body.classList.add("dragging");
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
});

renderResponse();
updateCounts();
