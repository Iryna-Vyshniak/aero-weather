import { CONFIG } from './config.js';

export const Storage = {
  getKey: (city) => `weather_cache_${city.toLowerCase()}`,

  save: (city, data) => {
    setTimeout(() => {
      try {
        const payload = { timestamp: Date.now(), data };
        localStorage.setItem(Storage.getKey(city), JSON.stringify(payload));
        localStorage.setItem('weather_last_city', city);
      } catch (e) { console.warn('Storage quota exceeded.'); }
    }, 0);
  },

  getLastCity: () => localStorage.getItem('weather_last_city') || CONFIG.DEFAULT_CITY,

  getRaw: (city) => {
    try {
      const cached = localStorage.getItem(Storage.getKey(city));
      return cached ? JSON.parse(cached) : null;
    } catch (e) { return null; }
  },

  getRecentSearches: () => {
    try { return JSON.parse(localStorage.getItem('weather_recent_searches') || '[]'); }
    catch (e) { return []; }
  },

  addRecentSearch: (city) => {
    setTimeout(() => {
      try {
        let searches = Storage.getRecentSearches().filter(c => c.toLowerCase() !== city.toLowerCase());
        searches.unshift(city);
        if (searches.length > CONFIG.MAX_RECENT) searches.pop();
        localStorage.setItem('weather_recent_searches', JSON.stringify(searches));
      } catch (e) { console.warn('Could not save recent search.'); }
    }, 0);
  }
};