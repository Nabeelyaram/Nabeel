(() => {
  "use strict";

  const config = window.MAQSOOD_CONFIG || {};
  const SESSION_KEY = "maqsood-karyana-session";
  const PROFILE_KEY = "maqsood-karyana-profile";
  const OFFLINE_QUEUE_KEY = "maqsood-karyana-offline-drafts";
  const readStored = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const state = {
    token: localStorage.getItem(SESSION_KEY) || "",
    profile: String(localStorage.getItem(PROFILE_KEY) || "").trim(),
    offlineDrafts: readStored(OFFLINE_QUEUE_KEY, []),
    items: [],
    entries: [],
    ledger: [],
    deferredPrompt: null,
    syncing: false
  };
  const BASIC_ITEMS = [
    "Aata", "Chawal", "Cheeni", "Daal Chana", "Daal Masoor", "Daal Moong",
    "Daal Mash", "Daal Arhar", "Besan", "Suji", "Maida", "Namak",
    "Laal Mirch", "Kali Mirch", "Haldi", "Dhania Powder", "Zeera",
    "Garam Masala", "Biryani Masala", "Qorma Masala", "Chaat Masala",
    "Cooking Oil", "Ghee", "Chai Patti", "Doodh", "Dahi", "Anday",
    "Bread", "Biscuit", "Rusk", "Noodles", "Jam", "Ketchup", "Achar",
    "Cold Drink", "Juice", "Mineral Water", "Rooh Afza", "Lays", "Nimko",
    "Soap", "Shampoo", "Toothpaste", "Toothbrush", "Washing Powder",
    "Dishwash", "Floor Cleaner", "Toilet Cleaner", "Bleach", "Phenyl",
    "Tissue Paper", "Toilet Roll", "Garbage Bags", "Match Box",
    "Mosquito Coil", "Neel", "Pyaaz", "Aloo", "Tamatar", "Lehsan",
    "Adrak", "Hari Mirch", "Lemon", "Sabzi", "Chicken", "Beef",
    "Mutton", "Fish"
  ];
  const CHART_COLORS = ["#176b45", "#d38b26", "#3a7ca5", "#8e5ea2", "#cf5c5c"];
  const $ = (id) => document.getElementById(id);
  const configured = /^https:\/\//.test(config.supabaseUrl || "") && !String(config.supabaseAnonKey || "").startsWith("YOUR_");
  const money = (value) => `Rs ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const clientRef = () => crypto.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  async function api(path, options = {}) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(state.token ? { "X-Store-Session": state.token } : {}),
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `Request failed (${response.status})`);
    return text ? JSON.parse(text) : null;
  }

  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => $("toast").classList.remove("show"), 2600);
  }

  function showApp() {
    $("loginScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    $("headerDate").textContent = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(new Date());
    updateProfileUi();
    renderOfflineDrafts();
  }

  function showLogin() {
    $("appScreen").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
  }

  async function login(event) {
    event.preventDefault();
    if (!configured) return $("setupMessage").classList.remove("hidden");
    try {
      const result = await api("rpc/store_login", { method: "POST", body: JSON.stringify({ input_password: $("loginPassword").value }) });
      if (!result?.authenticated) return toast("Wrong password");
      state.token = result.session_token;
      localStorage.setItem(SESSION_KEY, state.token);
      $("loginPassword").value = "";
      showApp();
      ensureProfile();
      await refreshAll();
      await syncOfflineDrafts();
    } catch (error) {
      console.error(error);
      toast("Login failed. Supabase SQL aur config check karein.");
    }
  }

  async function restoreSession() {
    if (!configured || !state.token) return showLogin();
    if (!navigator.onLine) {
      showApp();
      ensureProfile();
      toast("Offline mode: nayi entries draft mein save hongi");
      return;
    }
    try {
      const result = await api("rpc/store_restore_session", { method: "POST", body: "{}" });
      if (!result?.authenticated) throw new Error("Expired");
      showApp();
      ensureProfile();
      await refreshAll();
      await syncOfflineDrafts();
    } catch {
      state.token = "";
      localStorage.removeItem(SESSION_KEY);
      showLogin();
    }
  }

  function updateProfileUi() {
    const name = state.profile || "Profile";
    $("profileName").textContent = name;
    $("profileInitial").textContent = name.charAt(0).toUpperCase() || "?";
    $("profileModalInitial").textContent = name.charAt(0).toUpperCase() || "?";
  }

  function ensureProfile(force = false) {
    $("deviceProfileName").value = state.profile;
    $("cancelProfileBtn").classList.toggle("hidden", !state.profile);
    $("profileModal").classList.toggle("hidden", Boolean(state.profile) && !force);
    updateProfileUi();
  }

  function saveProfile(event) {
    event.preventDefault();
    const name = $("deviceProfileName").value.trim();
    if (!name) return;
    state.profile = name;
    localStorage.setItem(PROFILE_KEY, name);
    $("profileModal").classList.add("hidden");
    updateProfileUi();
    renderDashboard();
    toast("Profile save ho gayi");
  }

  async function logout() {
    try { if (state.token) await api("rpc/store_logout", { method: "POST", body: "{}" }); } catch {}
    state.token = "";
    localStorage.removeItem(SESSION_KEY);
    showLogin();
  }

  function showView(name) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("hidden", view.id !== `${name}View`));
    document.querySelectorAll(".nav-button[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "history") renderHistory();
    if (name === "analytics") renderAnalytics();
    if (name === "items") renderItems();
  }

  async function loadItems() {
    state.items = await api("store_items?select=*&order=name.asc") || [];
    const options = [...new Set(
      [...BASIC_ITEMS, ...state.items.map((item) => item.name)]
        .map(normalizedItemName)
        .filter(Boolean)
    )]
      .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    $("itemOptions").innerHTML = options.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  }

  async function loadEntries() {
    state.entries = await api("store_entries?select=*&order=purchase_date.desc,created_at.desc") || [];
  }

  async function loadLedger() {
    state.ledger = await api("store_ledger?select=*&order=entry_date.desc,created_at.desc") || [];
  }

  async function refreshAll() {
    await Promise.all([loadItems(), loadEntries(), loadLedger()]);
    renderDashboard();
    renderHistory();
    renderAnalytics();
    renderItems();
    renderQuickItems();
  }

  function entryStatus(row) {
    const total = Number(row.total_amount || 0);
    const paid = Number(row.paid_amount || 0);
    if (paid <= 0 && total > 0) return "Unpaid";
    if (paid >= total) return "Paid";
    return "Partial";
  }

  function totals(rows) {
    return rows.reduce((acc, row) => {
      acc.total += Number(row.total_amount || 0);
      acc.paid += Number(row.paid_amount || 0);
      acc.remaining += Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0));
      return acc;
    }, { total: 0, paid: 0, remaining: 0 });
  }

  function grouped(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const key = normalizedItemName(row.item_name);
      const item = map.get(key) || { name: key, count: 0, spend: 0 };
      item.count += 1;
      item.spend += Number(row.total_amount || 0);
      map.set(key, item);
    });
    return [...map.values()];
  }

  function normalizedItemName(value) {
    const original = String(value || "").trim();
    const key = original.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
    const aliases = [
      [/^(1 kilo ghee|adha kilo desi ghee|ghee(?: \d+ kilo)?)$/, "Ghee"],
      [/^(patti|chai patti|patti \d+ kilo)$/, "Chai Patti"],
      [/^chawal(?: \d+ kilo)?$/, "Chawal"],
      [/^(bottle|bottle \d+ lit(?:er|re)|bottle sprite|bottle dew|bottle juice wali)$/, "Cold Drink"],
      [/^(saban|soap)$/, "Soap"],
      [/^(saban bartan wala|dishwash)$/, "Dishwash"],
      [/^(surf|surf packet|washing powder)$/, "Washing Powder"],
      [/^(aalo|aloo)$/, "Aloo"],
      [/^(payaaz|pyaaz|piyaz)$/, "Pyaaz"],
      [/^(tamater|tamatar)$/, "Tamatar"],
      [/^(nembo|lemon)$/, "Lemon"],
      [/^(nemko|nimko)$/, "Nimko"],
      [/^(basin|besan|basin adh kilo)$/, "Besan"],
      [/^(cheeni|sugar)(?: \d+ kilo)?$/, "Cheeni"],
      [/^(anda|anda \d+|anday(?: \d+)?)$/, "Anday"],
      [/^(tel|oil|cooking oil)$/, "Cooking Oil"],
      [/^sabzi(?: \d+ kilo)?$/, "Sabzi"],
      [/^(dahi|adha kilo dahi)$/, "Dahi"],
      [/^(chana masala|chaina masala)$/, "Chana Masala"],
      [/^(sawinya|seviyan)$/, "Seviyan"]
    ];
    const match = aliases.find(([pattern]) => pattern.test(key));
    return match ? match[1] : original;
  }

  function renderDashboard() {
    const todayRows = state.entries.filter((row) => row.purchase_date === today());
    const todayTotals = totals(todayRows);
    $("todayTotal").textContent = money(todayTotals.total);
    $("todayCount").textContent = todayRows.length;
    $("headerTodayTotal").textContent = money(todayTotals.total);
    $("headerTodayCount").textContent = `${todayRows.length} items`;
    $("todayEnteredBy").textContent = [...new Set(todayRows.map((row) => row.entered_by).filter(Boolean))].join(", ") || "-";
    $("offlineDraftCount").textContent = state.offlineDrafts.length;
    const groups = grouped(state.entries);
    const frequent = [...groups].sort((a, b) => b.count - a.count)[0];
    const spending = [...groups].sort((a, b) => b.spend - a.spend)[0];
    $("topFrequent").textContent = frequent ? `${frequent.name} (${frequent.count} times)` : "-";
    $("topSpending").textContent = spending ? `${spending.name} - ${money(spending.spend)}` : "-";
    const allTotals = totals(state.entries);
    $("allRemaining").textContent = money(allTotals.remaining);
    renderLedger(allTotals);
    renderVisualDashboard();
    $("recentList").innerHTML = state.entries.slice(0, 6).map((row) => `
      <div class="record-row"><div><strong>${escapeHtml(row.item_name)}</strong><span>${escapeHtml(row.purchase_date)} · ${escapeHtml(row.entered_by || "Purana record")}</span></div><strong>${money(row.total_amount)}</strong></div>
    `).join("") || `<p class="empty">Abhi koi record nahi.</p>`;
    renderOfflineDrafts();
  }

  function dateOffset(days) {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(value);
  }

  function renderVisualDashboard() {
    const last30 = state.entries.filter((row) => row.purchase_date >= dateOffset(-29) && row.purchase_date <= today());
    const previous30 = state.entries.filter((row) => row.purchase_date >= dateOffset(-59) && row.purchase_date < dateOffset(-29));
    const daily = Array.from({ length: 30 }, (_, index) => { const date = dateOffset(index - 29); return { date, value: totals(last30.filter((row) => row.purchase_date === date)).total }; });
    const maximum = Math.max(...daily.map((point) => point.value), 1);
    const width = 720, height = 210;
    const points = daily.map((point, index) => `${(index / 29) * width},${height - (point.value / maximum) * (height - 28) - 8}`).join(" ");
    $("spendingTrendChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily spending line chart"><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#176b45" stop-opacity=".28"/><stop offset="1" stop-color="#176b45" stop-opacity=".02"/></linearGradient></defs><line x1="0" y1="${height - 1}" x2="${width}" y2="${height - 1}" class="chart-axis"/><polygon points="0,${height} ${points} ${width},${height}" fill="url(#trendFill)"/><polyline points="${points}" class="trend-line"/></svg><div class="chart-labels"><span>${daily[0].date.slice(5)}</span><span>Aaj</span></div>`;
    const currentTotal = totals(last30).total, previousTotal = totals(previous30).total;
    const change = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
    $("trendTotal").textContent = money(currentTotal);
    $("trendComparison").innerHTML = change === null ? `<span class="neutral">30-day comparison ke liye mazeed data chahiye</span>` : `<span class="${change <= 0 ? "positive" : "negative"}">${change >= 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}%</span> pichlay 30 din ke muqablay mein`;
    const top = grouped(last30).sort((a, b) => b.spend - a.spend).slice(0, 5);
    const topTotal = top.reduce((sum, item) => sum + item.spend, 0) || 1;
    let cursor = 0;
    const stops = top.map((item, index) => { const start = cursor; cursor += item.spend / topTotal * 100; return `${CHART_COLORS[index]} ${start}% ${cursor}%`; }).join(", ");
    $("dashboardTopItems").innerHTML = top.length ? `<div class="donut" style="background:conic-gradient(${stops})"><span>${top.length}<small>items</small></span></div><div class="donut-legend">${top.map((item, index) => `<div><i style="background:${CHART_COLORS[index]}"></i><span>${escapeHtml(item.name)}</span><strong>${money(item.spend)}</strong></div>`).join("")}</div>` : `<p class="empty">Graph ke liye data available nahi.</p>`;
    const all = totals(state.entries), paid = all.paid, remaining = Math.max(0, all.total - paid);
    const paidPercent = all.total ? Math.min(100, paid / all.total * 100) : 0;
    $("accountHealthChart").innerHTML = `<div class="health-number"><strong>${paidPercent.toFixed(0)}%</strong><span>purchases paid</span></div><div class="health-track"><i style="width:${paidPercent}%"></i></div><div class="health-values"><span><i class="paid-dot"></i>Paid <strong>${money(paid)}</strong></span><span><i class="due-dot"></i>Baqaya <strong>${money(remaining)}</strong></span></div>`;
  }

  function persistOfflineDrafts() {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(state.offlineDrafts));
    renderOfflineDrafts();
  }

  function renderOfflineDrafts() {
    if (!$("offlineDraftPanel")) return;
    const count = state.offlineDrafts.length;
    $("offlineDraftPanel").classList.toggle("hidden", count === 0);
    $("offlineBadge").classList.toggle("hidden", navigator.onLine && count === 0);
    $("offlineBadge").textContent = navigator.onLine ? `${count} drafts` : `Offline · ${count} drafts`;
    $("offlineDraftCount").textContent = count;
    $("offlineDraftList").innerHTML = state.offlineDrafts.map((row) => `
      <div class="record-row">
        <div><strong>${escapeHtml(row.item_name)}</strong><span>${escapeHtml(row.purchase_date)} · ${escapeHtml(row.entered_by)}</span></div>
        <div class="draft-end"><strong>${money(row.total_amount)}</strong><button class="row-action danger" data-delete-draft="${row.local_id}">Delete</button></div>
      </div>`).join("");
    $("offlineDraftList").querySelectorAll("[data-delete-draft]").forEach((button) => button.addEventListener("click", () => {
      state.offlineDrafts = state.offlineDrafts.filter((row) => row.local_id !== button.dataset.deleteDraft);
      persistOfflineDrafts();
      renderDashboard();
    }));
  }

  function queueOfflineEntry(row) {
    state.offlineDrafts.push({ ...row, local_id: clientRef() });
    persistOfflineDrafts();
    clearEntry();
    showView("dashboard");
    renderDashboard();
    toast("Internet nahi. Entry offline draft mein save ho gayi.");
  }

  async function syncOfflineDrafts() {
    if (!navigator.onLine || !state.token || state.syncing || !state.offlineDrafts.length) return;
    state.syncing = true;
    const pending = [...state.offlineDrafts];
    for (const row of pending) {
      try {
        const item = await ensureItem(row.item_name);
        const body = { ...row, item_id: item?.id || null };
        delete body.local_id;
        await api("store_entries?on_conflict=client_ref", {
          method: "POST",
          body: JSON.stringify(body),
          prefer: "resolution=merge-duplicates,return=minimal"
        });
        state.offlineDrafts = state.offlineDrafts.filter((draft) => draft.local_id !== row.local_id);
        persistOfflineDrafts();
      } catch (error) {
        console.error("Draft sync failed", error);
        break;
      }
    }
    state.syncing = false;
    if (state.offlineDrafts.length === 0) {
      await refreshAll();
      toast("Offline entries sync ho gayi hain");
    } else {
      renderOfflineDrafts();
      toast("Kuch drafts sync nahi ho sake. Updated SQL check karein.");
    }
  }

  function ledgerTotals() {
    return state.ledger.reduce((acc, row) => {
      const amount = Number(row.amount || 0);
      if (row.entry_type === "opening_balance") acc.opening += amount;
      if (row.entry_type === "payment") acc.payments += amount;
      if (row.entry_type === "adjustment") acc.adjustments += amount;
      return acc;
    }, { opening: 0, payments: 0, adjustments: 0 });
  }

  function renderLedger(allTotals = totals(state.entries)) {
    const ledger = ledgerTotals();
    const oldRows = state.entries.filter((row) => row.source_group === "old_register");
    const newRows = state.entries.filter((row) => row.source_group !== "old_register");
    const oldTotal = totals(oldRows).total;
    const newTotal = totals(newRows).total;
    const purchasesTotal = oldTotal + newTotal;
    const openingTotal = ledger.opening + ledger.adjustments;
    const remaining = ledger.opening + ledger.adjustments + allTotals.total - allTotals.paid - ledger.payments;
    $("openingBalance").textContent = money(openingTotal);
    $("oldRegisterTotal").textContent = money(oldTotal);
    $("newPurchasesTotal").textContent = money(newTotal);
    $("combinedPurchasesTotal").textContent = money(purchasesTotal);
    $("grossAccountTotal").textContent = money(openingTotal + purchasesTotal);
    $("entryPaidTotal").textContent = money(allTotals.paid);
    $("depositTotal").textContent = money(ledger.payments);
    $("accountRemaining").textContent = money(remaining);
    $("allRemaining").textContent = money(remaining);
    $("ledgerHistory").innerHTML = state.ledger.length ? state.ledger.slice(0, 8).map((row) => `
      <div class="record-row">
        <div><strong>${row.entry_type === "payment" ? "Jama payment" : row.entry_type === "opening_balance" ? "Pichla balance" : "Adjustment"}</strong><span>${escapeHtml(row.entry_date)} · ${escapeHtml(row.note || "-")}</span></div>
        <div class="ledger-row-end"><strong>${row.entry_type === "payment" ? "-" : "+"}${money(row.amount)}</strong><button class="row-action danger" data-delete-ledger="${row.id}">Delete</button></div>
      </div>`).join("") : `<p class="empty">Abhi koi alag khata entry nahi.</p>`;
    $("ledgerHistory").querySelectorAll("[data-delete-ledger]").forEach((button) => button.addEventListener("click", () => deleteLedger(button.dataset.deleteLedger)));
  }

  async function saveLedger(event) {
    event.preventDefault();
    try {
      if ($("ledgerType").value === "opening_balance") {
        await api("store_ledger?entry_type=eq.opening_balance", { method: "DELETE", prefer: "return=minimal" });
      }
      await api("store_ledger", { method: "POST", body: JSON.stringify({
        entry_date: $("ledgerDate").value,
        entry_type: $("ledgerType").value,
        amount: Number($("ledgerAmount").value),
        note: $("ledgerNote").value.trim()
      }), prefer: "return=minimal" });
      $("ledgerAmount").value = "";
      $("ledgerNote").value = "";
      await loadLedger();
      renderDashboard();
      toast("Khata entry save ho gayi");
    } catch (error) {
      console.error(error);
      toast("Khata entry save failed. Updated SQL run karein.");
    }
  }

  async function deleteLedger(id) {
    if (!confirm("Ye khata entry delete karni hai?")) return;
    try {
      await api(`store_ledger?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
      await loadLedger();
      renderDashboard();
      toast("Khata entry deleted");
    } catch { toast("Delete failed"); }
  }

  function updateRemaining() {
    const amount = Math.max(0, Number($("totalAmount").value || 0) - Number($("paidAmount").value || 0));
    $("remainingAmount").value = money(amount);
  }

  async function ensureItem(name) {
    const canonicalName = normalizedItemName(name);
    const existing = state.items.find((item) => normalizedItemName(item.name).toLowerCase() === canonicalName.toLowerCase());
    if (existing) return existing;
    const result = await api("store_items", { method: "POST", body: JSON.stringify({ name: canonicalName }), headers: { Prefer: "return=representation,resolution=merge-duplicates" } });
    await loadItems();
    return result?.[0] || state.items.find((item) => item.name.toLowerCase() === canonicalName.toLowerCase());
  }

  function confirmEntrySave({ id, name, total, purchaseDate }) {
    const allRecords = [...state.entries, ...state.offlineDrafts];
    const duplicate = !id && allRecords.some((row) =>
      row.purchase_date === purchaseDate &&
      normalizedItemName(row.item_name).toLowerCase() === name.toLowerCase() &&
      Number(row.total_amount) === total
    );
    const messages = [];
    if (total > 1000) {
      messages.push(`Bari amount warning: ${money(total)} Rs 1,000 se zyada hai. Amount dobara check karein.`);
    }
    if (duplicate) {
      messages.push("Duplicate warning: isi date par same item aur same amount pehle se mojood hai.");
    }
    messages.push(`${id ? "Record update" : "Naya record"}:\nDate: ${purchaseDate}\nItem: ${name}\nAmount: ${money(total)}\n\nKya ye details bilkul theek hain?`);
    return window.confirm(messages.join("\n\n"));
  }

  async function saveEntry(event) {
    event.preventDefault();
    const name = normalizedItemName($("itemName").value);
    const total = Number($("totalAmount").value || 0);
    const paid = Number($("paidAmount").value || 0);
    if (!name) return toast("Item name required");
    if (total <= 0) return toast("Total amount 0 se zyada hona chahiye");
    if (paid > total) return toast("Paid amount total se zyada nahi ho sakta");
    if (!state.profile) {
      ensureProfile(true);
      return toast("Pehle apna naam save karein");
    }
    const id = $("entryId").value;
    if (id && !navigator.onLine) return toast("Purana record edit karne ke liye internet chahiye");
    const purchaseDate = $("purchaseDate").value;
    if (!confirmEntrySave({ id, name, total, purchaseDate })) return;
    const existing = id ? state.entries.find((row) => row.id === id) : null;
    const baseRow = {
      purchase_date: purchaseDate,
      item_name: name,
      quantity: existing?.quantity || 1,
      unit: existing?.unit || "Other",
      total_amount: total,
      paid_amount: existing?.paid_amount || 0,
      note: existing?.note || "",
      source_group: existing?.source_group || "daily"
    };
    if (!id) {
      baseRow.entered_by = state.profile;
      baseRow.client_ref = clientRef();
    }
    if (!navigator.onLine) return queueOfflineEntry(baseRow);
    try {
      const item = await ensureItem(name);
      const row = {
        ...baseRow,
        item_id: item?.id || null,
      };
      await api(id ? `store_entries?id=eq.${encodeURIComponent(id)}` : "store_entries", { method: id ? "PATCH" : "POST", body: JSON.stringify(row), prefer: "return=minimal" });
      clearEntry();
      await refreshAll();
      showView("dashboard");
      toast(id ? "Record updated" : "Saman save ho gaya");
    } catch (error) {
      console.error(error);
      if (!id && (error instanceof TypeError || !navigator.onLine)) return queueOfflineEntry(baseRow);
      toast("Record save failed");
    }
  }

  function clearEntry() {
    $("entryForm").reset();
    $("entryId").value = "";
    $("purchaseDate").value = today();
    $("quantity").value = "1";
    $("paidAmount").value = "0";
    updateRemaining();
  }

  function itemImageUrl(name) {
    const query = encodeURIComponent(`${normalizedItemName(name)} grocery product`);
    return `https://loremflickr.com/320/220/${query}?lock=${encodeURIComponent(normalizedItemName(name).toLowerCase())}`;
  }

  function renderQuickItems() {
    const frequentNames = grouped(state.entries).sort((a, b) => b.count - a.count).map((item) => item.name);
    const names = [...new Set([...frequentNames, ...state.items.map((item) => normalizedItemName(item.name)), ...BASIC_ITEMS])].slice(0, 18);
    $("quickItemGallery").innerHTML = names.map((name) => `<button class="quick-item-card" type="button" data-quick-item="${escapeHtml(name)}"><span class="quick-image"><img src="${itemImageUrl(name)}" alt="" loading="lazy" referrerpolicy="no-referrer"><b>${escapeHtml(name.charAt(0).toUpperCase())}</b></span><strong>${escapeHtml(name)}</strong><small>Quick add</small></button>`).join("");
    $("quickItemGallery").querySelectorAll("[data-quick-item]").forEach((button) => button.addEventListener("click", () => { $("itemName").value = button.dataset.quickItem; $("itemName").focus(); $("itemName").scrollIntoView({ behavior: "smooth", block: "center" }); toast(`${button.dataset.quickItem} select ho gaya`); }));
    $("quickItemGallery").querySelectorAll("img").forEach((image) => image.addEventListener("error", () => image.classList.add("image-failed")));
  }

  function startVoiceItem() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return toast("Is browser mein voice typing support nahi. Chrome/Edge use karein.");
    const recognition = new Recognition();
    recognition.lang = "ur-PK"; recognition.interimResults = false; recognition.maxAlternatives = 3;
    const button = $("voiceItemBtn"); button.classList.add("listening"); button.querySelector("span").textContent = "Sun raha…";
    recognition.onresult = (event) => { const spoken = event.results[0][0].transcript.replace(/[۔,.!?]/g, "").trim(); $("itemName").value = normalizedItemName(spoken); toast(`Suna gaya: ${spoken}`); };
    recognition.onerror = () => toast("Voice samajh nahi aayi. Dobara bolain.");
    recognition.onend = () => { button.classList.remove("listening"); button.querySelector("span").textContent = "Bolain"; };
    recognition.start();
  }

  function filteredEntries() {
    const from = $("filterFrom").value;
    const to = $("filterTo").value;
    const payment = $("filterPayment").value;
    const item = $("filterItem").value.trim().toLowerCase();
    const minimumValue = $("filterAmountMin").value;
    const maximumValue = $("filterAmountMax").value;
    const minimum = minimumValue === "" ? null : Number(minimumValue);
    const maximum = maximumValue === "" ? null : Number(maximumValue);
    return state.entries.filter((row) =>
      (!from || row.purchase_date >= from) &&
      (!to || row.purchase_date <= to) &&
      (!payment || entryStatus(row) === payment) &&
      (!item || row.item_name.toLowerCase().includes(item)) &&
      (minimum === null || Number(row.total_amount) >= minimum) &&
      (maximum === null || Number(row.total_amount) <= maximum)
    );
  }

  function renderHistory() {
    const minimum = $("filterAmountMin").value;
    const maximum = $("filterAmountMax").value;
    if (minimum !== "" && maximum !== "" && Number(minimum) > Number(maximum)) {
      return toast("Minimum amount maximum amount se zyada nahi ho sakta");
    }
    const rows = filteredEntries();
    const sum = totals(rows);
    $("historySummary").innerHTML = [
      ["Records", rows.length], ["Total", money(sum.total)]
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    $("historyTable").innerHTML = rows.length ? `
      <table><thead><tr><th>Date</th><th>Item</th><th>Total</th><th>Entry karne wala</th><th>Action</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.purchase_date)}</td><td>${escapeHtml(row.item_name)}</td><td>${money(row.total_amount)}</td><td>${escapeHtml(row.entered_by || "Purana record")}</td><td><span class="row-actions"><button class="row-action" data-edit="${row.id}">Edit</button><button class="row-action danger" data-delete="${row.id}">Delete</button></span></td></tr>`).join("")}</tbody></table>
    ` : `<p class="empty">Is filter mein koi record nahi.</p>`;
    $("historyTable").querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editEntry(button.dataset.edit)));
    $("historyTable").querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteEntry(button.dataset.delete)));
  }

  function editEntry(id) {
    const row = state.entries.find((entry) => entry.id === id);
    if (!row) return;
    $("entryId").value = row.id;
    $("purchaseDate").value = row.purchase_date;
    $("itemName").value = row.item_name;
    $("quantity").value = row.quantity;
    $("unit").value = row.unit;
    $("totalAmount").value = row.total_amount;
    $("paidAmount").value = row.paid_amount;
    $("note").value = row.note || "";
    updateRemaining();
    showView("entry");
  }

  async function deleteEntry(id) {
    if (!confirm("Ye record delete karna hai?")) return;
    try {
      await api(`store_entries?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
      await refreshAll();
      toast("Record deleted");
    } catch (error) {
      console.error(error);
      toast("Delete failed");
    }
  }

  function dateRangeRows(fromId, toId) {
    const from = $(fromId).value;
    const to = $(toId).value;
    return state.entries.filter((row) => (!from || row.purchase_date >= from) && (!to || row.purchase_date <= to));
  }

  function renderBars(targetId, rows, field) {
    const target = $(targetId);
    const sorted = grouped(rows).sort((a, b) => b[field] - a[field]).slice(0, 10);
    const max = sorted[0]?.[field] || 1;
    target.innerHTML = sorted.map((item) => `<div class="bar-row"><strong>${escapeHtml(item.name)}</strong><div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, item[field] / max * 100)}%"></div></div><span>${field === "spend" ? money(item[field]) : item[field]}</span></div>`).join("") || `<p class="empty">Data available nahi.</p>`;
  }

  function renderAnalytics() {
    const rows = dateRangeRows("analyticsFrom", "analyticsTo");
    renderBars("frequencyChart", rows, "count");
    renderBars("spendingChart", rows, "spend");
  }

  function renderItems() {
    $("itemList").innerHTML = state.items.map((item) => `<div class="item-chip"><span>${escapeHtml(item.name)}</span><button type="button" data-delete-item="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">×</button></div>`).join("") || `<p class="empty">Items pehla purchase save karte hi yahan aa jayengi.</p>`;
    $("itemList").querySelectorAll("[data-delete-item]").forEach((button) => button.addEventListener("click", () => deleteItem(button.dataset.deleteItem)));
  }

  async function addItem(event) {
    event.preventDefault();
    const name = $("catalogueItemName").value.trim();
    if (!name) return;
    try {
      await ensureItem(name);
      $("catalogueItemName").value = "";
      renderItems();
      toast("Item added");
    } catch { toast("Item already exists ya save failed"); }
  }

  async function deleteItem(id) {
    if (!confirm("Item dropdown se remove karna hai? Purani history delete nahi hogi.")) return;
    try {
      await api(`store_items?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
      await loadItems();
      renderItems();
      toast("Item removed");
    } catch { toast("Item remove failed"); }
  }

  function exportCsv() {
    const rows = filteredEntries();
    if (!rows.length) return toast("Export ke liye data nahi");
    const headers = ["Date","Item","Total","Entered By"];
    const values = rows.map((row) => [row.purchase_date,row.item_name,row.total_amount,row.entered_by || "Purana record"]);
    const csv = [headers, ...values].map((line) => line.map((value) => `"${String(value).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `maqsood-karyana-history-${today()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function bindEvents() {
    $("loginForm").addEventListener("submit", login);
    $("showLoginPassword").addEventListener("click", () => {
      const input = $("loginPassword");
      input.type = input.type === "password" ? "text" : "password";
      $("showLoginPassword").textContent = input.type === "password" ? "Show" : "Hide";
    });
    $("logoutBtn").addEventListener("click", logout);
    $("profileBtn").addEventListener("click", () => ensureProfile(true));
    $("profileForm").addEventListener("submit", saveProfile);
    $("cancelProfileBtn").addEventListener("click", () => $("profileModal").classList.add("hidden"));
    $("deviceProfileName").addEventListener("input", () => {
      $("profileModalInitial").textContent = $("deviceProfileName").value.trim().charAt(0).toUpperCase() || "?";
    });
    $("syncDraftsBtn").addEventListener("click", syncOfflineDrafts);
    document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    document.querySelectorAll("[data-open-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.openView)));
    $("entryForm").addEventListener("submit", saveEntry);
    $("voiceItemBtn").addEventListener("click", startVoiceItem);
    $("clearEntryBtn").addEventListener("click", clearEntry);
    $("totalAmount").addEventListener("input", updateRemaining);
    $("paidAmount").addEventListener("input", updateRemaining);
    ["filterFrom","filterTo","filterPayment","filterItem","filterAmountMin","filterAmountMax"].forEach((id) => $(id).addEventListener("change", renderHistory));
    $("showHistoryBtn").addEventListener("click", renderHistory);
    $("showAnalyticsBtn").addEventListener("click", renderAnalytics);
    $("exportCsvBtn").addEventListener("click", exportCsv);
    $("printBtn").addEventListener("click", () => window.print());
    $("itemForm").addEventListener("submit", addItem);
    $("ledgerForm").addEventListener("submit", saveLedger);
    document.querySelectorAll("[data-install-app]").forEach((button) => button.addEventListener("click", async () => {
      if (!state.deferredPrompt) return toast("Browser menu se Install App choose karein");
      state.deferredPrompt.prompt();
      await state.deferredPrompt.userChoice;
      state.deferredPrompt = null;
      updateInstallButtons();
    }));
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.deferredPrompt = event;
      updateInstallButtons();
    });
    window.addEventListener("appinstalled", () => {
      state.deferredPrompt = null;
      updateInstallButtons();
    });
    window.addEventListener("online", async () => {
      $("offlineBadge").classList.add("hidden");
      await syncOfflineDrafts();
    });
    window.addEventListener("offline", () => {
      renderOfflineDrafts();
      toast("Offline mode on ho gaya");
    });
  }

  function updateInstallButtons() {
    const installed = matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    document.querySelectorAll("[data-install-app]").forEach((button) => {
      button.classList.toggle("hidden", installed || !state.deferredPrompt);
    });
  }

  function init() {
    bindEvents();
    clearEntry();
    $("filterFrom").value = "";
    $("filterTo").value = today();
    $("analyticsFrom").value = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    $("analyticsTo").value = today();
    $("ledgerDate").value = today();
    updateInstallButtons();
    renderOfflineDrafts();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js?v=9").catch(console.error);
    restoreSession();
  }

  init();
})();
