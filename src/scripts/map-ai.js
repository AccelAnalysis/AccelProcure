import { MapboxLayer } from '@deck.gl/mapbox';
import { ScatterplotLayer, HeatmapLayer, ArcLayer, PolygonLayer } from 'deck.gl';
import { getMapLayers } from '../services/mapService.js';
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
    this.handleResize = debounce(() => this.syncTooltip(), 100);
    window.addEventListener('resize', this.handleResize);
  }

  async load(filters = {}) {
    try {
      const payload = await getMapLayers(filters);
      const normalized = normalizePayload(payload);
      this.data = normalized;
      this.renderLayers();
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
    [...this.layers.keys()].forEach((layerId) => this.removeLayer(layerId));
    this.hideTooltip();
  }
}

export function initAIOverlay(map) {
  return new MapAIOverlay(map);
}

function normalizePayload(payload) {
  if (!payload) {
    return { features: [], aiInsights: {} };
  }

  if (Array.isArray(payload)) {
    return {
      features: payload,
      aiInsights: {},
    };
  }

  const features = payload.features || payload.rfxData || [];
  const aiInsights = payload.aiInsights || payload.ai || {};

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
