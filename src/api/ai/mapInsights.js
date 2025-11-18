import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';

export default async function handler(req, res) {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Initialize OpenAI
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    // 1. Fetch RFX data with geospatial information
    const { data: rfxData, error: rfxError } = await supabase
      .from('rfx_opportunities')
      .select(`
        id,
        title,
        description,
        deadline,
        budget,
        location,
        coordinates,
        created_at,
        status,
        category,
        requirements
      `)
      .not('coordinates', 'is', null);

    if (rfxError) throw rfxError;

    // 2. Fetch profile data for matching
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        company_name,
        capabilities,
        past_performance,
        location,
        coordinates,
        naics_codes,
        certifications
      `)
      .not('coordinates', 'is', null);

    if (profilesError) throw profilesError;

    // 3. Generate AI-powered insights for each RFX
    const insights = await Promise.all(
      rfxData.map(async (rfx) => {
        // Find relevant profiles based on location and basic criteria
        const relevantProfiles = profilesData.filter(profile => {
          // Simple distance calculation (in miles)
          const distance = calculateDistance(
            rfx.coordinates.lat, 
            rfx.coordinates.lng,
            profile.coordinates.lat,
            profile.coordinates.lng
          );
          
          // Filter profiles within 100 miles
          return distance <= 100;
        });

        // Generate AI analysis for this RFX
        const analysis = await analyzeRfxWithAI(rfx, relevantProfiles, openai);
        
        // Calculate weighted score based on AI analysis
        const weightedScore = calculateWeightedScore(analysis);

        return {
          id: rfx.id,
          coordinates: rfx.coordinates,
          properties: {
            title: rfx.title,
            category: rfx.category,
            matchQuality: weightedScore,
            confidence: analysis.confidence,
            recommendedAction: analysis.recommendedAction,
            keyFactors: analysis.keyFactors,
            lastUpdated: new Date().toISOString()
          }
        };
      })
    );

    // 4. Cluster nearby points for better visualization
    const clusteredInsights = clusterPoints(insights, 0.1); // 0.1 degree clustering

    res.status(200).json({
      success: true,
      data: {
        type: 'FeatureCollection',
        features: clusteredInsights.map(insight => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [insight.coordinates.lng, insight.coordinates.lat]
          },
          properties: insight.properties
        }))
      }
    });

  } catch (error) {
    console.error('Error generating map insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate map insights',
      details: error.message
    });
  }
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// AI-powered analysis of RFX and matching profiles
async function analyzeRfxWithAI(rfx, profiles, openai) {
  try {
    // Prepare context for AI analysis
    const context = {
      rfxSummary: {
        title: rfx.title,
        description: rfx.description,
        requirements: rfx.requirements,
        category: rfx.category
      },
      profileCount: profiles.length,
      sampleProfiles: profiles.slice(0, 3).map(p => ({
        company: p.company_name,
        capabilities: p.capabilities,
        certifications: p.certifications
      }))
    };

    // Call OpenAI API for analysis
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a government contracting expert analyzing RFX opportunities. 
          Provide a concise analysis of the RFX and its match quality with nearby vendors.`
        },
        {
          role: "user",
          content: `Analyze this RFX and vendor matches: ${JSON.stringify(context, null, 2)}
          
          Provide:
          1. Confidence score (0-100) in match quality
          2. Recommended action (e.g., 'Strong Match', 'Moderate Fit', 'Poor Fit')
          3. 3 key factors affecting match quality
          
          Format as JSON with keys: confidence, recommendedAction, keyFactors`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    // Parse AI response
    const content = response.data.choices[0].message.content;
    return JSON.parse(content);

  } catch (error) {
    console.error('AI analysis failed:', error);
    // Return default values if AI fails
    return {
      confidence: 50,
      recommendedAction: 'Needs Review',
      keyFactors: ['Insufficient data for analysis']
    };
  }
}

// Calculate weighted score based on AI analysis
function calculateWeightedScore(analysis) {
  // Base score on confidence
  let score = analysis.confidence / 100;
  
  // Adjust based on recommended action
  const actionWeights = {
    'Strong Match': 1.2,
    'Good Fit': 1.0,
    'Moderate Fit': 0.7,
    'Needs Review': 0.5,
    'Poor Fit': 0.3
  };
  
  return score * (actionWeights[analysis.recommendedAction] || 0.5);
}

// Simple clustering algorithm for nearby points
function clusterPoints(points, clusterRadius) {
  const clusters = [];
  const processed = new Set();
  
  points.forEach((point, index) => {
    if (processed.has(index)) return;
    
    const cluster = {
      coordinates: { ...point.coordinates },
      properties: {
        ...point.properties,
        count: 1,
        ids: [point.id],
        // Average the scores for clustered points
        matchQuality: point.properties.matchQuality,
        // Take the highest confidence
        confidence: point.properties.confidence
      }
    };
    
    // Find nearby points
    for (let i = index + 1; i < points.length; i++) {
      if (processed.has(i)) continue;
      
      const dist = calculateDistance(
        point.coordinates.lat,
        point.coordinates.lng,
        points[i].coordinates.lat,
        points[i].coordinates.lng
      );
      
      if (dist <= clusterRadius * 50) { // Convert degrees to approximate miles
        // Average the coordinates (weighted by match quality)
        const totalWeight = cluster.properties.matchQuality * cluster.properties.count + 
                          points[i].properties.matchQuality;
                          
        cluster.coordinates.lat = (cluster.coordinates.lat * cluster.properties.count * cluster.properties.matchQuality + 
                                 points[i].coordinates.lat * points[i].properties.matchQuality) / 
                                (cluster.properties.count * cluster.properties.matchQuality + points[i].properties.matchQuality);
                                
        cluster.coordinates.lng = (cluster.coordinates.lng * cluster.properties.count * cluster.properties.matchQuality + 
                                 points[i].coordinates.lng * points[i].properties.matchQuality) / 
                                (cluster.properties.count * cluster.properties.matchQuality + points[i].properties.matchQuality);
        
        // Update cluster properties
        cluster.properties.count += 1;
        cluster.properties.ids.push(points[i].id);
        cluster.properties.matchQuality = (cluster.properties.matchQuality * (cluster.properties.count - 1) + 
                                         points[i].properties.matchQuality) / cluster.properties.count;
        cluster.properties.confidence = Math.max(
          cluster.properties.confidence, 
          points[i].properties.confidence
        );
        
        processed.add(i);
      }
    }
    
    clusters.push(cluster);
    processed.add(index);
  });
  
  return clusters;
}