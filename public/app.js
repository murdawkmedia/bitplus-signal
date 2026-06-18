const selectedFilters = {
  platforms: new Set(),
  sourceLanes: new Set(),
  geoTiers: new Set(),
  audienceScopes: new Set(),
  evidenceLevels: new Set(),
  travelMatches: new Set(),
  topicMatches: new Set()
};

const state = {
  events: [],
  signals: [],
  meta: null,
  sourceLog: null,
  event: "",
  q: "",
  sortKey: "score",
  sortDir: "desc",
  showTrustCandidates: false,
  selectedFilters
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

function formatLabel(value) {
  return String(value || "unknown")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function travelLabel(value) {
  return {
    local: "Local",
    direct_flight_seed: "Direct flight",
    same_region: "Same region",
    unknown: "Unknown"
  }[value] || formatLabel(value);
}

function geoLabel(value) {
  return {
    local_area: "Local area",
    near_direct_3h: "Near direct 3h",
    long_direct_or_far: "Long direct/far",
    unknown_location: "Unknown location"
  }[value] || formatLabel(value);
}

function audienceLabel(value) {
  return {
    broad_builder_crypto: "Broad builder",
    bitcoin_only: "Bitcoin only"
  }[value] || formatLabel(value);
}

function evidenceLabel(value) {
  return {
    public_content: "Public content",
    official_event_page: "Official event",
    crossover_event_page: "Crossover event",
    trust_candidate: "Trust candidate"
  }[value] || formatLabel(value);
}

function qualityLabel(value) {
  return {
    reply_target: "Reply target",
    event_context: "Event context",
    research_lead: "Research lead",
    trust_candidate: "Trust candidate",
    blocked: "Blocked"
  }[value] || formatLabel(value);
}

function gateLabel(value) {
  if (value === "blocked_private") return '<span class="gate-blocked">Blocked</span>';
  if (value === "public_ambiguous") return '<span class="gate-blocked">Review gate</span>';
  return '<span class="gate-ok">Public</span>';
}

function dataBadge(value) {
  if (value === "real_public") return '<span class="data-badge real">Real public</span>';
  if (value === "sample_synthetic") return '<span class="data-badge sample">Sample</span>';
  return `<span class="data-badge">${esc(value || "Unknown")}</span>`;
}

function sourceLaneLabel(value) {
  return String(value || "unknown").replaceAll("_", " ");
}

function sourceFamily(sourceLane = "") {
  if (sourceLane.startsWith("nostr")) return "Nostr";
  if (sourceLane.includes("_x")) return "X";
  if (sourceLane.includes("reddit")) return "Reddit";
  if (sourceLane.includes("instagram")) return "Instagram";
  if (sourceLane.includes("tiktok")) return "TikTok";
  if (sourceLane.includes("facebook")) return "Facebook";
  if (sourceLane.includes("linkedin")) return "LinkedIn";
  if (sourceLane.includes("community")) return "Community";
  if (sourceLane.includes("event") || sourceLane.includes("crossover")) return "Events";
  return formatLabel(sourceLane || "Other");
}

function statusLabel(status = "") {
  const value = String(status || "unknown");
  if (value === "published_reviewed") return "Published";
  if (value === "zero_yield") return "No public notes found";
  if (value === "zero_yield_search_mismatch") return "Search mismatch";
  if (value === "zero_yield_no_results_placeholders") return "No usable results";
  if (value === "blocked_low_target_quality") return "Blocked: low fit";
  if (value === "blocked_apify_usage_balance") return "Blocked: Apify balance";
  if (value === "blocked_missing_apify_token") return "Not run: missing token";
  return formatLabel(value);
}

function sourceCoverageRows() {
  const lanes = state.sourceLog?.lanes || [];
  return lanes.map((lane) => ({
    ...lane,
    family: sourceFamily(lane.sourceLane),
    label: statusLabel(lane.status),
    published: Number(lane.published || 0),
    reviewed: Number(lane.reviewed || 0),
    yielded: Number(lane.yielded || 0)
  }));
}

function trustLabel(row) {
  const total = Number(row.trustScore || 0) + Number(row.conferenceAffinityScore || 0);
  if (!total) return '<span class="trust-zero">0</span>';
  return `<span class="trust-score">${esc(total)}</span><span class="trust-sub">W${esc(row.trustScore || 0)} C${esc(row.conferenceAffinityScore || 0)}</span>`;
}

function reachPathHtml(value) {
  if (!value) return "Blocked by gate.";
  if (!String(value).startsWith("http")) return esc(value);
  return `<a href="${esc(value)}" target="_blank" rel="noopener">${esc(value)}</a>`;
}

function rowGeoTier(row) {
  return row.geoTier || "unknown_location";
}

function rowAudienceScope(row) {
  return row.audienceScope || "bitcoin_only";
}

function rowEvidenceLevel(row) {
  return row.evidenceLevel || (row.sourceLane === "nostr_graph" ? "trust_candidate" : "public_content");
}

function rowQualityClass(row) {
  if (row.qualityClass) return row.qualityClass;
  if (row.gate === "blocked_private") return "blocked";
  if (rowEvidenceLevel(row) === "trust_candidate") return "trust_candidate";
  if (["official_event_page", "crossover_event_page"].includes(rowEvidenceLevel(row))) return "event_context";
  return row.draftPublicReply ? "reply_target" : "research_lead";
}

function whyItMatters(row) {
  const qualityClass = rowQualityClass(row);
  if (qualityClass === "reply_target") {
    return "Public post with enough context for a human-reviewed BTC++ account reply.";
  }
  if (qualityClass === "event_context") {
    return "Official or crossover event context that can reveal nearby builder audiences.";
  }
  if (qualityClass === "research_lead") {
    return "Useful public signal, but it needs one more evidence pass before outreach.";
  }
  if (qualityClass === "trust_candidate") {
    return "Trust-graph clue only. Hidden by default and no draft is generated.";
  }
  return "Blocked by safety or source-quality policy.";
}

function confidenceLabel(row) {
  const score = Number(row.score || 0);
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  if (score >= 35) return "Review";
  return "Low";
}

function truncate(value, length = 180) {
  const text = String(value || "").trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trim()}...`;
}

function matchesSet(set, value) {
  return set.size === 0 || set.has(String(value || ""));
}

function matchesAny(set, values) {
  if (set.size === 0) return true;
  return values.some((value) => set.has(String(value || "")));
}

function filtered() {
  const q = state.q.toLowerCase();
  return state.signals.filter((row) => {
    if (state.event && row.eventId !== state.event) return false;
    if (!state.showTrustCandidates && rowEvidenceLevel(row) === "trust_candidate") return false;
    if (!matchesSet(state.selectedFilters.platforms, row.platform)) return false;
    if (!matchesSet(state.selectedFilters.sourceLanes, row.sourceLane)) return false;
    if (!matchesSet(state.selectedFilters.geoTiers, rowGeoTier(row))) return false;
    if (!matchesSet(state.selectedFilters.audienceScopes, rowAudienceScope(row))) return false;
    if (!matchesSet(state.selectedFilters.evidenceLevels, rowEvidenceLevel(row))) return false;
    if (!matchesSet(state.selectedFilters.travelMatches, row.travelMatch)) return false;
    if (!matchesAny(state.selectedFilters.topicMatches, row.topicMatch || [])) return false;
    if (!q) return true;
    return [
      row.eventName,
      row.excerpt,
      row.locationHint,
      row.publicName,
      row.topicMatch?.join(" "),
      row.sourceLane,
      rowGeoTier(row),
      rowAudienceScope(row),
      rowEvidenceLevel(row),
      rowQualityClass(row)
    ].some((value) => String(value || "").toLowerCase().includes(q));
  });
}

function sortValue(row, key) {
  if (key === "score") return Number(row.score || 0);
  if (key === "event") return `${row.eventCity || ""} ${row.eventEdition || ""}`;
  if (key === "signal") return `${row.publicName || ""} ${row.excerpt || ""}`;
  if (key === "travel") return `${geoLabel(rowGeoTier(row))} ${travelLabel(row.travelMatch)}`;
  if (key === "trust") return Number(row.trustScore || 0) + Number(row.conferenceAffinityScore || 0);
  if (key === "topics") return (row.topicMatch || []).join(" ");
  if (key === "gate") return gateLabel(row.gate).replace(/<[^>]+>/g, "");
  return "";
}

function sortedRows() {
  const dir = state.sortDir === "asc" ? 1 : -1;
  return [...filtered()].sort((a, b) => {
    const left = sortValue(a, state.sortKey);
    const right = sortValue(b, state.sortKey);
    if (typeof left === "number" && typeof right === "number") return (left - right) * dir;
    return String(left).localeCompare(String(right)) * dir;
  });
}

function topOpportunities(rows = sortedRows()) {
  const priority = {
    reply_target: 0,
    event_context: 1,
    research_lead: 2,
    trust_candidate: 3,
    blocked: 4
  };
  return [...rows]
    .filter((row) => !["trust_candidate", "blocked"].includes(rowQualityClass(row)))
    .sort((a, b) => {
      const qualityDelta = (priority[rowQualityClass(a)] ?? 9) - (priority[rowQualityClass(b)] ?? 9);
      if (qualityDelta) return qualityDelta;
      return Number(b.score || 0) - Number(a.score || 0);
    })
    .slice(0, 5);
}

function updateSortUi() {
  document.querySelectorAll("[data-sort-th]").forEach((th) => {
    const key = th.dataset.sortTh;
    const active = key === state.sortKey;
    th.setAttribute("aria-sort", active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none");
    const marker = th.querySelector("[aria-hidden]");
    if (marker) marker.textContent = active ? (state.sortDir === "asc" ? "^" : "v") : "";
  });
  const label = state.sortKey.replaceAll("_", " ");
  $("sortStatus").textContent = `Sort: ${label} ${state.sortDir}`;
}

function valueCounts(rows, getter) {
  const counts = new Map();
  for (const row of rows) {
    const values = getter(row);
    for (const value of Array.isArray(values) ? values : [values]) {
      const key = String(value || "").trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function renderCheckboxGroup(id, filterKey, rows, getter, labeler = formatLabel) {
  const host = $(id);
  if (!host) return;
  const counts = valueCounts(rows, getter);
  host.innerHTML = counts.map(([value, count]) => `
    <label class="check-row">
      <input type="checkbox" data-filter-key="${esc(filterKey)}" value="${esc(value)}">
      <span>${esc(labeler(value))}</span>
      <em>${esc(count)}</em>
    </label>
  `).join("") || '<div class="check-empty">None</div>';
}

function populateFilters() {
  $("eventFilter").innerHTML = '<option value="">All BTC++ events</option>' +
    state.events.map((event) => `<option value="${esc(event.id)}">${esc(event.city)} - ${esc(event.edition)}</option>`).join("");
  renderCheckboxGroup("platformFilters", "platforms", state.signals, (row) => row.platform, formatLabel);
  renderCheckboxGroup("sourceLaneFilters", "sourceLanes", state.signals, (row) => row.sourceLane, sourceLaneLabel);
  renderCheckboxGroup("geoFilters", "geoTiers", state.signals, rowGeoTier, geoLabel);
  renderCheckboxGroup("audienceFilters", "audienceScopes", state.signals, rowAudienceScope, audienceLabel);
  renderCheckboxGroup("evidenceFilters", "evidenceLevels", state.signals, rowEvidenceLevel, evidenceLabel);
  renderCheckboxGroup("travelFilters", "travelMatches", state.signals, (row) => row.travelMatch, travelLabel);
  renderCheckboxGroup("topicFilters", "topicMatches", state.signals, (row) => row.topicMatch || [], formatLabel);
}

function renderSourcePanel() {
  const panel = $("sourcePanel");
  if (!panel) return;
  const lanes = state.sourceLog?.lanes || [];
  const totalPublished = lanes.reduce((sum, lane) => sum + Number(lane.published || 0), 0);
  panel.innerHTML = `
    <div class="source-title">Public source run</div>
    <div class="source-total">${esc(totalPublished)} published / ${esc(state.meta?.realSignalCount || 0)} real rows</div>
    <div class="source-list">
      ${lanes.map((lane) => `
        <div class="source-lane">
          <span>${esc(sourceLaneLabel(lane.sourceLane))}</span>
          <strong>${esc(lane.published || 0)}/${esc(lane.yielded || 0)}</strong>
          <em>${esc(lane.status || "unknown")}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSourceCoveragePanel() {
  const panel = $("sourceCoveragePanel");
  if (!panel) return;
  const rows = sourceCoverageRows();
  const families = new Map();
  for (const row of rows) {
    const current = families.get(row.family) ?? { published: 0, reviewed: 0, yielded: 0, blocked: 0, zero: 0, missing: 0 };
    current.published += row.published;
    current.reviewed += row.reviewed;
    current.yielded += row.yielded;
    if (String(row.status).startsWith("blocked")) current.blocked += 1;
    if (String(row.status).startsWith("zero_yield")) current.zero += 1;
    if (row.status === "blocked_missing_apify_token") current.missing += 1;
    families.set(row.family, current);
  }
  const familyHtml = [...families.entries()].map(([family, counts]) => `
    <div class="coverage-family">
      <strong>${esc(family)}</strong>
      <span>${esc(counts.published)} published / ${esc(counts.yielded)} yielded</span>
      <em>${esc(counts.blocked)} blocked, ${esc(counts.zero)} zero, ${esc(counts.missing)} token</em>
    </div>
  `).join("");
  panel.innerHTML = `
    <details open>
      <summary>Source coverage</summary>
      <p class="coverage-note">Rows below show attempted lanes too, so missing platforms are visible even when nothing was safe to publish.</p>
      <div class="coverage-families">${familyHtml}</div>
      <div class="coverage-list">
        ${rows.map((row) => `
          <div class="coverage-lane ${esc(String(row.status || "unknown").replaceAll("_", "-"))}">
            <span>${esc(row.family)} / ${esc(sourceLaneLabel(row.sourceLane))}</span>
            <strong>${esc(row.label)}</strong>
            <em>${esc(row.published)} published, ${esc(row.reviewed)} reviewed, ${esc(row.yielded)} yielded</em>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function renderTargeting(row) {
  return `
    <div class="targeting">
      <span>${esc(geoLabel(rowGeoTier(row)))}</span>
      <span>${esc(audienceLabel(rowAudienceScope(row)))}</span>
      <span>${esc(evidenceLabel(rowEvidenceLevel(row)))}</span>
      <span>${esc(qualityLabel(rowQualityClass(row)))}</span>
    </div>
  `;
}

function renderOpportunityCards(rows) {
  const host = $("topOpportunityCards");
  if (!host) return;
  const opportunities = topOpportunities(rows);
  host.innerHTML = opportunities.map((row, index) => `
    <article class="opportunity-card" data-card-index="${index}">
      <div class="card-top">
        <span class="score ${scoreClass(row.score)}">${esc(row.score)}</span>
        <div>
          <h3>${esc(row.publicName || row.platform || "Public signal")}</h3>
          <p>${esc(row.platform)} / ${esc(sourceLaneLabel(row.sourceLane))}</p>
        </div>
      </div>
      <div class="card-tags">
        <span>${esc(qualityLabel(rowQualityClass(row)))}</span>
        <span>${esc(confidenceLabel(row))} confidence</span>
        <span>${esc(geoLabel(rowGeoTier(row)))}</span>
      </div>
      <p><strong>Why:</strong> ${esc(whyItMatters(row))}</p>
      <p>${esc(truncate(row.excerpt, 210))}</p>
      <div class="suggested-reply">
        <span>Suggested public reply</span>
        <p>${esc(truncate(row.draftPublicReply || "No draft generated until a public reply target is confirmed.", 220))}</p>
      </div>
    </article>
  `).join("") || '<div class="empty-card">No high-fit public opportunities match these filters.</div>';
}

function render() {
  const rows = sortedRows();
  $("statline").textContent = `${rows.length} shown / ${state.signals.length} matches - ${state.meta?.realSignalCount || 0} real - ${state.meta?.sampleSignalCount || 0} sample`;
  $("empty").hidden = rows.length !== 0;
  updateSortUi();
  renderOpportunityCards(rows);
  $("rows").innerHTML = rows.map((row, index) => `
    <tr data-index="${index}">
      <td><span class="score ${scoreClass(row.score)}">${esc(row.score)}</span></td>
      <td>
        <div class="event-name">${esc(row.eventCity)}</div>
        <div class="event-sub">${esc(row.eventEdition)} - ${esc(row.eventDates)}</div>
      </td>
      <td>
        <span class="platform">${esc(row.platform)}</span>${dataBadge(row.dataMode)}
        <div class="excerpt">${esc(row.excerpt)}</div>
        <div class="meta">${esc(row.publicName || "public signal")} - ${esc(row.locationHint || "unknown")}</div>
        <div class="meta source-meta">${esc(sourceLaneLabel(row.sourceLane))} - ${esc(row.provenanceNote || "public source")}</div>
      </td>
      <td>
        <strong>${esc(geoLabel(rowGeoTier(row)))}</strong>
        <div class="meta">${esc(travelLabel(row.travelMatch))}</div>
        ${renderTargeting(row)}
      </td>
      <td>${trustLabel(row)}</td>
      <td>${(row.topicMatch || []).map((topic) => `<span class="chip">${esc(topic)}</span>`).join("")}</td>
      <td>${gateLabel(row.gate)}</td>
    </tr>
  `).join("");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const rows = sortedRows();
  const columns = [
    ["score", (row) => row.score],
    ["event", (row) => row.eventName],
    ["edition", (row) => row.eventEdition],
    ["platform", (row) => row.platform],
    ["public_name", (row) => row.publicName],
    ["source_url", (row) => row.sourceUrl],
    ["excerpt", (row) => row.excerpt],
    ["location", (row) => row.locationHint],
    ["geo_tier", (row) => rowGeoTier(row)],
    ["audience_scope", (row) => rowAudienceScope(row)],
    ["evidence_level", (row) => rowEvidenceLevel(row)],
    ["quality_class", (row) => rowQualityClass(row)],
    ["topics", (row) => (row.topicMatch || []).join("; ")],
    ["travel", (row) => row.travelMatch],
    ["gate", (row) => row.gate],
    ["source_lane", (row) => row.sourceLane],
    ["approval_status", (row) => row.approvalStatus]
  ];
  const csv = [
    columns.map(([label]) => csvCell(label)).join(","),
    ...rows.map((row) => columns.map(([, getter]) => csvCell(getter(row))).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bitplus-signal-${rows.length}-rows.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openDrawer(row) {
  $("drawerBody").innerHTML = `
    <h2>${esc(row.eventName)}</h2>
    <div class="meta">${esc(row.eventEdition)} - ${esc(row.eventCity)}, ${esc(row.eventCountry)} - ${esc(row.eventDates)}</div>
    <h3>Provenance</h3>
    <p>${dataBadge(row.dataMode)} <span class="source-pill">${esc(sourceLaneLabel(row.sourceLane))}</span> ${gateLabel(row.gate)}</p>
    <p class="draft">${esc(row.provenanceNote || "Public source row.")}</p>
    <p><a href="${esc(row.sourceUrl)}" target="_blank" rel="noopener">${esc(row.sourceUrl)}</a></p>
    <h3>Signal</h3>
    <p class="draft">${esc(row.excerpt)}</p>
    <h3>Score</h3>
    <p><span class="score ${scoreClass(row.score)}">${esc(row.score)}</span> ${esc(row.scoreBreakdown)}</p>
    <p>${esc(geoLabel(rowGeoTier(row)))} / ${esc(audienceLabel(rowAudienceScope(row)))} / ${esc(evidenceLabel(rowEvidenceLevel(row)))} / ${esc(qualityLabel(rowQualityClass(row)))} from ${esc(row.locationHint || "unknown")}.</p>
    <p class="draft">${esc(whyItMatters(row))}</p>
    <p class="draft">${esc(row.geoReason || "No geo policy reason recorded.")}</p>
    <h3>Trust proximity</h3>
    <p><span class="trust-score">${esc((row.trustScore || 0) + (row.conferenceAffinityScore || 0))}</span> W${esc(row.trustScore || 0)} C${esc(row.conferenceAffinityScore || 0)}</p>
    <p class="draft">${esc((row.trustReasons || []).join("\n") || "No public trust graph match.")}</p>
    <h3>Public reach path</h3>
    <p>${reachPathHtml(row.reachPath)}</p>
    <h3>Draft</h3>
    <p class="meta">${esc(row.approvalStatus || "needs_human_review")}</p>
    <p class="draft">${esc(row.draftPublicReply || "No draft generated.")}</p>
    <h3>Event</h3>
    <p><a href="${esc(row.eventUrl)}" target="_blank" rel="noopener">${esc(row.eventUrl)}</a></p>
  `;
  document.body.classList.add("drawer-open");
}

async function load() {
  const [events, signals, meta, sourceLog] = await Promise.all([
    fetch("./data/events.json").then((res) => res.json()),
    fetch("./data/signals.json").then((res) => res.json()),
    fetch("./data/meta.json").then((res) => res.json()),
    fetch("./data/source-log.json").then((res) => res.json()).catch(() => ({ lanes: [] }))
  ]);
  state.events = events;
  state.signals = signals;
  state.meta = meta;
  state.sourceLog = sourceLog;
  populateFilters();
  renderSourcePanel();
  renderSourceCoveragePanel();
  render();
}

$("eventFilter").addEventListener("change", (event) => { state.event = event.target.value; render(); });
$("includeTrustCandidates").addEventListener("change", (event) => {
  state.showTrustCandidates = event.target.checked;
  render();
});
$("filterRail").addEventListener("change", (event) => {
  const target = event.target;
  if (!target.matches('input[type="checkbox"][data-filter-key]')) return;
  const set = state.selectedFilters[target.dataset.filterKey];
  if (!set) return;
  if (target.checked) {
    set.add(target.value);
  } else {
    set.delete(target.value);
  }
  render();
});
$("search").addEventListener("input", (event) => { state.q = event.target.value.trim(); render(); });
document.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = key === "score" || key === "trust" ? "desc" : "asc";
    }
    render();
  });
});
$("exportCsv").addEventListener("click", exportCsv);
$("printView").addEventListener("click", () => window.print());
$("rows").addEventListener("click", (event) => {
  const tr = event.target.closest("tr[data-index]");
  if (!tr) return;
  openDrawer(sortedRows()[Number(tr.dataset.index)]);
});
$("topOpportunityCards").addEventListener("click", (event) => {
  const card = event.target.closest("[data-card-index]");
  if (!card) return;
  openDrawer(topOpportunities()[Number(card.dataset.cardIndex)]);
});
$("closeDrawer").addEventListener("click", () => document.body.classList.remove("drawer-open"));
$("scrim").addEventListener("click", () => document.body.classList.remove("drawer-open"));

load().catch((error) => {
  $("statline").textContent = "Data load failed";
  $("rows").innerHTML = `<tr><td colspan="7">${esc(error.message || error)}</td></tr>`;
});
