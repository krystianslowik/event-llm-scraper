export const API_URL = 'http://localhost:3000';
export const USE_MOCK_DATA = false; // Toggle this to switch between mock and real data

export const API_CONFIG = {
  events: {
    url: `${API_URL}/events`,
    mockData: true
  },
  settings: {
    url: `${API_URL}/settings/all`,
    mockData: true
  },
  scores: {
    url: `${API_URL}/scores`,
    mockData: true
  }
};