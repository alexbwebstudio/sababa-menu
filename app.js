"use strict";

/* ======================================================================
   Контент по умолчанию — показывается, пока в админке ничего не сохранили
   ====================================================================== */
const DEFAULT_CONTENT = {
  brand: "סבבה",
  restaurantName: "מסעדת סבבה",
  tag: "תפריט יומי טרי",
  day: "יום ה׳",
  date: "28.09.2026",
  tagline: "מטבח ים תיכוני ביתי • טרי בכל יום",
  note: "כל המנות כשרות למהדרין.",
  heroImage: "",
  sections: [
    {
      title: "ראשונות",
      items: [
        { name: "חומוס הבית", desc: "חומוס חם, טחינה גולמית, שמן זית ופיתה טרייה", price: "₪38", image: "", vegan: true, spicy: false, gf: false },
        { name: "סלט ירקות קצוץ", desc: "עגבנייה, מלפפון, בצל סגול, פטרוזיליה ולימון", price: "₪32", image: "", vegan: true, spicy: false, gf: true },
        { name: "מטבוחה חריפה", desc: "עגבניות ופלפלים מבושלים לאט עם שום וצ׳ילי", price: "₪28", image: "", vegan: true, spicy: true, gf: true },
      ],
    },
    {
      title: "עיקריות",
      items: [
        { name: "שניצל עוף", desc: "פריך וזהוב, מוגש עם פירה ביתי וסלט", price: "₪68", image: "", vegan: false, spicy: false, gf: false },
        { name: "קציצות דג ברוטב עגבניות", desc: "דג לבן, כוסברה ופלפל חריף, אורז לבן", price: "₪74", image: "", vegan: false, spicy: true, gf: true },
        { name: "מג׳דרה עם בצל מטוגן", desc: "עדשים, אורז ובצל מקורמל, יוגורט צמחי", price: "₪54", image: "", vegan: true, spicy: false, gf: true },
      ],
    },
    {
      title: "קינוחים",
      items: [
        { name: "מלבי", desc: "מי ורדים, סירופ פטל ובוטנים קלויים", price: "₪26", image: "", vegan: false, spicy: false, gf: true },
      ],
    },
  ],
};

const CACHE_KEY = "sababa:content";
const TOKEN_KEY = "sababa:token";

const $ = (sel, root = document) => root.querySelector(sel);
const clone = (o) => JSON.parse(JSON.stringify(o));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

let content = clone(DEFAULT_CONTENT);
let savedSnapshot = "";
let token = store.get(TOKEN_KEY) || "";

/* Нормализация — защищает страницу от неполных данных */
function normalize(c) {
  const d = DEFAULT_CONTENT;
  const out = {};
  for (const k of ["brand", "restaurantName", "tag", "day", "date", "tagline", "note", "heroImage"]) {
    out[k] = typeof c?.[k] === "string" ? c[k] : d[k];
  }
  out.sections = Array.isArray(c?.sections)
    ? c.sections.map((s) => ({
        title: String(s?.title ?? ""),
        items: Array.isArray(s?.items)
          ? s.items.map((it) => ({
              name: String(it?.name ?? ""),
              desc: String(it?.desc ?? ""),
              price: String(it?.price ?? ""),
              image: typeof it?.image === "string" ? it.image : "",
              vegan: !!it?.vegan, spicy: !!it?.spicy, gf: !!it?.gf,
            }))
          : [],
      }))
    : clone(d.sections);
  if (c?.updatedAt) out.updatedAt = c.updatedAt;
  return out;
}

