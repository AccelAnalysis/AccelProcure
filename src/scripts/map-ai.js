import { Deck } from '@deck.gl/core';
import { GeoJsonLayer, ArcLayer, HeatmapLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { mapbox } from './map3d';
import { getMapLayers } from '../services/mapService';
import { debounce } from '../utils/helpers';

// Configuration constants
const MAP_LAYER_IDS = {
  RFX_POINTS: 'rfx-points',
  AI_HEATMAP: 'ai-heatmap',
  AI_ARCS: 'ai-arcs',
  AI_CONFIDENCE: 'ai-confidence',
  AI_ANALYTICS: 'ai-analytics'
};

// Color scales and styling
const COLOR_SCALE = [
  [255, 255, 204],  // Light yellow
  [199, 233, 180],  // Light green
  [127, 205, 187],  // Teal
  [65, 182, 196],   // Blue
  [29, 145, 192],   // Dark blue
  [34, 94, 168],    // Navy
  [12, 44, 132]     // Dark navy
];

class AIMapLayers {
  constructor(mapInstance) {
    this.map = mapInstance;
    this.deck = null;
    this.layers = {};
    this.data = {
      rfx: null,
      heatmap: null,
      connections: [],
      confidenceZones: [],
      aiInsights: null
    };
    this.aiStream = null;
    this.lastUpdate = null;
    this.updateInterval = 30000; // 30 seconds between AI updates
    this.eventHandlers = new Map();
    
    this.initDeck();
    this.setupEventListeners();
    this.startAIStream();
  }

  // Event emitter pattern for component communication
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      for (const callback of this.eventHandlers.get(event)) {
        callback(data);
      }
    }
  }

  async startAIStream() {
    try {
      // Connect to AI streaming endpoint
      this.aiStream = new EventSource('/api/ai/mapInsights/stream');
      
      this.aiStream.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleAIUpdate(data);
      };
      
      this.aiStream.onerror = (error) => {
        console.error('AI stream error:', error);
        this.reconnectAIStream();
      };
      
    } catch (error) {
      console.error('Failed to start AI stream:', error);
      // Fallback to polling if SSE is not available
      this.setupAIPolling();
    }
  }

  setupAIPolling() {
    // Fallback polling mechanism
    const poll = async () => {
      try {
        const response = await fetch('/api/ai/mapInsights');
        const data = await response.json();
        this.handleAIUpdate(data);
      } catch (error) {
        console.error('AI polling error:', error);
      }
      setTimeout(poll, this.updateInterval);
    };
    poll();
  }

  reconnectAIStream() {
    if (this.aiStream) {
      this.aiStream.close();
    }
    setTimeout(() => this.startAIStream(), 5000);
  }

  handleAIUpdate(aiData) {
    this.lastUpdate = new Date();
    this.data.aiInsights = aiData;
    
    // Update existing data with AI insights
    if (aiData.heatmapUpdates) {
      this.updateHeatmapData(aiData.heatmapUpdates);
    }
    
    if (aiData.newConnections) {
      this.updateConnectionData(aiData.newConnections);
    }
    
    if (aiData.confidenceUpdates) {
      this.updateConfidenceZones(aiData.confidenceUpdates);
    }
    
    // Trigger UI update
    this.updateLayers();
    
    // Emit event for other components
    this.emit('aiUpdate', aiData);
  }

  updateHeatmapData(updates) {
    if (!this.data.heatmap) return;
    
    // Apply updates to heatmap data
    updates.forEach(update => {
      const existing = this.data.heatmap.find(p => 
        p.position[0] === update.position[0] && 
        p.position[1] === update.position[1]
      );
      
      if (existing) {
        existing.weight = update.weight;
      } else {
        this.data.heatmap.push(update);
      }
    });
  }

  updateConnectionData(newConnections) {
    // Merge new connections, avoiding duplicates
    newConnections.forEach(newConn => {
      const exists = this.data.connections.some(conn => 
        conn.sourcePosition[0] === newConn.sourcePosition[0] &&
        conn.sourcePosition[1] === newConn.sourcePosition[1] &&
        conn.targetPosition[0] === newConn.targetPosition[0] &&
        conn.targetPosition[1] === newConn.targetPosition[1]
      );
      
      if (!exists) {
        this.data.connections.push(newConn);
      }
    });
  }

  updateConfidenceZones(updates) {
    updates.forEach(update => {
      const existingZone = this.data.confidenceZones.find(
        z => z.id === update.id
      );
      
      if (existingZone) {
        Object.assign(existingZone, update);
      } else {
        this.data.confidenceZones.push(update);
      }
    });
  }

  initDeck() {
    this.deck = new Deck({
      canvas: 'deck-canvas',
      initialViewState: {
        longitude: -98.5795,
        latitude: 39.8283,
        zoom: 3,
        pitch: 45,
        bearing: 0
      },
      controller: true,
      onViewStateChange: ({ viewState }) => {
        this.map.jumpTo({
          center: [viewState.longitude, viewState.latitude],
          zoom: viewState.zoom,
          bearing: viewState.bearing,
          pitch: viewState.pitch
        });
      },
      layers: []
    });
  }

  async loadData(filters = {}) {
    try {
      const mapData = await getMapLayers(filters);
      this.data.rfx = mapData.features;
      this.processAIData(mapData);
      this.updateLayers();
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  }

  processAIData(mapData) {
    this.data.heatmap = this.generateHeatmapData(mapData.features);
    this.data.connections = this.generateConnections(mapData.features);
    this.data.confidenceZones = this.generateConfidenceZones(mapData.features);
  }

  generateHeatmapData(features) {
    return features.map(feature => ({
      position: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
      weight: this.calculateHeatmapWeight(feature)
    }));
  }

  calculateHeatmapWeight(feature) {
    const budgetWeight = Math.min(1, (feature.properties.budget || 0) / 1000000);
    const recencyWeight = 1 - ((new Date() - new Date(feature.properties.created_at)) / (1000 * 60 * 60 * 24 * 30));
    const confidenceWeight = feature.properties.ai_confidence || 0.5;
    return (budgetWeight * 0.4) + (recencyWeight * 0.3) + (confidenceWeight * 0.3);
  }

  generateConnections(features) {
    const connections = [];
    const byRegion = {};
    
    features.forEach(feature => {
      const region = feature.properties.region || 'global';
      if (!byRegion[region]) byRegion[region] = [];
      byRegion[region].push(feature);
    });

    Object.values(byRegion).forEach(regionFeatures => {
      if (regionFeatures.length > 1) {
        for (let i = 0; i < regionFeatures.length - 1; i++) {
          const source = regionFeatures[i].geometry.coordinates;
          const target = regionFeatures[i + 1].geometry.coordinates;
          
          connections.push({
            sourcePosition: [source[0], source[1]],
            targetPosition: [target[0], target[1]],
            value: this.calculateConnectionStrength(regionFeatures[i], regionFeatures[i + 1])
          });
        }
      }
    });

    return connections;
  }

  calculateConnectionStrength(featureA, featureB) {
    let score = 0;
    const budgetA = featureA.properties.budget || 0;
    const budgetB = featureB.properties.budget || 0;
    const budgetDiff = Math.abs(budgetA - budgetB) / Math.max(budgetA, budgetB);
    if (budgetDiff <= 0.2) score += 0.4;
    
    if (featureA.properties.region === featureB.properties.region) score += 0.3;
    
    if (featureA.properties.category && featureB.properties.category) {
      if (featureA.properties.category === featureB.properties.category) score += 0.3;
    }
    
    return Math.min(1, score);
  }

  generateConfidenceZones(features) {
    const zones = [];
    const confidenceGroups = {};
    
    features.forEach(feature => {
      const confidence = feature.properties.ai_confidence || 0;
      const level = Math.floor(confidence * 4) / 4;
      
      if (!confidenceGroups[level]) {
        confidenceGroups[level] = [];
      }
      confidenceGroups[level].push(feature);
    });
    
    Object.entries(confidenceGroups).forEach(([level, group]) => {
      if (group.length === 0) return;
      
      const coordinates = group.map(f => f.geometry.coordinates);
      const hull = this.calculateConvexHull(coordinates);
      
      if (hull.length >= 3) {
        zones.push({
          id: `zone-${level}`,
          coordinates: [hull],
          confidence: parseFloat(level)
        });
      }
    });
    
    return zones;
  }

  calculateConvexHull(points) {
    if (points.length <= 3) return points;
    
    let pivot = points[0];
    for (const p of points) {
      if (p[1] < pivot[1] || (p[1] === pivot[1] && p[0] < pivot[0])) {
        pivot = p;
      }
    }
    
    const sorted = [...points].sort((a, b) => {
      const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
      const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
      return angleA - angleB;
    });
    
    const hull = [sorted[0], sorted[1]];
    
    for (let i = 2; i < sorted.length; i++) {
      let point = sorted[i];
      
      while (hull.length >= 2) {
        const last = hull[hull.length - 1];
        const secondLast = hull[hull.length - 2];
        const cross = (point[0] - last[0]) * (secondLast[1] - last[1]) - 
                     (point[1] - last[1]) * (secondLast[0] - last[0]);
        
        if (cross <= 0) {
          hull.pop();
        } else {
          break;
        }
      }
      
      hull.push(point);
    }
    
    return hull;
  }

  updateLayers() {
    if (!this.deck || !this.data.rfx) return;
    
    const layers = [
      // RFX Points Layer
      new GeoJsonLayer({
        id: MAP_LAYER_IDS.RFX_POINTS,
        data: {
          type: 'FeatureCollection',
          features: this.data.rfx
        },
        pickable: true,
        stroked: true,
        filled: true,
        extruded: true,
        pointType: 'circle',
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: [255, 140, 0, 200],
        getLineColor: [255, 255, 255],
        getPointRadius: 100,
        getElevation: d => (d.properties.budget || 0) / 10000,
        getLineWidth: 1,
        onHover: this.handlePointHover.bind(this),
        onClick: this.handlePointClick.bind(this)
      }),
      
      // Heatmap Layer
      new HeatmapLayer({
        id: MAP_LAYER_IDS.AI_HEATMAP,
        data: this.data.heatmap,
        getPosition: d => d.position,
        getWeight: d => d.weight,
        radiusPixels: 50,
        intensity: 1,
        threshold: 0.03,
        colorRange: COLOR_SCALE,
        opacity: 0.8,
        visible: true
      }),
      
      // Connection Arcs Layer
      new ArcLayer({
        id: MAP_LAYER_IDS.AI_ARCS,
        data: this.data.connections,
        getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition,
        getSourceColor: [0, 128, 200],
        getTargetColor: [200, 0, 80],
        getWidth: d => 1 + (d.value * 3),
        getHeight: 0.5,
        getTilt: 15,
        opacity: 0.4,
        visible: true
      }),
      
      // Confidence Zones Layer
      new PolygonLayer({
        id: MAP_LAYER_IDS.AI_CONFIDENCE,
        data: this.data.confidenceZones,
        getPolygon: d => d.coordinates,
        getFillColor: d => {
          const r = Math.round(255 * (1 - d.confidence));
          const g = Math.round(255 * d.confidence);
          return [r, g, 0, 100];
        },
        getLineColor: [255, 255, 255, 150],
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        extruded: false,
        wireframe: false,
        opacity: 0.3,
        visible: true
      }),

      // AI Anomalies Layer
      ...(this.data.aiInsights?.anomalies ? [
        new ScatterplotLayer({
          id: 'ai-anomalies',
          data: this.data.aiInsights.anomalies,
          getPosition: d => d.position,
          getRadius: d => 100 + (d.severity * 50),
          getFillColor: [255, 0, 0, 200],
          getLineColor: [255, 255, 255],
          getLineWidth: 2,
          radiusMinPixels: 5,
          radiusMaxPixels: 20,
          pickable: true,
          onHover: this.handleAnomalyHover.bind(this)
        })
      ] : [])
    ];
    
    this.deck.setProps({ layers });
  }

  handlePointHover(info) {
    if (info.object) {
      const { properties } = info.object;
      const html = `
        <div class="map-tooltip">
          <h4>${properties.title || 'Untitled RFX'}</h4>
          <p>Status: ${properties.status || 'N/A'}</p>
          <p>Budget: $${(properties.budget || 0).toLocaleString()}</p>
          <p>Due: ${new Date(properties.due_date).toLocaleDateString()}</p>
          ${properties.ai_confidence ? `<p>AI Confidence: ${Math.round(properties.ai_confidence * 100)}%</p>` : ''}
        </div>
      `;
      this.showTooltip(info.x, info.y, html);
    } else {
      this.hideTooltip();
    }
  }

  handleAnomalyHover(info) {
    if (info.object) {
      const html = `
        <div class="ai-tooltip">
          <h4>AI Alert: ${info.object.type}</h4>
          <p>${info.object.message}</p>
          <p>Confidence: ${Math.round(info.object.confidence * 100)}%</p>
          <small>${new Date(info.object.timestamp).toLocaleString()}</small>
        </div>
      `;
      this.showTooltip(info.x, info.y, html);
    } else {
      this.hideTooltip();
    }
  }

  handlePointClick(info) {
    if (info.object) {
      this.emit('rfxSelected', info.object.properties.id);
    }
  }

  showTooltip(x, y, html) {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) {
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
    }
  }

  hideTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  setupEventListeners() {
    this.handleResize = debounce(() => {
      if (this.deck) {
        this.deck.setProps({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    }, 250);

    this.handleMapMove = () => {
      if (this.deck) {
        const { lng, lat } = this.map.getCenter();
        this.deck.setProps({
          viewState: {
            longitude: lng,
            latitude: lat,
            zoom: this.map.getZoom(),
            pitch: this.map.getPitch(),
            bearing: this.map.getBearing()
          }
        });
      }
    };

    window.addEventListener('resize', this.handleResize);
    this.map.on('move', this.handleMapMove);
  }

  setFilters(filters) {
    this.loadData(filters);
  }

  toggleLayer(layerId, visible) {
    if (this.layers[layerId]) {
      this.layers[layerId].setProps({ visible });
    }
  }

  destroy() {
    if (this.aiStream) {
      this.aiStream.close();
      this.aiStream = null;
    }

    if (this.deck) {
      this.deck.finalize();
      this.deck = null;
    }
    
    window.removeEventListener('resize', this.handleResize);
    if (this.map) {
      this.map.off('move', this.handleMapMove);
    }
  }
}

// Export a singleton instance
export let aiMapLayers = null;

export function initAIMapLayers(mapInstance) {
  if (!aiMapLayers) {
    aiMapLayers = new AIMapLayers(mapInstance);
  }
  return aiMapLayers;
}

export function getAIMapLayers() {
  return aiMapLayers;
}

export function destroyAIMapLayers() {
  if (aiMapLayers) {
    aiMapLayers.destroy();
    aiMapLayers = null;
  }
}

export default AIMapLayers;