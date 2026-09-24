"use strict";

const I18N = {
  zh: {
    title: "请求",
    brand: "请求",
    language: "语言",
    urlPlaceholder: "输入请求地址",
    send: "发送",
    sendTitle: "发送（Ctrl+Enter）",
    cancel: "取消",
    params: "参数",
    headers: "请求头",
    body: "请求体",
    ssl: "SSL 校验",
    sslTitle: "校验 TLS 证书",
    queryParams: "查询参数",
    bodyNone: "无",
    bodyForm: "form-data",
    bodyUrlencoded: "x-www-form-urlencoded",
    bodyRaw: "原始",
    rawText: "文本",
    beautify: "格式化",
    minify: "压缩",
    invalidJSON: "JSON 无效",
    resize: "拖动调整高度",
    respBody: "响应体",
    respHeaders: "响应头",
    pretty: "美化",
    rawView: "原始",
    copy: "复制",
    newRequest: "新请求",
    duplicateRequest: "复制",
    duplicateRequestTitle: "复制当前请求",
    closeRequest: "关闭",
    requestN: "请求 {n}",
    key: "键",
    value: "值",
    description: "说明",
    remove: "删除",
    paramsCount: "参数 ({n})",
    headersCount: "请求头 ({n})",
    respHeadersCount: "响应头 ({n})",
    emptyBefore: "点击 ",
    emptyAfter: " 查看响应",
    sending: "发送中…",
    redirected: "已重定向到 ",
    truncated: "响应超过显示上限，只显示前面一部分。",
    imageResponse: "图片响应",
    binaryResponse: "二进制响应，{size}",
    responseImage: "响应图片",
    enterURL: "请输入请求地址",
    requestFailed: "请求失败",
    canceled: "请求已取消",
    unreachable: "无法连接本地程序",
    errRead: "无法读取请求",
    errMethod: "不支持的方法",
    errURL: "请输入 http 或 https 地址",
    errBody: "未知的请求体类型",
    errTimeout: "请求超时",
    errRefused: "无法连接：服务器拒绝了连接",
    errHost: "无法解析主机",
    errRedirects: "重定向超过 10 次，已停止",
    errRedirectScheme: "重定向到了非 http 地址",
    errHeader: "请求头无效：{name}",
    errHeaderName: "请求头名称无效：{name}",
    errTLS: "TLS 证书错误。如果信任该主机，可以关闭 SSL 校验。{detail}",
  },
  en: {
    title: "Request",
    brand: "Request",
    language: "Language",
    urlPlaceholder: "Enter request URL",
    send: "Send",
    sendTitle: "Send (Ctrl+Enter)",
    cancel: "Cancel",
    params: "Params",
    headers: "Headers",
    body: "Body",
    ssl: "SSL verify",
    sslTitle: "Verify TLS certificates",
    queryParams: "Query Params",
    bodyNone: "none",
    bodyForm: "form-data",
    bodyUrlencoded: "x-www-form-urlencoded",
    bodyRaw: "raw",
    rawText: "Text",
    beautify: "Beautify",
    minify: "Minify",
    invalidJSON: "Invalid JSON",
    resize: "Drag to resize",
    respBody: "Body",
    respHeaders: "Headers",
    pretty: "Pretty",
    rawView: "Raw",
    copy: "Copy",
    newRequest: "New request",
    duplicateRequest: "Duplicate",
    duplicateRequestTitle: "Duplicate this request",
    closeRequest: "Close",
    requestN: "Request {n}",
    key: "Key",
    value: "Value",
    description: "Description",
    remove: "Remove",
    paramsCount: "Params ({n})",
    headersCount: "Headers ({n})",
    respHeadersCount: "Headers ({n})",
    emptyBefore: "Click ",
    emptyAfter: " to get a response",
    sending: "Sending…",
    redirected: "Redirected to ",
    truncated: "Response is larger than the display limit. Showing the first part only.",
    imageResponse: "Image response",
    binaryResponse: "Binary response, {size}",
    responseImage: "Response image",
    enterURL: "Enter a request URL",
    requestFailed: "Request failed",
    canceled: "Request canceled",
    unreachable: "Could not reach the local app",
    errRead: "Could not read the request",
    errMethod: "Unsupported method",
    errURL: "Enter an http or https URL",
    errBody: "Unknown body type",
    errTimeout: "The request timed out",
    errRefused: "Could not connect: the server refused the connection",
    errHost: "Could not resolve the host",
    errRedirects: "stopped after 10 redirects",
    errRedirectScheme: "redirect to a non-http URL",
    errHeader: "Invalid header {name}",
    errHeaderName: "Invalid header name {name}",
    errTLS: "TLS certificate error. Turn off SSL verify if you trust this host. {detail}",
  },
};

