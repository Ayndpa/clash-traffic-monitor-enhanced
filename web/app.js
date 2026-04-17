const drilldownConfig = {
  sourceIP: {
    countLabel: "设备",
    primaryTitle: "设备排行",
    secondaryColumn: "访问主机",
    buildSecondaryTitle: (primary) => (primary ? `${primary} 访问的主机` : "访问主机"),
    buildDetailTitle: (primary, secondary) =>
      primary && secondary ? `${primary} / ${secondary} 的连接明细` : "连接明细",
  },
  host: {
    countLabel: "主机",
    primaryTitle: "主机排行",
    secondaryColumn: "访问设备",
    buildSecondaryTitle: (primary) => (primary ? `${primary} 的访问设备` : "访问设备"),
    buildDetailTitle: (primary, secondary) =>
      primary && secondary ? `${primary} / ${secondary} 的连接明细` : "连接明细",
  },
  outbound: {
    countLabel: "代理",
    primaryTitle: "代理排行",
    secondaryColumn: "目标主机",
    buildSecondaryTitle: (primary) => (primary ? `${primary} 命中的目标主机` : "目标主机"),
    buildDetailTitle: (primary, secondary) =>
      primary && secondary ? `${primary} / ${secondary} 的连接明细` : "连接明细",
  },
}

