import { MapboxLayer } from '@deck.gl/mapbox';
import { ScatterplotLayer, HeatmapLayer, ArcLayer, PolygonLayer } from 'deck.gl';
import { getMapLayers } from '../services/mapService.js';
import {
  getMapInsightSummary,
  getLiveMapInsightMetrics,
  subscribeToMapInsightUpdates,
} from '../services/analyticsService.js';
import { formatCurrency, formatRelativeTime, debounce } from './shared.js';

const LAYER_IDS = {
  RFX_POINTS: 'deck-rfx-points',
  AI_HEATMAP: 'deck-ai-heatmap',
  AI_CONNECTIONS: 'deck-ai-connections',
  AI_CONFIDENCE: 'deck-ai-confidence',
  AI_ANOMALIES: 'deck-ai-anomalies',
};

export class MapAIOverlay {
  constructor(map) {
    this.map = map;
    this.layers = new Map();
    this.data = { features: [], aiInsights: {} };
    this.filters = {};
    this.liveMetrics = null;
    this.panelElements = null;
    this.metricsElements = null;
    this.unsubscribeRealtime = null;
    this.handleRefreshClick = () => this.load(this.filters);
    this.handleMetricRefresh = () => this.refreshLiveMetrics(this.filters);
    this.handleResize = debounce(() => this.syncTooltip(), 100);
    window.addEventListener('resize', this.handleResize);
    this.ensurePanels();
  }

  async load(filters = {}) {
    try {
      this.filters = filters;
      const [payload, insightSummary] = await Promise.all([
        getMapLayers(filters),
        getMapInsightSummary(filters),
      ]);
      const normalized = normalizePayload(payload, insightSummary?.overlays);
      this.data = normalized;
      this.renderLayers();
      this.renderInsightSummary(insightSummary);
      this.renderLiveMetrics(insightSummary?.metrics);
      await this.refreshLiveMetrics(filters);
    } catch (error) {
      console.error('Failed to load AI map layers', error);
    }
  }

  renderLayers() {
    const tooltipHandlers = {
      onHover: (info) => this.handleHover(info),
      onClick: (info) => this.handleClick(info),
    };

    const pointLayer = new MapboxLayer({
      id: LAYER_IDS.RFX_POINTS,
      type: ScatterplotLayer,
      data: this.data.features,
      pickable: true,
      filled: true,
      radiusMinPixels: 5,
      radiusMaxPixels: 35,
      getPosition: (d) => d.geometry.coordinates,
      getRadius: (d) => 4 + Math.log((d.properties?.budget || 1)) * 2,
      getFillColor: (d) => getStatusColor(d.properties?.status),
      getLineColor: [255, 255, 255],
      getLineWidth: 1,
      ...tooltipHandlers,
    });

    this.addLayer(pointLayer);

    if (this.data.aiInsights.heatmap?.length) {
      this.addLayer(
        new MapboxLayer({
          id: LAYER_IDS.AI_HEATMAP,
          type: HeatmapLayer,
          data: this.data.aiInsights.heatmap,
          getPosition: (d) => [d.lng, d.lat],
          getWeight: (d) => d.intensity || d.weight || 0.2,
          radiusPixels: 40,
          intensity: 1,
          threshold: 0.05,
        }),
      );
    } else {
      this.removeLayer(LAYER_IDS.AI_HEATMAP);
    }

    if (this.data.aiInsights.connections?.length) {
      this.addLayer(
        new MapboxLayer({
          id: LAYER_IDS.AI_CONNECTIONS,
          type: ArcLayer,
          data: this.data.aiInsights.connections,
          getSourcePosition: (d) => d.sourcePosition,
          getTargetPosition: (d) => d.targetPosition,
          getSourceColor: [59, 130, 246, 180],
          getTargetColor: [249, 115, 22, 180],
          getWidth: (d) => 1 + (d.weight || 0.5) * 3,
          greatCircle: true,
          pickable: false,
        }),
      );
    } else {
      this.removeLayer(LAYER_IDS.AI_CONNECTIONS);
    }

    if (this.data.aiInsights.confidenceZones?.length) {
      this.addLayer(
        new MapboxLayer({
          id: LAYER_IDS.AI_CONFIDENCE,
          type: PolygonLayer,
          data: this.data.aiInsights.confidenceZones,
          getPolygon: (d) => d.coordinates,
          stroked: true,
          filled: true,
          getLineColor: [148, 163, 184, 160],
          getFillColor: (d) => {
            const intensity = Math.min(1, Math.max(0, d.confidence || 0.2));
            return [56, 189, 248, intensity * 80 + 20];
          },
          lineWidthMinPixels: 1,
          pickable: false,
        }),
      );
    } else {
      this.removeLayer(LAYER_IDS.AI_CONFIDENCE);
    }

    if (this.data.aiInsights.anomalies?.length) {
      this.addLayer(
        new MapboxLayer({
          id: LAYER_IDS.AI_ANOMALIES,
          type: ScatterplotLayer,
          data: this.data.aiInsights.anomalies,
          pickable: true,
          getPosition: (d) => d.position,
          getRadius: (d) => 6 + (d.severity || 0.5) * 4,
          getFillColor: [239, 68, 68, 220],
          getLineColor: [255, 255, 255],
          getLineWidth: 1,
          onHover: (info) => this.handleAnomalyHover(info),
        }),
      );
    } else {
      this.removeLayer(LAYER_IDS.AI_ANOMALIES);
    }
  }