const SERVER_ERRORS = {
  "Could not read the request": "errRead",
  "Unsupported method": "errMethod",
  "Enter an http or https URL": "errURL",
  "Enter a request URL": "enterURL",
  "Unknown body type": "errBody",
  "The request timed out": "errTimeout",
  "Could not connect: the server refused the connection": "errRefused",
  "Could not resolve the host": "errHost",
  "stopped after 10 redirects": "errRedirects",
  "redirect to a non-http URL": "errRedirectScheme",
  "Request failed": "requestFailed",
  "Request canceled": "canceled",
  "Could not reach the local app": "unreachable",
};

let lang = "zh";
try {
  const saved = localStorage.getItem("request-lang");
  if (saved === "en" || saved === "zh") lang = saved;
} catch {
  /* keep the default */
}

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
}

function tf(key, vars) {
  let text = t(key);
  for (const [name, value] of Object.entries(vars || {})) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

function translateError(message) {
  if (!message) return "";
  const known = SERVER_ERRORS[message];
  if (known) return t(known);
  if (message.startsWith("Invalid header name ")) return tf("errHeaderName", { name: message.slice("Invalid header name ".length) });
  if (message.startsWith("Invalid header ")) return tf("errHeader", { name: message.slice("Invalid header ".length) });
  const tls = "TLS certificate error. Turn off SSL verify if you trust this host. ";
  if (message.startsWith(tls)) return tf("errTLS", { detail: message.slice(tls.length) });
  return message;
}

function applyI18n() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.getAttribute("data-i18n-title"));
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  }
  for (const el of document.querySelectorAll("[data-i18n-aria]")) {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  }
  for (const button of document.querySelectorAll(".lang-switch [data-lang]")) {
    const on = button.dataset.lang === lang;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", String(on));
  }
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const urlInput = document.getElementById("url");
const sendBtn = document.getElementById("send");
const methodBtn = document.getElementById("methodBtn");
const methodMenu = document.getElementById("methodMenu");
const methodWrap = document.getElementById("methodWrap");
const sslInput = document.getElementById("ssl");
const rawType = document.getElementById("rawType");
const beautifyBtn = document.getElementById("beautify");
const minifyBtn = document.getElementById("minify");
const jsonHint = document.getElementById("jsonHint");
const rawBody = document.getElementById("rawBody");
const rawHighlight = document.getElementById("rawHighlight");
const respContent = document.getElementById("respContent");
const statsEl = document.getElementById("stats");
const viewToggle = document.getElementById("viewToggle");
const respHeadersTab = document.getElementById("respHeadersTab");

let method = "GET";
let bodyMode = "none";
let respTab = "body";
let respView = "pretty";
let writingURL = false;
let last = null;
const inflight = new Map();
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
  head.append(all, label("key"), label("value"));
  if (state.description) head.append(label("description"));
  head.append(document.createElement("span"));
  const body = document.createElement("div");
  body.className = "kv-body";
  parent.append(head, body);

  function label(key) {
    const span = document.createElement("span");
    span.dataset.i18n = key;
    span.textContent = t(key);
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
    for (const span of head.querySelectorAll("[data-i18n]")) {
      span.textContent = t(span.dataset.i18n);
    }
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
      el.append(check, textField("key", "key", row.key), textField("value", "value", row.value));
      if (state.description) el.append(textField("description", "description", row.description || ""));
      if (!row.ghost) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "del";
        del.textContent = "×";
        del.setAttribute("aria-label", t("remove"));
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
    input.placeholder = t(placeholder);
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
  paramsTab.textContent = paramCount ? tf("paramsCount", { n: paramCount }) : t("params");
  headersTab.textContent = headerCount ? tf("headersCount", { n: headerCount }) : t("headers");
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
  refreshActiveLabel();
}