const elements = {
  dimension: document.getElementById("dimension"),
  dimensionTabs: Array.from(document.querySelectorAll(".dimension-tab")),
  range: document.getElementById("range"),
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  statusBanner: document.getElementById("statusBanner"),
  runtimeSummary: document.getElementById("runtimeSummary"),
  selectionPath: document.getElementById("selectionPath"),
  runtimeConnectionState: document.getElementById("runtimeConnectionState"),
  runtimeDimension: document.getElementById("runtimeDimension"),
  runtimeRangeLabel: document.getElementById("runtimeRangeLabel"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsTitle: document.getElementById("settingsTitle"),
  settingsDescription: document.getElementById("settingsDescription"),
  settingsForm: document.getElementById("settingsForm"),
  settingsUrl: document.getElementById("settingsUrl"),
  settingsSecret: document.getElementById("settingsSecret"),
  settingsSaveBtn: document.getElementById("settingsSaveBtn"),
  settingsCancelBtn: document.getElementById("settingsCancelBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  dashboardShell: document.getElementById("dashboardShell"),
  refreshBtn: document.getElementById("refreshBtn"),
  clearBtn: document.getElementById("clearBtn"),
  countLabel: document.getElementById("countLabel"),
  primaryTitle: document.getElementById("primaryTitle"),
  countValue: document.getElementById("countValue"),
  uploadValue: document.getElementById("uploadValue"),
  downloadValue: document.getElementById("downloadValue"),
  totalValue: document.getElementById("totalValue"),
  tableBody: document.getElementById("tableBody"),
  trendCanvas: document.getElementById("trendCanvas"),
  secondaryTitle: document.getElementById("secondaryTitle"),
  secondaryHeader: document.getElementById("secondaryHeader"),
  detailTitle: document.getElementById("detailTitle"),
  detailSearch: document.getElementById("detailSearch"),
  secondaryBody: document.getElementById("secondaryBody"),
  detailCards: document.getElementById("detailCards"),
}

const state = {
  lastTrendPoints: [],
  primaryRows: [],
  secondaryRows: [],
  detailRows: [],
  selectedPrimary: null,
  selectedSecondary: null,
  detailSearchQuery: "",
  loadSeq: 0,
  detailSeq: 0,
  mihomoSettings: {
    url: "",
    secret: "",
  },
  settingsOpen: false,
  settingsRequired: false,
}

function nowLocalInputValue(offsetMs) {
  const date = new Date(Date.now() + offsetMs)
  const pad = (value) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(timestamp) {
  if (!Number.isFinite(timestamp)) return "--"
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function updateCustomInputs() {
  const range = Number(elements.range.value)
  const end = Date.now()
  const start = range === -1 ? end - 86400000 : end - range
  elements.start.value = nowLocalInputValue(start - end)
  elements.end.value = nowLocalInputValue(0)
}

function getTimeRange() {
  if (Number(elements.range.value) === -1) {
    return {
      start: new Date(elements.start.value).getTime(),
      end: new Date(elements.end.value).getTime(),
    }
  }

  const end = Date.now()
  return {
    end,
    start: end - Number(elements.range.value),
  }
}

function currentRangeLabel() {
  if (Number(elements.range.value) === -1) {
    const { start, end } = getTimeRange()
    return `${formatDateTime(start)} - ${formatDateTime(end)}`
  }

  const option = elements.range.options[elements.range.selectedIndex]
  const label = option?.textContent?.trim() || "7 天"
  return `最近 ${label}`
}

function bucketSize(start, end) {
  const range = end - start
  if (range <= 3600000) return 60000
  if (range <= 86400000) return 300000
  if (range <= 604800000) return 3600000
  return 86400000
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let idx = 0
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx += 1
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

function escapeHTML(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderTruncatedText(text, className = "", fallback = "Unknown") {
  const value = String(text || fallback)
  const safe = escapeHTML(value)
  const cls = className ? `truncate ${className}` : "truncate"
  return `<span class="${cls}" title="${safe}">${safe}</span>`
}

function setStatus(text, isError = false) {
  if (!text) {
    elements.statusBanner.textContent = ""
    elements.statusBanner.classList.add("hidden")
    elements.statusBanner.classList.remove("error")
    return
  }

  elements.statusBanner.textContent = text
  elements.statusBanner.classList.toggle("error", Boolean(isError))
  elements.statusBanner.classList.remove("hidden")
}

function syncDimensionTabs() {
  elements.dimensionTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.dimension === elements.dimension.value)
  })
}

function syncContextSummary() {
  const config = drilldownConfig[elements.dimension.value] || drilldownConfig.sourceIP
  elements.runtimeConnectionState.textContent = state.mihomoSettings.url ? "已配置" : "待配置"
  elements.runtimeDimension.textContent = config.primaryTitle
  elements.runtimeRangeLabel.textContent = currentRangeLabel()

  if (!state.selectedPrimary) {
    elements.selectionPath.textContent = `当前维度为${config.countLabel}，等待选择主分组。`
    return
  }

  if (!state.selectedSecondary) {
    elements.selectionPath.textContent = `${config.countLabel} / ${state.selectedPrimary}`
    return
  }

  elements.selectionPath.textContent = `${config.countLabel} / ${state.selectedPrimary} / ${state.selectedSecondary}`
}

function updateViewHints() {
  const config = drilldownConfig[elements.dimension.value] || drilldownConfig.sourceIP
  const secondaryTitle = config.buildSecondaryTitle(state.selectedPrimary)
  const detailTitle = config.buildDetailTitle(state.selectedPrimary, state.selectedSecondary)

  elements.countLabel.textContent = config.countLabel
  elements.primaryTitle.textContent = config.primaryTitle
  elements.secondaryHeader.textContent = config.secondaryColumn
  elements.secondaryTitle.textContent = secondaryTitle
  elements.secondaryTitle.title = secondaryTitle
  elements.detailTitle.textContent = detailTitle
  elements.detailTitle.title = detailTitle

  syncDimensionTabs()
  syncContextSummary()
}

async function fetchJSON(path, params) {
  const url = new URL(path, window.location.origin)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(url)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

async function sendJSON(path, method, payload) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  })
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    throw new Error(errorPayload.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

function syncSettingsForm() {
  elements.settingsUrl.value = state.mihomoSettings.url || ""
  elements.settingsSecret.value = state.mihomoSettings.secret || ""
}

function syncSettingsUI() {
  const panelVisible = state.settingsOpen || state.settingsRequired
  elements.settingsPanel.classList.toggle("hidden", !panelVisible)
  elements.dashboardShell.classList.toggle("hidden", state.settingsRequired)
  elements.runtimeSummary.classList.toggle("hidden", state.settingsRequired)
  elements.settingsCancelBtn.classList.toggle("hidden", state.settingsRequired)

  if (state.settingsRequired) {
    elements.settingsTitle.textContent = "连接 Mihomo"
    elements.settingsDescription.textContent =
      "当前还没有可用的 Mihomo 连接设置。先填写 Mihomo Controller 地址和 Secret，保存后再开始采集。"
    elements.settingsSaveBtn.textContent = "保存并连接"
  } else {
    elements.settingsTitle.textContent = "更新连接设置"
    elements.settingsDescription.textContent =
      "修改后会立刻用于后续采集。下次服务重启时，如果环境变量里仍然有值，会继续以环境变量为准。"
    elements.settingsSaveBtn.textContent = "保存修改"
  }

  syncContextSummary()
}

async function loadSettings() {
  const settings = await fetchJSON("/api/settings/mihomo")
  state.mihomoSettings = {
    url: settings.url || "",
    secret: settings.secret || "",
  }
  state.settingsRequired = !state.mihomoSettings.url
  state.settingsOpen = state.settingsRequired
  syncSettingsForm()
  syncSettingsUI()
}

function openSettingsPanel() {
  state.settingsOpen = true
  syncSettingsForm()
  syncSettingsUI()
  elements.settingsUrl.focus()
}

function closeSettingsPanel() {
  if (state.settingsRequired) return
  state.settingsOpen = false
  syncSettingsForm()
  syncSettingsUI()
}

async function saveSettings(event) {
  event.preventDefault()

  const payload = {
    url: elements.settingsUrl.value.trim(),
    secret: elements.settingsSecret.value.trim(),
  }

  elements.settingsSaveBtn.disabled = true
  setStatus("正在保存 Mihomo 设置...")

  try {
    const saved = await sendJSON("/api/settings/mihomo", "PUT", payload)
    state.mihomoSettings = {
      url: saved.url || "",
      secret: saved.secret || "",
    }
    state.settingsRequired = !state.mihomoSettings.url
    state.settingsOpen = false
    syncSettingsForm()
    syncSettingsUI()
    setStatus("Mihomo 设置已保存")
    await loadData()
  } catch (error) {
    console.error(error)
    setStatus(error.message || "保存 Mihomo 设置失败", true)
  } finally {
    elements.settingsSaveBtn.disabled = false
  }
}

function renderCards(rows) {
  const upload = rows.reduce((sum, row) => sum + row.upload, 0)
  const download = rows.reduce((sum, row) => sum + row.download, 0)
  elements.countValue.textContent = String(rows.length)
  elements.uploadValue.textContent = formatBytes(upload)
  elements.downloadValue.textContent = formatBytes(download)
  elements.totalValue.textContent = formatBytes(upload + download)
}

function renderPrimaryTable(rows) {
  if (!rows.length) {
    elements.tableBody.innerHTML = '<div class="empty">当前时间范围内没有数据</div>'
    return
  }

  elements.tableBody.innerHTML = rows
    .slice(0, 120)
    .map((row, index) => {
      const active = state.selectedPrimary === row.label ? " active" : ""
      return `
        <div class="ranking-item primary-row${active}" tabindex="0" data-primary="${escapeHTML(row.label)}">
          <div class="ranking-main">
            <div class="ranking-title">
              <span class="rank">${index + 1}</span>
              <div class="mono">${renderTruncatedText(row.label, "host", "-")}</div>
            </div>
            <div class="ranking-total mono">${formatBytes(row.total)}</div>
          </div>
          <div class="ranking-metrics">
            <span>↑ ${formatBytes(row.upload)}</span>
            <span>↓ ${formatBytes(row.download)}</span>
          </div>
        </div>
      `
    })
    .join("")
}

function renderSecondaryTable(rows) {
  const filteredRows = rows.filter((row) =>
    row.label.toLowerCase().includes(state.detailSearchQuery.toLowerCase()),
  )

  if (!filteredRows.length) {
    const emptyText = state.selectedPrimary ? "当前分组下没有二级数据" : "选择左侧分组后加载"
    elements.secondaryBody.innerHTML = `<tr><td colspan="5" class="empty">${emptyText}</td></tr>`
    return
  }

  elements.secondaryBody.innerHTML = filteredRows
    .slice(0, 120)
    .map((row, index) => {
      const active = state.selectedSecondary === row.label ? " active" : ""
      return `
        <tr class="secondary-row${active}" tabindex="0" data-secondary="${escapeHTML(row.label)}">
          <td><span class="rank">${index + 1}</span></td>
          <td><div class="mono">${renderTruncatedText(row.label, "host", "-")}</div></td>
          <td>${formatBytes(row.upload)}</td>
          <td>${formatBytes(row.download)}</td>
          <td class="mono">${formatBytes(row.total)}</td>
        </tr>
      `
    })
    .join("")
}

function renderDetails(rows) {
  if (!state.selectedPrimary || !state.selectedSecondary) {
    elements.detailCards.innerHTML = '<div class="detail-empty">选择中间分组后查看链路明细</div>'
    return
  }

  if (!rows.length) {
    elements.detailCards.innerHTML = '<div class="detail-empty">当前选择下没有链路明细</div>'
    return
  }

  const cards = rows
    .slice(0, 120)
    .map((row) => {
      const chips = (row.chains || [])
        .map((item) => `<span class="chip route">${escapeHTML(item)}</span>`)
        .join("")

      return `
        <article class="detail-card">
          <div class="detail-card-head">
            <div class="detail-card-title mono">
              ${renderTruncatedText(row.destinationIP || row.outbound || "Unknown", "card-title")}
            </div>
            <div class="detail-card-total">${formatBytes(row.total)}</div>
          </div>
          <div class="detail-card-meta">
            <span title="${escapeHTML(row.sourceIP || "Inner")}">${escapeHTML(row.sourceIP || "Inner")}</span>
            <span title="${escapeHTML(row.outbound || "DIRECT")}">${escapeHTML(row.outbound || "DIRECT")}</span>
          </div>
          <div class="detail-card-meta">
            <span>↑ ${formatBytes(row.upload)}</span>
            <span>↓ ${formatBytes(row.download)}</span>
          </div>
          <div class="chips">${chips || '<span class="chip route">DIRECT</span>'}</div>
        </article>
      `
    })
    .join("")

  elements.detailCards.innerHTML = `<div class="detail-card-grid">${cards}</div>`
}

function renderTrend(points) {
  state.lastTrendPoints = points
  const canvas = elements.trendCanvas
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(320, Math.floor(rect.width || 860))
  const height = Math.max(220, Math.floor(rect.height || 260))
  canvas.width = width * dpr
  canvas.height = height * dpr

  const ctx = canvas.getContext("2d")
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const values = points.map((point) => point.upload + point.download)
  const max = Math.max(...values, 1)
  const left = 56
  const right = width - 18
  const top = 18
  const bottom = height - 28

  ctx.strokeStyle = "rgba(167, 181, 198, 0.45)"
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i += 1) {
    const y = top + ((bottom - top) / 4) * i
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(right, y)
    ctx.stroke()
  }

  ctx.fillStyle = "#748399"
  ctx.font = '12px "Segoe UI", sans-serif'
  ctx.fillText(formatBytes(max), 8, top + 4)
  ctx.fillText("0 B", 18, bottom)

  if (!points.length) return

  const linePoints = points.map((point, index) => {
    const x = left + ((right - left) * index) / Math.max(points.length - 1, 1)
    const y = bottom - ((bottom - top) * (point.upload + point.download)) / max
    return [x, y]
  })

  const areaGradient = ctx.createLinearGradient(0, top, 0, bottom)
  areaGradient.addColorStop(0, "rgba(61, 184, 255, 0.26)")
  areaGradient.addColorStop(1, "rgba(61, 184, 255, 0.02)")

  ctx.beginPath()
  linePoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = "#3db8ff"
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.lineTo(right, bottom)
  ctx.lineTo(left, bottom)
  ctx.closePath()
  ctx.fillStyle = areaGradient
  ctx.fill()
}

async function loadSecondaryRows(primaryLabel) {
  const { start, end } = getTimeRange()
  const dimension = elements.dimension.value

  if (!primaryLabel) {
    state.secondaryRows = []
    state.detailRows = []
    renderSecondaryTable([])
    renderDetails([])
    updateViewHints()
    return
  }

  let path = "/api/traffic/substats"
  let params
  if (dimension === "host") {
    path = "/api/traffic/devices-by-host"
    params = { host: primaryLabel, start, end }
  } else {
    params = { dimension, label: primaryLabel, start, end }
  }

  const rows = await fetchJSON(path, params)
  state.secondaryRows = rows
  state.selectedSecondary = rows[0]?.label || null
  renderSecondaryTable(rows)
  updateViewHints()

  if (state.selectedSecondary) {
    await loadDetails(primaryLabel, state.selectedSecondary)
  } else {
    state.detailRows = []
    renderDetails([])
    updateViewHints()
  }
}

async function loadDetails(primaryLabel, secondaryLabel) {
  const { start, end } = getTimeRange()
  const seq = ++state.detailSeq

  const rows = await fetchJSON("/api/traffic/details", {
    dimension: elements.dimension.value,
    primary: primaryLabel,
    secondary: secondaryLabel,
    start,
    end,
  })

  if (seq !== state.detailSeq) return

  state.detailRows = rows
  renderSecondaryTable(state.secondaryRows)
  renderDetails(rows)
  updateViewHints()
}

function resetDetailPanels() {
  state.selectedPrimary = null
  state.selectedSecondary = null
  state.secondaryRows = []
  state.detailRows = []
  state.detailSearchQuery = ""
  if (elements.detailSearch) elements.detailSearch.value = ""
  renderSecondaryTable([])
  renderDetails([])
  updateViewHints()
}

async function loadData() {
  if (!state.mihomoSettings.url) {
    state.settingsRequired = true
    state.settingsOpen = true
    syncSettingsUI()
    setStatus("请先填写 Mihomo URL 和 Secret", true)
    return
  }

  const { start, end } = getTimeRange()
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0 || end < start) {
    setStatus("时间范围无效", true)
    return
  }

  const seq = ++state.loadSeq
  setStatus("加载中...")
  elements.refreshBtn.disabled = true

  try {
    resetDetailPanels()

    const [rows, trend] = await Promise.all([
      fetchJSON("/api/traffic/aggregate", {
        dimension: elements.dimension.value,
        start,
        end,
      }),
      fetchJSON("/api/traffic/trend", {
        start,
        end,
        bucket: bucketSize(start, end),
      }),
    ])

    if (seq !== state.loadSeq) return

    state.primaryRows = rows
    state.selectedPrimary = rows[0]?.label || null

    renderCards(rows)
    renderPrimaryTable(rows)
    renderTrend(trend)
    updateViewHints()

    if (state.selectedPrimary) {
      await loadSecondaryRows(state.selectedPrimary)
      renderPrimaryTable(state.primaryRows)
    }

    setStatus("")
  } catch (error) {
    console.error(error)
    setStatus(error.message || "加载失败", true)
  } finally {
    elements.refreshBtn.disabled = false
  }
}

async function clearLogs() {
  if (!window.confirm("确认清空所有历史流量记录吗？")) return

  setStatus("正在清空...")
  elements.clearBtn.disabled = true

  try {
    const response = await fetch("/api/traffic/logs", { method: "DELETE" })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || "清空失败")
    }
    await loadData()
  } catch (error) {
    console.error(error)
    setStatus(error.message || "清空失败", true)
  } finally {
    elements.clearBtn.disabled = false
  }
}