  ensurePanels() {
    if (!this.map?.getContainer) {
      return;
    }
    const container = this.map.getContainer();
    if (!container) {
      return;
    }

    let panel = container.querySelector('.map-ai-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'map-ai-panel map-overlay';
      panel.innerHTML = `
        <header>
          <div>
            <p class="kicker">AI summary</p>
            <h3>Live Map Insights</h3>
          </div>
          <button type="button" data-insight-refresh aria-label="Refresh insights">Refresh</button>
        </header>
        <p class="text-xs text-secondary" data-insight-updated>Connecting…</p>
        <div data-insight-summary class="text-sm text-secondary">AI analysis will populate shortly.</div>
        <ul class="insight-list" data-insight-bullets></ul>
      `;
      container.appendChild(panel);
    }

    const refreshBtn = panel.querySelector('[data-insight-refresh]');
    if (refreshBtn) {
      refreshBtn.removeEventListener('click', this.handleRefreshClick);
      refreshBtn.addEventListener('click', this.handleRefreshClick);
    }

    this.panelElements = {
      panel,
      summary: panel.querySelector('[data-insight-summary]'),
      bullets: panel.querySelector('[data-insight-bullets]'),
      updated: panel.querySelector('[data-insight-updated]'),
      refresh: refreshBtn,
    };

    let metricsPanel = container.querySelector('.map-metrics-panel');
    if (!metricsPanel) {
      metricsPanel = document.createElement('div');
      metricsPanel.className = 'map-metrics-panel map-overlay';
      metricsPanel.style.top = 'auto';
      metricsPanel.style.bottom = '24px';
      metricsPanel.innerHTML = `
        <header>
          <div>
            <p class="kicker">Live metrics</p>
            <h3>Map Signals</h3>
          </div>
          <button type="button" data-metrics-refresh aria-label="Refresh metrics">Sync</button>
        </header>
        <p class="text-xs text-secondary" data-metrics-updated>Awaiting telemetry…</p>
        <div class="map-metrics-grid" data-metrics-grid></div>
      `;
      container.appendChild(metricsPanel);
    }

    const metricsRefresh = metricsPanel.querySelector('[data-metrics-refresh]');
    if (metricsRefresh) {
      metricsRefresh.removeEventListener('click', this.handleMetricRefresh);
      metricsRefresh.addEventListener('click', this.handleMetricRefresh);
    }

    this.metricsElements = {
      panel: metricsPanel,
      grid: metricsPanel.querySelector('[data-metrics-grid]'),
      updated: metricsPanel.querySelector('[data-metrics-updated]'),
      refresh: metricsRefresh,
    };
  }