function refreshActiveLabel() {
  const name = document.querySelector(`.req-tab[data-id="${activeId}"] .req-name`);
  const sheet = sheets.find((item) => item.id === activeId);
  if (name && sheet) name.textContent = sheetLabel(sheet);
}

function onURLInput() {
  refreshActiveLabel();
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
  document.getElementById("body-formdata").hidden = mode !== "formdata";
  document.getElementById("body-urlencoded").hidden = mode !== "urlencoded";
  document.getElementById("body-raw").hidden = mode !== "raw";
  const raw = mode === "raw";
  rawType.hidden = !raw;
  const json = raw && rawType.value === "json";
  beautifyBtn.hidden = !json;
  minifyBtn.hidden = !json;
  if (!raw) jsonHint.hidden = true;
  paintRaw();
  updateCounts();
}

for (const input of document.querySelectorAll('input[name="bodyMode"]')) {
  input.addEventListener("change", () => {
    if (input.checked) showBodyMode(input.value);
  });
}

rawType.addEventListener("change", () => {
  const json = rawType.value === "json";
  beautifyBtn.hidden = !json;
  minifyBtn.hidden = !json;
  jsonHint.hidden = true;
  paintRaw();
});

function rewriteJSON(space) {
  try {
    rawBody.value = JSON.stringify(JSON.parse(rawBody.value), null, space);
    jsonHint.hidden = true;
  } catch {
    jsonHint.hidden = false;
  }
  paintRaw();
}

beautifyBtn.addEventListener("click", () => rewriteJSON(2));
minifyBtn.addEventListener("click", () => rewriteJSON(0));

function paintRaw() {
  const json = bodyMode === "raw" && rawType.value === "json";
  rawBody.classList.toggle("plain", !json);
  rawHighlight.hidden = !json;
  if (!json) {
    rawHighlight.textContent = "";
    return;
  }
  const text = rawBody.value;
  rawHighlight.innerHTML = highlightJSON(text) + (text.endsWith("\n") ? "\n" : "");
  rawHighlight.scrollTop = rawBody.scrollTop;
  rawHighlight.scrollLeft = rawBody.scrollLeft;
}

rawBody.addEventListener("input", () => {
  jsonHint.hidden = true;
  paintRaw();
});

rawBody.addEventListener("scroll", () => {
  rawHighlight.scrollTop = rawBody.scrollTop;
  rawHighlight.scrollLeft = rawBody.scrollLeft;
});

urlInput.addEventListener("input", onURLInput);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (!inflight.has(activeId)) void send();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    methodMenu.hidden = true;
    methodBtn.setAttribute("aria-expanded", "false");
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    if (!inflight.has(activeId)) void send();
  }
});