elements.range.addEventListener("change", () => {
  if (Number(elements.range.value) !== -1) updateCustomInputs()
  syncContextSummary()
  loadData()
})

elements.start.addEventListener("change", () => {
  elements.range.value = "-1"
  syncContextSummary()
  loadData()
})

elements.end.addEventListener("change", () => {
  elements.range.value = "-1"
  syncContextSummary()
  loadData()
})

elements.dimensionTabs.forEach((button) => {
  button.addEventListener("click", () => {
    const nextDimension = button.dataset.dimension
    if (!nextDimension || nextDimension === elements.dimension.value) return
    elements.dimension.value = nextDimension
    updateViewHints()
    loadData()
  })
})

elements.settingsBtn.addEventListener("click", openSettingsPanel)
elements.settingsForm.addEventListener("submit", saveSettings)
elements.settingsCancelBtn.addEventListener("click", closeSettingsPanel)
elements.refreshBtn.addEventListener("click", loadData)
elements.clearBtn.addEventListener("click", clearLogs)
elements.detailSearch.addEventListener("input", (event) => {
  state.detailSearchQuery = event.target.value || ""
  renderSecondaryTable(state.secondaryRows)
})

elements.tableBody.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-primary]")
  if (!row) return
  state.selectedPrimary = row.dataset.primary
  state.selectedSecondary = null
  state.detailRows = []
  renderPrimaryTable(state.primaryRows)
  renderDetails([])
  updateViewHints()
  try {
    await loadSecondaryRows(state.selectedPrimary)
  } catch (error) {
    console.error(error)
    setStatus(error.message || "加载二级明细失败", true)
  }
})