  renderInsightSummary(payload) {
    if (!this.panelElements?.summary) {
      return;
    }
    if (!payload) {
      this.panelElements.summary.textContent = 'AI analysis will populate shortly.';
      this.panelElements.bullets.innerHTML = '';
      if (this.panelElements.updated) {
        this.panelElements.updated.textContent = 'Awaiting telemetry…';
      }
      return;
    }

    const summaryText = payload.summary?.text || 'AI is analysing the current scope.';
    this.panelElements.summary.textContent = summaryText;
    const bullets = payload.summary?.bullets || [];
    if (bullets.length) {
      this.panelElements.bullets.innerHTML = bullets.map((item) => `<li>${item}</li>`).join('');
    } else {
      this.panelElements.bullets.innerHTML = '<li>Signals are being processed…</li>';
    }

    if (this.panelElements.updated) {
      const provider = (payload.summary?.provider || 'system').toUpperCase();
      const timestamp = payload.generatedAt || payload.overlays?.updatedAt;
      const readableTime = timestamp ? formatRelativeTime(timestamp) : 'moments ago';
      this.panelElements.updated.textContent = `Generated ${readableTime} · ${provider}`;
    }
  }

  renderLiveMetrics(metrics, { loading = false, error } = {}) {
    if (!this.metricsElements?.grid) {
      return;
    }

    if (loading) {
      this.metricsElements.grid.innerHTML = '<p class="text-sm text-secondary">Loading live metrics…</p>';
      return;
    }

    if (error) {
      this.metricsElements.grid.innerHTML = `<p class="text-sm text-secondary">${error}</p>`;
      return;
    }

    if (!metrics) {
      this.metricsElements.grid.innerHTML = '<p class="text-sm text-secondary">Waiting for AI telemetry…</p>';
      return;
    }

    const dataset = [
      {
        label: 'Active RFx',
        value: formatNumber(metrics?.totals?.activeRfx),
        trend: metrics?.trend?.activeRfx,
      },
      {
        label: 'Open Opps',
        value: formatNumber(metrics?.totals?.openOpportunities),
        trend: metrics?.trend?.openOpportunities,
      },
      {
        label: 'Vendor Coverage',
        value: formatPercent(metrics?.totals?.vendorCoverage),
        trend: metrics?.trend?.vendorCoverage,
      },
      {
        label: 'Anomaly Alerts',
        value: formatNumber(metrics?.totals?.anomalies),
        trend: metrics?.trend?.anomalies,
      },
    ];

    this.metricsElements.grid.innerHTML = dataset
      .map(
        (item) => `
          <div class="map-metric">
            <small>${item.label}</small>
            <strong>${item.value}</strong>
            <span class="metric-trend ${getTrendClass(item.trend)}">
              ${getTrendLabel(item.trend)}
            </span>
          </div>
        `,
      )
      .join('');

    if (this.metricsElements.updated) {
      const timestamp = metrics.updatedAt || new Date().toISOString();
      this.metricsElements.updated.textContent = `Updated ${formatRelativeTime(timestamp)}`;
    }
  }

  async refreshLiveMetrics(filters = this.filters) {
    if (!this.metricsElements) {
      return;
    }
    this.renderLiveMetrics(null, { loading: true });
    try {
      const metrics = await getLiveMapInsightMetrics(filters);
      this.liveMetrics = metrics;
      this.renderLiveMetrics(metrics);
      this.setupRealtimeSubscription();
    } catch (error) {
      console.error('Failed to load live map metrics', error);
      this.renderLiveMetrics(null, { error: 'Unable to load live metrics' });
    }
  }

  setupRealtimeSubscription() {
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
      this.unsubscribeRealtime = null;
    }

