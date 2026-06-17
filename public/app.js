const state = {
  events: [],
  signals: [],
  meta: null,
  event: "",
  platform: "",
  travel: "",
  q: ""
};

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function scoreClass(score) {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  if (score >= 35) return "watch";
  return "";
}

function travelLabel(value) {
  return {
    local: "Local",
    direct_flight_seed: "Direct-flight seed",
    same_region: "Same region",
    unknown: "Unknown"
  }[value] || value || "Unknown";
}

function gateLabel(value) {
  if (value === "blocked_private") return '<span class="gate-blocked">Blocked</span>';
  if (value === "public_ambiguous") return '<span class="gate-blocked">Review gate</span>';
  return '<span class="gate-ok">Public</span>';
}

function reachPathHtml(value) {
  if (!value) return "Blocked by gate.";
  if (!String(value).startsWith("http")) return esc(value);
  return `<a href="${esc(value)}" target="_blank" rel="noopener">${esc(value)}</a>`;
}

function filtered() {
  const q = state.q.toLowerCase();
  return state.signals.filter((row) => {
    if (state.event && row.eventId !== state.event) return false;
    if (state.platform && row.platform !== state.platform) return false;
    if (state.travel && row.travelMatch !== state.travel) return false;
    if (!q) return true;
    return [row.eventName, row.excerpt, row.locationHint, row.publicName, row.topicMatch?.join(" ")]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });
}

function populateFilters() {
  $("eventFilter").innerHTML = '<option value="">All BTC++ events</option>' +
    state.events.map((event) => `<option value="${esc(event.id)}">${esc(event.city)} - ${esc(event.edition)}</option>`).join("");
  const platforms = [...new Set(state.signals.map((row) => row.platform))].sort();
  $("platformFilter").innerHTML = '<option value="">All sources</option>' +
    platforms.map((platform) => `<option value="${esc(platform)}">${esc(platform)}</option>`).join("");
}

function render() {
  const rows = filtered();
  $("statline").textContent = `${rows.length} shown / ${state.signals.length} matches - ${state.meta?.eventCount || 0} events`;
  $("empty").hidden = rows.length !== 0;
  $("rows").innerHTML = rows.map((row, index) => `
    <tr data-index="${index}">
      <td><span class="score ${scoreClass(row.score)}">${esc(row.score)}</span></td>
      <td>
        <div class="event-name">${esc(row.eventCity)}</div>
        <div class="event-sub">${esc(row.eventEdition)} - ${esc(row.eventDates)}</div>
      </td>
      <td>
        <span class="platform">${esc(row.platform)}</span>
        <div class="excerpt">${esc(row.excerpt)}</div>
        <div class="meta">${esc(row.publicName || "public signal")} - ${esc(row.locationHint || "unknown")}</div>
      </td>
      <td>${esc(travelLabel(row.travelMatch))}</td>
      <td>${(row.topicMatch || []).map((topic) => `<span class="chip">${esc(topic)}</span>`).join("")}</td>
      <td>${gateLabel(row.gate)}</td>
    </tr>
  `).join("");
}

function openDrawer(row) {
  $("drawerBody").innerHTML = `
    <h2>${esc(row.eventName)}</h2>
    <div class="meta">${esc(row.eventEdition)} - ${esc(row.eventCity)}, ${esc(row.eventCountry)} - ${esc(row.eventDates)}</div>
    <h3>Signal</h3>
    <p class="draft">${esc(row.excerpt)}</p>
    <h3>Score</h3>
    <p><span class="score ${scoreClass(row.score)}">${esc(row.score)}</span> ${esc(row.scoreBreakdown)}</p>
    <p>${esc(travelLabel(row.travelMatch))} from ${esc(row.locationHint || "unknown")}.</p>
    <h3>Public reach path</h3>
    <p>${reachPathHtml(row.reachPath)}</p>
    <h3>Draft</h3>
    <p class="draft">${esc(row.draftPublicReply || "No draft generated.")}</p>
    <h3>Event</h3>
    <p><a href="${esc(row.eventUrl)}" target="_blank" rel="noopener">${esc(row.eventUrl)}</a></p>
  `;
  document.body.classList.add("drawer-open");
}

async function load() {
  const [events, signals, meta] = await Promise.all([
    fetch("./data/events.json").then((res) => res.json()),
    fetch("./data/signals.json").then((res) => res.json()),
    fetch("./data/meta.json").then((res) => res.json())
  ]);
  state.events = events;
  state.signals = signals;
  state.meta = meta;
  populateFilters();
  render();
}

$("eventFilter").addEventListener("change", (event) => { state.event = event.target.value; render(); });
$("platformFilter").addEventListener("change", (event) => { state.platform = event.target.value; render(); });
$("travelFilter").addEventListener("change", (event) => { state.travel = event.target.value; render(); });
$("search").addEventListener("input", (event) => { state.q = event.target.value.trim(); render(); });
$("rows").addEventListener("click", (event) => {
  const tr = event.target.closest("tr[data-index]");
  if (!tr) return;
  openDrawer(filtered()[Number(tr.dataset.index)]);
});
$("closeDrawer").addEventListener("click", () => document.body.classList.remove("drawer-open"));
$("scrim").addEventListener("click", () => document.body.classList.remove("drawer-open"));

load().catch((error) => {
  $("statline").textContent = "Data load failed";
  $("rows").innerHTML = `<tr><td colspan="6">${esc(error.message || error)}</td></tr>`;
});