elements.tableBody.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return
  const row = event.target.closest("[data-primary]")
  if (!row) return
  event.preventDefault()
  row.click()
})

elements.secondaryBody.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-secondary]")
  if (!row || !state.selectedPrimary) return
  state.selectedSecondary = row.dataset.secondary
  renderSecondaryTable(state.secondaryRows)
  renderDetails([])
  updateViewHints()
  try {
    await loadDetails(state.selectedPrimary, state.selectedSecondary)
  } catch (error) {
    console.error(error)
    setStatus(error.message || "加载链路明细失败", true)
  }
})

elements.secondaryBody.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return
  const row = event.target.closest("[data-secondary]")
  if (!row) return
  event.preventDefault()
  row.click()
})

window.addEventListener("resize", () => {
  renderTrend(state.lastTrendPoints)
})

async function initializeApp() {
  updateCustomInputs()
  updateViewHints()
  renderCards([])
  renderPrimaryTable([])
  renderTrend([])
  resetDetailPanels()

  try {
    await loadSettings()
    if (state.settingsRequired) {
      setStatus("请先填写 Mihomo URL 和 Secret")
      return
    }
    await loadData()
  } catch (error) {
    console.error(error)
    state.settingsRequired = true
    state.settingsOpen = true
    syncSettingsUI()
    setStatus(error.message || "加载 Mihomo 设置失败", true)
  }
}

initializeApp()
