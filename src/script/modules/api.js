import { CONFIG } from './config.js';
import { Storage } from './storage.js';

export const API = {
    fetchWithTimeout: async (url, options = {}) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    },
    getCoordinates: async (city) => {
        const url = `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${CONFIG.API_KEY}`;
        const data = await API.fetchWithTimeout(url);
        if (!data || data.length === 0) throw new Error('City not found');
        return { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country };
    },
    getFullData: async (cityName, forceRefresh = false) => {
        if (!forceRefresh) {
            const cachedData = Storage.getRaw(cityName);
            if (cachedData && (Date.now() - cachedData.timestamp <= CONFIG.CACHE_EXPIRY)) {
                return { data: cachedData.data, source: 'cache', timestamp: cachedData.timestamp };
            }
        }

        const geo = await API.getCoordinates(cityName);
        const [current, forecast] = await Promise.all([
            API.fetchWithTimeout(`${CONFIG.BASE_URL}/weather?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${CONFIG.API_KEY}`),
            API.fetchWithTimeout(`${CONFIG.BASE_URL}/forecast?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${CONFIG.API_KEY}`)
        ]);

        const fullData = { geo, current, forecast };
        Storage.save(cityName, fullData);
        return { data: fullData, source: 'api', timestamp: Date.now() };
    }
};