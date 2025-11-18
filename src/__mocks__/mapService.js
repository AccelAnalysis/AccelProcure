export const getMapLayers = jest.fn(() => Promise.resolve({
  features: [],
  aiInsights: {},
}));

export const get3DTerrainData = jest.fn(() => Promise.resolve({}));
