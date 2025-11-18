import { getSupabaseClient } from '../utils/supabaseClient.js';
import { getOpenAiClient } from '../utils/openaiClient.js';

const DEFAULT_REGION = 'global';
const CACHE_TTL = 60 * 1000; // 1 minute
const cacheStore = new Map();

const withCache = async (key, loader) => {
  const cached = cacheStore.get(key);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await loader();
  cacheStore.set(key, { data, timestamp: now });
  return data;
};

const fetchLayerSnapshot = async (supabase, region) => {
  const { data, error } = await supabase
    .from('map_layers')
    .select('region, updated_at, features, ai_insights, hotspots, metrics')
    .eq('region', region)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? {};
};

const fetchMetricSnapshot = async (supabase, region) => {
  const { data, error } = await supabase
    .from('map_insight_metrics')
    .select('*')
    .eq('region', region)
    .order('captured_at', { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  return normalizeMetrics(data);
};

const normalizeMetrics = (rows = []) => {
  const latest = rows[0] ?? {};
  const baseTotals = latest.totals || latest.metrics || {};
  const hotspots = latest.hotspots || baseTotals.hotspots || [];
  return {
    region: latest.region || DEFAULT_REGION,
    updatedAt: latest.captured_at || latest.updated_at || new Date().toISOString(),
    totals: {
      activeRfx: baseTotals.activeRfx ?? latest.active_rfx ?? 0,
      openOpportunities: baseTotals.openOpportunities ?? latest.open_opportunities ?? 0,
      vendorCoverage: baseTotals.vendorCoverage ?? latest.vendor_coverage ?? 0,
      anomalies: baseTotals.anomalies ?? latest.anomaly_count ?? 0,
    },
    trend: latest.trend || latest.trends || {},
    hotspots,
    alerts: latest.alerts || [],
  };
};

const normalizeOverlayPayload = (layerRow = {}, metrics = {}) => {
  const aiPayload = layerRow.ai_insights || layerRow.aiInsights || {};
  const normalizedInsights = {
    heatmap: aiPayload.heatmap || metrics.hotspots || [],
    connections: aiPayload.connections || aiPayload.routes || [],
    confidenceZones: aiPayload.confidenceZones || aiPayload.confidence_zones || [],
    anomalies: aiPayload.anomalies || metrics.alerts || [],
  };

  return {
    features: layerRow.features || layerRow.rfxData || [],
    aiInsights: normalizedInsights,
    hotspots: layerRow.hotspots || metrics.hotspots || [],
    updatedAt: layerRow.updated_at || new Date().toISOString(),
  };
};

const buildSummary = async ({ region, overlays, metrics }) => {
  const openai = getOpenAiClient();
  const fallback = {
    text: `Region ${region} has ${metrics?.totals?.activeRfx ?? 0} active RFx and ${metrics?.hotspots?.length ?? 0} heat spots tracked in real time.`,
    bullets: [
      `${metrics?.totals?.openOpportunities ?? 0} open opportunities`,
      `${metrics?.totals?.vendorCoverage ?? 0}% vendor coverage`,
      `${metrics?.totals?.anomalies ?? 0} anomaly alerts in queue`,
    ],
    provider: 'system',
  };

  if (!openai) {
    return fallback;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You summarize procurement geospatial telemetry into short actionable bullets.',
        },
        {
          role: 'user',
          content: `Region: ${region}\nTotals: ${JSON.stringify(metrics?.totals || {})}\nHotspots: ${JSON.stringify(metrics?.hotspots || [])}\nAnomalies: ${JSON.stringify(overlays?.aiInsights?.anomalies || [])}\nProvide 3 short bullet points and a one sentence overview.`,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return fallback;
    }

    const lines = content.split('\n').filter(Boolean);
    const text = lines[0].replace(/^[-•\s]+/, '');
    const bullets = lines.slice(1).map((line) => line.replace(/^[-•\s]+/, '')).slice(0, 3);

    return {
      text,
      bullets: bullets.length ? bullets : fallback.bullets,
      provider: 'openai',
    };
  } catch (error) {
    console.error('AI summary failed', error);
    return fallback;
  }
};

export const mapInsightsHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const region = req.query.region || DEFAULT_REGION;

  try {
    const [metrics, layerSnapshot] = await Promise.all([
      withCache(`metrics:${region}`, () => fetchMetricSnapshot(supabase, region)),
      withCache(`layers:${region}`, () => fetchLayerSnapshot(supabase, region)),
    ]);

    const overlays = normalizeOverlayPayload(layerSnapshot, metrics);
    const summary = await buildSummary({ region, overlays, metrics });

    return res.status(200).json({
      region,
      generatedAt: new Date().toISOString(),
      overlays,
      metrics,
      summary,
    });
  } catch (error) {
    console.error('Map insights error:', error);
    return res.status(500).json({ error: 'Unable to generate map insights' });
  }
};

export const mapInsightMetricsHandler = async (req, res) => {
  const supabase = getSupabaseClient();
  const region = req.query.region || DEFAULT_REGION;

  try {
    const metrics = await withCache(`metrics:${region}`, () => fetchMetricSnapshot(supabase, region));
    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Map insight metrics error:', error);
    return res.status(500).json({ error: 'Unable to load map insight metrics' });
  }
};

export default mapInsightsHandler;