    this.unsubscribeRealtime = subscribeToMapInsightUpdates((payload) => {
      if (!payload) {
        return;
      }
      const nextMetrics = mergeMetricsPayload(this.liveMetrics, payload.new || payload);
      this.liveMetrics = nextMetrics;
      this.renderLiveMetrics(this.liveMetrics);
    });
  }

  addLayer(layer) {
    if (this.map.getLayer(layer.id)) {
      this.map.removeLayer(layer.id);
    }
    this.layers.set(layer.id, layer);
    this.map.addLayer(layer);
  }

  removeLayer(layerId) {
    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId);
    }
    this.layers.delete(layerId);
  }

  handleHover(info) {
    if (!info?.object) {
      this.hideTooltip();
      return;
    }

    const { properties } = info.object;
    const html = `
      <strong>${properties?.title || properties?.name || 'Opportunity'}</strong><br />
      ${properties?.status ? `<span>Status: ${properties.status}</span><br />` : ''}
      ${properties?.budget ? `<span>Budget: ${formatCurrency(properties.budget)}</span><br />` : ''}
      ${properties?.due_date ? `<span>Due: ${formatRelativeTime(properties.due_date, { forceAbsolute: true })}</span>` : ''}
    `;
    this.showTooltip(info.x, info.y, html);
  }

  handleClick(info) {
    if (info?.object?.properties?.id) {
      document.dispatchEvent(
        new CustomEvent('rfx:selected', { detail: { id: info.object.properties.id } }),
      );
    }
  }

  handleAnomalyHover(info) {
    if (!info?.object) {
      this.hideTooltip();
      return;
    }

    const html = `
      <strong>AI Alert</strong><br />
      ${info.object.message || 'Pattern shift detected'}<br />
      Confidence: ${(info.object.confidence || 0.5) * 100}%
    `;
    this.showTooltip(info.x, info.y, html);
  }

  showTooltip(x, y, html) {
    const tooltip = document.getElementById('map-tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.style.left = `${x + 12}px`;
    tooltip.style.top = `${y + 12}px`;
    tooltip.classList.remove('hidden');
  }

  syncTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (!tooltip) return;
    if (tooltip.classList.contains('hidden')) {
      tooltip.style.left = '0px';
      tooltip.style.top = '0px';
    }
  }

  hideTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) {
      tooltip.classList.add('hidden');
    }
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    this.panelElements?.refresh?.removeEventListener('click', this.handleRefreshClick);
    this.metricsElements?.refresh?.removeEventListener('click', this.handleMetricRefresh);
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
      this.unsubscribeRealtime = null;
    }
    [...this.layers.keys()].forEach((layerId) => this.removeLayer(layerId));
    this.hideTooltip();
  }
}

export function initAIOverlay(map) {
  return new MapAIOverlay(map);
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return value;
  }
  if (number >= 1000) {
    return `${Math.round(number).toLocaleString()}`;
  }
  return `${Math.round(number)}`;
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return value;
  }
  return `${number.toFixed(1)}%`;
}

function getTrendClass(value) {
  if (Number(value) > 0.1) return 'positive';
  if (Number(value) < -0.1) return 'negative';
  return 'neutral';
}

function getTrendLabel(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  const number = Number(value);
  if (Number.isNaN(number) || Math.abs(number) < 0.1) {
    return 'Flat';
  }
  const direction = number > 0 ? 'Up' : 'Down';
  return `${direction} ${Math.abs(number).toFixed(1)}%`;
}

function mergeMetricsPayload(current = {}, incoming = {}) {
  const totals = incoming.totals || incoming.metrics || {};
  return {
    ...current,
    region: incoming.region || current.region,
    updatedAt: incoming.updatedAt || incoming.updated_at || incoming.captured_at || new Date().toISOString(),
    totals: {
      ...(current?.totals || {}),
      ...totals,
      activeRfx: totals.activeRfx ?? incoming.active_rfx ?? current?.totals?.activeRfx ?? 0,
      openOpportunities:
        totals.openOpportunities ?? incoming.open_opportunities ?? current?.totals?.openOpportunities ?? 0,
      vendorCoverage: totals.vendorCoverage ?? incoming.vendor_coverage ?? current?.totals?.vendorCoverage ?? 0,
      anomalies: totals.anomalies ?? incoming.anomaly_count ?? current?.totals?.anomalies ?? 0,
    },
    trend: {
      ...(current?.trend || {}),
      ...(incoming.trend || incoming.trends || {}),
    },
    hotspots: incoming.hotspots || current?.hotspots || [],
    alerts: incoming.alerts || current?.alerts || [],
  };
}

function normalizePayload(payload, overlays) {
  if (!payload) {
    return { features: overlays?.features || [], aiInsights: overlays?.aiInsights || {} };
  }

  if (Array.isArray(payload)) {
    return {
      features: payload,
      aiInsights: overlays?.aiInsights || {},
    };
  }

  const features = overlays?.features || payload.features || payload.rfxData || [];
  const aiInsights = {
    ...(payload.aiInsights || payload.ai || {}),
    ...(overlays?.aiInsights || {}),
  };

  return { features, aiInsights };
}

function getStatusColor(status = '') {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'open':
      return [59, 130, 246, 220];
    case 'awarded':
      return [34, 197, 94, 220];
    case 'closed':
      return [148, 163, 184, 220];
    case 'draft':
      return [249, 115, 22, 220];
    default:
      return [129, 140, 248, 220];
  }
}