const safeImg = (url) => (/^\/api\/image\/[\w.-]+$/.test(url) || /^https:\/\//.test(url) || /^blob:/.test(url) ? url : "");

/* ======================================================================
   Рендер страницы (структура фиксирована, меняются только тексты и картинки)
   ====================================================================== */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function render() {
  document.querySelectorAll("[data-bind]").forEach((n) => {
    n.textContent = content[n.dataset.bind] ?? "";
  });
  document.title = `${content.brand} – תפריט יומי`;

  // заголовок: последнее слово названия — курсивом и золотом
  const title = $("#heroTitle");
  title.textContent = "";
  const words = content.restaurantName.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  title.append(document.createTextNode(words.join(" ") + (last ? " " : "")));
  if (last) title.append(el("em", null, last));

  const hero = $("#heroImg");
  const heroSrc = safeImg(content.heroImage);
  hero.hidden = !heroSrc;
  if (heroSrc && hero.getAttribute("src") !== heroSrc) hero.src = heroSrc;
  if (!heroSrc) hero.removeAttribute("src");

  const menu = $("#menu");
  menu.textContent = "";
  const sections = content.sections.filter((s) => s.items.length || s.title);
  if (!sections.length) menu.append(el("p", "empty", "התפריט יתעדכן בקרוב"));

  for (const s of sections) {
    const sec = el("section", "section");
    if (s.title) sec.append(el("h2", "section-title", s.title));
    const list = el("div", "items");
    for (const it of s.items) {
      const card = el("article", "item");
      const src = safeImg(it.image);
      if (src) {
        const img = el("img", "item-img");
        img.src = src; img.alt = it.name; img.loading = "lazy";
        card.append(img);
      } else card.classList.add("no-img");

      const body = el("div", "item-body");
      const head = el("div", "item-head");
      head.append(el("h3", "item-name", it.name));
      if (it.price) head.append(el("span", "item-price", it.price));
      body.append(head);
      if (it.desc) body.append(el("p", "item-desc", it.desc));
      if (it.vegan || it.spicy || it.gf) {
        const b = el("div", "badges");
        if (it.vegan) b.append(el("span", "badge vegan", "ⓥ טבעוני"));
        if (it.spicy) b.append(el("span", "badge spicy", "🌶 חריף"));
        if (it.gf) b.append(el("span", "badge gf", "GF"));
        body.append(b);
      }
      card.append(body);
      list.append(card);
    }
    sec.append(list);
    menu.append(sec);
  }

  const upd = $("#updatedAt");
  upd.textContent = content.updatedAt
    ? "עודכן: " + new Date(content.updatedAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
    : "";
}

/* ======================================================================
   Загрузка контента
   ====================================================================== */
async function loadContent() {
  const cached = store.get(CACHE_KEY);
  if (cached) {
    try { content = normalize(JSON.parse(cached)); render(); } catch {}
  }
  try {
    const r = await fetch("/api/content", { cache: "no-store" });
    if (r.ok) {
      const data = await r.json();
      content = normalize(data || DEFAULT_CONTENT);
      if (data) store.set(CACHE_KEY, JSON.stringify(data));
    }
  } catch { /* офлайн — остаётся кэш */ }
  savedSnapshot = JSON.stringify(content);
  render();
}

/* ======================================================================
   UI-утилиты
   ====================================================================== */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

function setDirty() {
  const dirty = JSON.stringify(content) !== savedSnapshot;
  const s = $("#saveStatus");
  s.textContent = dirty ? "יש שינויים שלא נשמרו" : "";
  s.classList.toggle("dirty", dirty);
}

/* Сжатие картинки перед загрузкой (макс. 1600px, JPEG) */
async function compressImage(file, maxSide = 1600) {
  if (file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
}

async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (r.status === 401 && path !== "/api/login") {
    token = ""; store.del(TOKEN_KEY);
    throw new Error("auth");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

async function uploadImage(file) {
  const blob = await compressImage(file);
  const { url } = await api("/api/upload", {
    method: "POST",
    headers: { "content-type": blob.type || "image/jpeg" },
    body: blob,
  });
  return url;
}

/* ======================================================================
   Вход
   ====================================================================== */
function askLogin() {
  return new Promise((resolve) => {
    const dlg = $("#loginDialog");
    const form = $("#loginForm");
    const err = $("#loginError");
    const pass = $("#loginPassword");
    err.hidden = true; pass.value = "";
    const cleanup = (ok) => {
      form.onsubmit = null; $("#loginCancel").onclick = null; dlg.onclose = null;
      if (dlg.open) dlg.close();
      resolve(ok);
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = $("#loginSubmit");
      btn.disabled = true; err.hidden = true;
      try {
        const { token: t } = await api("/api/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: pass.value }),
        });
        token = t; store.set(TOKEN_KEY, t);
        cleanup(true);
      } catch (ex) {
        err.textContent = ex.message === "Failed to fetch" ? "אין חיבור לשרת" : ex.message;
        err.hidden = false;
      } finally { btn.disabled = false; }
    };
    $("#loginCancel").onclick = () => cleanup(false);
    dlg.onclose = () => cleanup(false);
    dlg.showModal();
    pass.focus();
  });
}

/* ======================================================================
   Панель редактирования
   ====================================================================== */
function field(label, value, onInput, { multiline = false, placeholder = "" } = {}) {
  const l = el("label", null, label);
  const inp = multiline ? el("textarea") : el("input");
  if (!multiline) inp.type = "text";
  inp.value = value; inp.placeholder = placeholder;
  inp.addEventListener("input", () => { onInput(inp.value); render(); setDirty(); });
  l.append(inp);
  return l;
}

function imageField(label, getUrl, setUrl) {
  const wrap = el("div");
  wrap.append(el("label", null, label));
  const row = el("div", "img-field");
  const thumb = el("div", "img-thumb");
  const paint = () => {
    const u = safeImg(getUrl());
    thumb.style.backgroundImage = u ? `url("${u}")` : "";
    thumb.textContent = u ? "" : "🖼";
    del.hidden = !u;
  };
  const pick = el("span", "btn btn-ghost btn-sm file-btn", "העלאת תמונה");
  const file = el("input"); file.type = "file"; file.accept = "image/*";
  pick.append(file);
  const del = el("button", "btn btn-danger btn-sm", "הסרה"); del.type = "button";

  file.addEventListener("change", async () => {
    const f = file.files[0];
    if (!f) return;
    pick.firstChild.textContent = "מעלה…";
    try {
      const url = await uploadImage(f);
      setUrl(url); paint(); render(); setDirty();
      toast("התמונה הועלתה — לא לשכוח לשמור");
    } catch (e) {
      if (e.message === "auth") { toast("נדרשת התחברות מחדש"); await ensureLogin(); }
      else toast("שגיאה בהעלאה: " + e.message);
    } finally {
      pick.firstChild.textContent = "העלאת תמונה"; file.value = "";
    }
  });
  del.addEventListener("click", () => { setUrl(""); paint(); render(); setDirty(); });

  row.append(thumb, pick, del);
  wrap.append(row);
  paint();
  return wrap;
}

function iconBtn(text, title, onClick) {
  const b = el("button", "icon-btn", text);
  b.type = "button"; b.title = title; b.setAttribute("aria-label", title);
  b.addEventListener("click", onClick);
  return b;
}

function buildAdmin() {
  const body = $("#adminBody");
  const keepScroll = body.scrollTop;
  body.textContent = "";
  const rebuild = () => { buildAdmin(); render(); setDirty(); };

  // --- Детали дня
  const day = el("div", "panel");
  day.append(el("h3", null, "📅 פרטי יום"));
  day.append(field("שם מסעדה", content.restaurantName, (v) => (content.restaurantName = v)));
  day.append(field("שם קצר (בכותרת העליונה)", content.brand, (v) => (content.brand = v)));
  day.append(field("תגית", content.tag, (v) => (content.tag = v)));
  const g = el("div", "grid2");
  g.append(field("יום", content.day, (v) => (content.day = v)));
  g.append(field("תאריך", content.date, (v) => (content.date = v)));
  day.append(g);
  day.append(field("שורת תיאור", content.tagline, (v) => (content.tagline = v)));
  day.append(field("הערה (כשרות, אלרגנים)", content.note, (v) => (content.note = v), { multiline: true }));
  day.append(imageField("תמונה ראשית", () => content.heroImage, (u) => (content.heroImage = u)));
  body.append(day);

  // --- Разделы и блюда
  const menuPanel = el("div", "panel");
  menuPanel.append(el("h3", null, "🍽 מנות"));

  content.sections.forEach((sec, si) => {
    const box = el("div", "ed-section");
    const head = el("div", "ed-section-head");
    head.append(field("שם קטגוריה", sec.title, (v) => (sec.title = v)));
    const tools = el("div", "ed-tools");
    tools.append(
      iconBtn("▲", "הזז למעלה", () => { if (si > 0) { [content.sections[si - 1], content.sections[si]] = [content.sections[si], content.sections[si - 1]]; rebuild(); } }),
      iconBtn("▼", "הזז למטה", () => { if (si < content.sections.length - 1) { [content.sections[si + 1], content.sections[si]] = [content.sections[si], content.sections[si + 1]]; rebuild(); } }),
      iconBtn("🗑", "מחק קטגוריה", () => { if (confirm(`למחוק את הקטגוריה "${sec.title}" וכל המנות בה?`)) { content.sections.splice(si, 1); rebuild(); } }),
    );
    head.append(tools);
    box.append(head);

    sec.items.forEach((it, ii) => {
      const card = el("div", "ed-item");
      const bar = el("div", "ed-item-bar");
      const label = el("b", null, it.name || "מנה חדשה");
      bar.append(label);
      const t = el("div", "ed-tools");
      t.append(
        iconBtn("▲", "הזז למעלה", () => { if (ii > 0) { [sec.items[ii - 1], sec.items[ii]] = [sec.items[ii], sec.items[ii - 1]]; rebuild(); } }),
        iconBtn("▼", "הזז למטה", () => { if (ii < sec.items.length - 1) { [sec.items[ii + 1], sec.items[ii]] = [sec.items[ii], sec.items[ii + 1]]; rebuild(); } }),
        iconBtn("🗑", "מחק מנה", () => { if (confirm(`למחוק את "${it.name}"?`)) { sec.items.splice(ii, 1); rebuild(); } }),
      );
      bar.append(t);
      card.append(bar);

      const g2 = el("div", "grid2");
      g2.append(field("שם המנה", it.name, (v) => { it.name = v; label.textContent = v || "מנה חדשה"; }));
      g2.append(field("מחיר", it.price, (v) => (it.price = v), { placeholder: "₪0" }));
      card.append(g2);
      card.append(field("תיאור", it.desc, (v) => (it.desc = v), { multiline: true }));

      const checks = el("div", "checks");
      for (const [key, txt] of [["vegan", "ⓥ טבעוני"], ["spicy", "🌶 חריף"], ["gf", "GF ללא גלוטן"]]) {
        const l = el("label");
        const c = el("input"); c.type = "checkbox"; c.checked = !!it[key];
        c.addEventListener("change", () => { it[key] = c.checked; render(); setDirty(); });
        l.append(c, document.createTextNode(txt));
        checks.append(l);
      }
      card.append(checks);
      card.append(imageField("תמונת מנה", () => it.image, (u) => (it.image = u)));
      box.append(card);
    });

    const add = el("button", "btn btn-ghost btn-sm", "＋ הוספת מנה");
    add.type = "button";
    add.addEventListener("click", () => {
      sec.items.push({ name: "", desc: "", price: "", image: "", vegan: false, spicy: false, gf: false });
      rebuild();
    });
    box.append(add);
    menuPanel.append(box);
  });

  const addSec = el("button", "btn btn-ghost", "＋ הוספת קטגוריה");
  addSec.type = "button";
  addSec.addEventListener("click", () => { content.sections.push({ title: "קטגוריה חדשה", items: [] }); rebuild(); });
  menuPanel.append(addSec);
  body.append(menuPanel);
  body.scrollTop = keepScroll;
}

async function ensureLogin() {
  if (token) return true;
  return await askLogin();
}

async function openAdmin() {
  if (!(await ensureLogin())) return;
  buildAdmin();
  setDirty();
  $("#admin").hidden = false;
  document.body.classList.add("admin-open");
}

function closeAdmin() {
  if (JSON.stringify(content) !== savedSnapshot && !confirm("יש שינויים שלא נשמרו. לסגור בלי לשמור?")) return false;
  content = normalize(JSON.parse(savedSnapshot));
  render();
  $("#admin").hidden = true;
  document.body.classList.remove("admin-open");
  return true;
}

async function save() {
  const btn = $("#saveBtn");
  btn.disabled = true;
  try {
    const res = await api("/api/content", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(content),
    });
    content.updatedAt = res.updatedAt;
    savedSnapshot = JSON.stringify(content);
    store.set(CACHE_KEY, savedSnapshot);
    render(); setDirty();
    toast("✓ נשמר");
  } catch (e) {
    if (e.message === "auth") {
      toast("פג תוקף ההתחברות");
      if (await askLogin()) return save();
    } else toast("שגיאה בשמירה: " + (e.message === "Failed to fetch" ? "אין חיבור" : e.message));
  } finally { btn.disabled = false; }
}

/* ======================================================================
   PWA: офлайн-баннер, установка, service worker
   ====================================================================== */
function setupPWA() {
  const off = $("#offlineBanner");
  const upd = () => (off.hidden = navigator.onLine);
  addEventListener("online", upd); addEventListener("offline", upd); upd();

  let deferred;
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferred = e;
    if (store.get("sababa:installDismissed")) return;
    $("#installBanner").hidden = false;
  });
  $("#installBtn").addEventListener("click", async () => {
    $("#installBanner").hidden = true;
    if (deferred) { deferred.prompt(); deferred = null; }
  });
  $("#installClose").addEventListener("click", () => {
    $("#installBanner").hidden = true; store.set("sababa:installDismissed", "1");
  });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

/* ====================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  render();
  setupPWA();
  $("#adminBtn").addEventListener("click", openAdmin);
  $("#adminClose").addEventListener("click", closeAdmin);
  $("#saveBtn").addEventListener("click", save);
  $("#logoutBtn").addEventListener("click", () => {
    if (closeAdmin()) { token = ""; store.del(TOKEN_KEY); }
  });
  addEventListener("beforeunload", (e) => {
    if (!$("#admin").hidden && JSON.stringify(content) !== savedSnapshot) e.preventDefault();
  });
  await loadContent();
  setTimeout(() => $("#splash").classList.add("done"), 250);
});
