import { supabase } from '../config/supabaseClient.js';
import httpClient from './httpClient';
import { getCurrentUser } from './authService';

const MAP_INSIGHTS_ENDPOINT = '/ai/map-insights';

/**
 * Fetches analytics data for the admin dashboard
 * @returns {Promise<Object>} Analytics data including RFX stats, user metrics, and AI performance
 */
export const getAdminAnalytics = async () => {
  try {
    // Verify admin access
    const { user } = await getCurrentUser();
    if (!user || !user.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Fetch RFX statistics
    const { data: rfxStats, error: rfxError } = await supabase
      .rpc('get_rfx_analytics');

    // Fetch user metrics
    const { data: userMetrics, error: userError } = await supabase
      .rpc('get_user_metrics');

    // Fetch AI performance metrics
    const { data: aiPerformance, error: aiError } = await supabase
      .rpc('get_ai_performance_metrics');

    if (rfxError || userError || aiError) {
      throw new Error('Failed to fetch analytics data');
    }

    return {
      rfxStats,
      userMetrics,
      aiPerformance,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in getAdminAnalytics:', error);
    throw error;
  }
};

/**
 * Fetches RFX response analytics for a specific RFX
 * @param {string} rfxId - The ID of the RFX
 * @returns {Promise<Object>} Response analytics including match scores and metrics
 */
export const getRfxResponseAnalytics = async (rfxId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_rfx_response_analytics', { rfx_id: rfxId });

    if (error) throw error;
    
    return {
      responseCount: data.length,
      averageMatchScore: calculateAverageScore(data, 'match_score'),
      averageResponseTime: calculateAverageScore(data, 'response_time_hours'),
      responsesByDay: groupResponsesByDay(data),
      responses: data
    };
  } catch (error) {
    console.error('Error in getRfxResponseAnalytics:', error);
    throw error;
  }
};

/**
 * Fetches AI model performance metrics
 * @returns {Promise<Object>} AI model accuracy and usage statistics
 */
export const getAIModelAnalytics = async () => {
  try {
    const { data, error } = await supabase
      .from('ai_model_metrics')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30); // Last 30 days

    if (error) throw error;

    return {
      models: processModelData(data),
      averageAccuracy: calculateAverageScore(data, 'accuracy'),
      totalPredictions: data.reduce((sum, item) => sum + item.prediction_count, 0)
    };
  } catch (error) {
    console.error('Error in getAIModelAnalytics:', error);
    throw error;
  }
};

export const getMapInsightSummary = async (filters = {}) =>
  httpClient.get(MAP_INSIGHTS_ENDPOINT, { params: filters });

export const getLiveMapInsightMetrics = async (filters = {}) =>
  httpClient.get(`${MAP_INSIGHTS_ENDPOINT}/metrics`, { params: filters });

// Helper functions
const calculateAverageScore = (data, field) => {
  if (!data || data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
  return parseFloat((sum / data.length).toFixed(2));
};

const groupResponsesByDay = (responses) => {
  return responses.reduce((acc, response) => {
    const date = new Date(response.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date]++;
    return acc;
  }, {});
};

const processModelData = (modelData) => {
  const models = {};
  modelData.forEach(entry => {
    if (!models[entry.model_name]) {
      models[entry.model_name] = [];
    }
    models[entry.model_name].push({
      date: entry.timestamp,
      accuracy: entry.accuracy,
      latency: entry.latency_ms,
      usage: entry.prediction_count
    });
  });
  return models;
};

// Cache layer for frequently accessed data
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getCachedAnalytics = async (key, fetchFn) => {
  const now = Date.now();
  const cached = analyticsCache.get(key);
  
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  
  const data = await fetchFn();
  analyticsCache.set(key, {
    data,
    timestamp: now
  });
  
  return data;
};

// Error handling wrapper
export const withAnalyticsErrorHandling = async (fn, errorMessage) => {
  try {
    return await fn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error);
    }
    throw new Error(errorMessage);
  }
};

// Real-time subscription for live dashboard updates
export const subscribeToAnalyticsUpdates = (callback) => {
  const subscription = supabase
    .channel('analytics_updates')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public',
        table: 'analytics_metrics'
      }, 
      (payload) => {
        // Invalidate cache when data changes
        analyticsCache.clear();
        // Notify subscribers
        if (typeof callback === 'function') {
          callback(payload);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const subscribeToMapInsightUpdates = (callback) => {
  if (!supabase) {
    return () => {};
  }

  const subscription = supabase
    .channel('map_insight_updates')
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'map_insight_metrics'
      },
      (payload) => {
        if (typeof callback === 'function') {
          callback(payload);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

// Export all functions
export default {
  getAdminAnalytics,
  getRfxResponseAnalytics,
  getAIModelAnalytics,
  getMapInsightSummary,
  getLiveMapInsightMetrics,
  getCachedAnalytics,
  subscribeToAnalyticsUpdates,
  subscribeToMapInsightUpdates,
  withAnalyticsErrorHandling
};