sendBtn.addEventListener("click", () => {
  const current = inflight.get(activeId);
  if (current) {
    current.abort();
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
  sendBtn.textContent = sending ? t("cancel") : t("send");
  sendBtn.classList.toggle("cancel", sending);
  sendBtn.title = sending ? t("cancel") : t("sendTitle");
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
  respHeadersTab.textContent = t("respHeaders");
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
  respHeadersTab.textContent = count ? tf("respHeadersCount", { n: count }) : t("respHeaders");
  viewToggle.hidden = respTab !== "body" || last.binary;
}

function renderResponse() {
  renderStats();
  respContent.replaceChildren();
  if (!last) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.append(document.createTextNode(t("emptyBefore")));
    const sendLabel = document.createElement("b");
    sendLabel.textContent = t("send");
    empty.append(sendLabel, document.createTextNode(t("emptyAfter")));
    respContent.append(empty);
    return;
  }
  if (last.sending) {
    const sending = document.createElement("div");
    sending.className = "sending";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    sending.append(spinner, document.createTextNode(t("sending")));
    respContent.append(sending);
    return;
  }
  if (last.error) {
    const box = document.createElement("div");
    box.className = "callout";
    box.textContent = translateError(last.error);
    respContent.append(box);
    return;
  }
  if (last.redirected && last.finalUrl) {
    const note = document.createElement("div");
    note.className = "redirect";
    note.append(t("redirected"));
    const target = document.createElement("b");
    target.textContent = last.finalUrl;
    note.append(target);
    respContent.append(note);
  }
  if (last.truncated) {
    const banner = document.createElement("div");
    banner.className = "banner";
    banner.textContent = t("truncated");
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
    note.textContent = last.bodyBase64 ? t("imageResponse") : tf("binaryResponse", { size: formatSize(last.size) });
    respContent.append(note);
    if (last.bodyBase64 && /^image\/[a-z0-9.+-]+$/.test((last.contentType || "").split(";")[0].trim().toLowerCase())) {
      const img = document.createElement("img");
      img.className = "preview";
      img.alt = t("responseImage");
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
  const sheetId = activeId;
  const flight = new AbortController();
  inflight.set(sheetId, flight);
  setSending(true);
  last = { sending: true };
  renderResponse();
  let outcome;
  let nextView = null;
  try {
    const response = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: flight.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      outcome = { error: data.error || "Request failed" };
    } else {
      const pretty = data.binary ? null : tryPretty(data.body || "", data.contentType);
      outcome = { ...data, pretty };
      nextView = pretty == null ? "raw" : "pretty";
    }
  } catch (error) {
    outcome = { error: error.name === "AbortError" ? "Request canceled" : "Could not reach the local app" };
  } finally {
    inflight.delete(sheetId);
  }
  const sheet = sheets.find((item) => item.id === sheetId);
  if (!sheet) return;
  sheet.last = outcome;
  if (nextView) sheet.respView = nextView;
  if (sheetId === activeId) {
    last = outcome;
    if (nextView) {
      respView = nextView;
      for (const button of viewToggle.querySelectorAll("[data-view]")) {
        button.classList.toggle("active", button.dataset.view === respView);
      }
    }
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

let sheets = [];
let activeId = 0;
let sheetSeq = 0;

function cloneRows(rows, fresh) {
  return rows.map((row) => ({ ...row, id: fresh ? uid() : row.id }));
}

function replaceRows(target, rows) {
  target.splice(0, target.length, ...cloneRows(rows, false));
}

function blankSheet() {
  sheetSeq += 1;
  return {
    id: uid(),
    n: sheetSeq,
    method: "GET",
    url: "",
    ssl: true,
    bodyMode: "none",
    rawType: "json",
    raw: "",
    section: "params",
    respTab: "body",
    respView: "pretty",
    last: null,
    params: [],
    headers: [],
    formFields: [],
    urlencodedFields: [],
  };
}

function sheetLabel(sheet) {
  const raw = (sheet.id === activeId ? urlInput.value : sheet.url).trim();
  if (!raw) return tf("requestN", { n: sheet.n });
  const text = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  return text.length > 22 ? `${text.slice(0, 21)}…` : text;
}

function snapshot() {
  const sheet = sheets.find((item) => item.id === activeId);
  if (!sheet) return;
  sheet.method = method;
  sheet.url = urlInput.value;
  sheet.ssl = sslInput.checked;
  sheet.bodyMode = bodyMode;
  sheet.rawType = rawType.value;
  sheet.raw = rawBody.value;
  sheet.section = document.querySelector(".tab.active")?.dataset.tab || "params";
  sheet.respTab = respTab;
  sheet.respView = respView;
  sheet.last = last;
  sheet.params = cloneRows(params, false);
  sheet.headers = cloneRows(headers, false);
  sheet.formFields = cloneRows(formFields, false);
  sheet.urlencodedFields = cloneRows(urlencodedFields, false);
}

function loadSheet(sheet) {
  activeId = sheet.id;
  setMethod(sheet.method);
  writingURL = true;
  urlInput.value = sheet.url;
  writingURL = false;
  sslInput.checked = sheet.ssl;
  replaceRows(params, sheet.params);
  replaceRows(headers, sheet.headers);
  replaceRows(formFields, sheet.formFields);
  replaceRows(urlencodedFields, sheet.urlencodedFields);
  paramsTable.paint();
  headersTable.paint();
  formTable.paint();
  urlencodedTable.paint();
  rawType.value = sheet.rawType || "json";
  rawBody.value = sheet.raw || "";
  jsonHint.hidden = true;
  const radio = document.querySelector(`input[name="bodyMode"][value="${sheet.bodyMode}"]`);
  if (radio) radio.checked = true;
  showBodyMode(sheet.bodyMode || "none");
  showTab(sheet.section || "params");
  respView = sheet.respView || "pretty";
  for (const button of viewToggle.querySelectorAll("[data-view]")) {
    button.classList.toggle("active", button.dataset.view === respView);
  }
  last = sheet.last;
  showRespTab(sheet.respTab || "body");
  setSending(inflight.has(sheet.id));
  renderReqTabs();
}

function renderReqTabs() {
  const list = document.getElementById("reqTabList");
  list.replaceChildren();
  for (const sheet of sheets) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "req-tab" + (sheet.id === activeId ? " active" : "");
    tab.dataset.id = String(sheet.id);
    const name = document.createElement("span");
    name.className = "req-name";
    name.textContent = sheetLabel(sheet);
    const close = document.createElement("span");
    close.className = "req-x";
    close.textContent = "×";
    close.setAttribute("aria-label", t("closeRequest"));
    tab.append(name, close);
    tab.addEventListener("click", (event) => {
      if (event.target.closest(".req-x")) {
        closeSheet(sheet.id);
        return;
      }
      if (sheet.id === activeId) return;
      snapshot();
      loadSheet(sheet);
    });
    list.append(tab);
  }
  const active = list.querySelector(".req-tab.active");
  if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function openSheet(sheet) {
  snapshot();
  sheets.push(sheet);
  loadSheet(sheet);
}

function closeSheet(id) {
  const flight = inflight.get(id);
  if (flight) flight.abort();
  if (sheets.length === 1) {
    const fresh = blankSheet();
    sheets = [fresh];
    loadSheet(fresh);
    return;
  }
  const index = sheets.findIndex((item) => item.id === id);
  const closingActive = id === activeId;
  sheets.splice(index, 1);
  if (closingActive) loadSheet(sheets[Math.max(0, index - 1)]);
  else renderReqTabs();
}

document.getElementById("reqAdd").addEventListener("click", () => openSheet(blankSheet()));
document.getElementById("reqDup").addEventListener("click", () => {
  snapshot();
  const current = sheets.find((item) => item.id === activeId);
  openSheet({
    ...blankSheet(),
    method: current.method,
    url: current.url,
    ssl: current.ssl,
    bodyMode: current.bodyMode,
    rawType: current.rawType,
    raw: current.raw,
    section: current.section,
    respTab: "body",
    respView: "pretty",
    last: null,
    params: cloneRows(current.params, true),
    headers: cloneRows(current.headers, true),
    formFields: cloneRows(current.formFields, true),
    urlencodedFields: cloneRows(current.urlencodedFields, true),
  });
});

function setLang(next) {
  lang = next === "en" ? "en" : "zh";
  try {
    localStorage.setItem("request-lang", lang);
  } catch {
    /* ignore private mode */
  }
  applyI18n();
  paramsTable.paint();
  headersTable.paint();
  formTable.paint();
  urlencodedTable.paint();
  updateCounts();
  setSending(inflight.has(activeId));
  renderReqTabs();
  renderResponse();
}

document.querySelector(".lang-switch").addEventListener("click", (event) => {
  const button = event.target.closest("[data-lang]");
  if (!button || button.dataset.lang === lang) return;
  setLang(button.dataset.lang);
});

setLang(lang);
sheets = [blankSheet()];
activeId = sheets[0].id;
renderReqTabs();
