import { Storage } from "./modules/storage";
import { UI } from "./modules/ui";
import { CONFIG } from "./modules/config";
import { Utils } from "./modules/utils";
import { API } from "./modules/api";


export const App = {
  monitorInterval: null,
  currentCity: null,
  lastTimestamp: null,

  init: async () => {
    UI.init();
    const city = Storage.getLastCity();
    await App.loadWeather(city);
  },

  startDataMonitor: (cityName, timestamp) => {
    if (App.monitorInterval) clearInterval(App.monitorInterval);
    App.currentCity = cityName;
    App.lastTimestamp = timestamp;

    App.monitorInterval = setInterval(() => {
      const age = Date.now() - App.lastTimestamp;
      if (age >= CONFIG.CACHE_EXPIRY) {
        App.loadWeather(App.currentCity, true);
      } else {
        // Re-evaluate dots based on current time
        UI.updateDataStatus(App.lastTimestamp);
      }
    }, 60000);
  },

  loadWeather: async (cityName, forceRefresh = false) => {
    // Only show full loader if not a background/silent refresh
    if (!forceRefresh) UI.showLoading();

    try {
      const { data, source, timestamp } = await API.getFullData(cityName, forceRefresh);

      Storage.addRecentSearch(data.geo.name);
      UI.renderRecentBadges();

      UI.currentForecastData = data.forecast;

      UI.renderHero(data.geo, data.current, timestamp);
      UI.renderMetrics(data.current);
      UI.renderDailyForecast(data.forecast);

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-range="today"]').classList.add('active');
      UI.renderChartAndHourly('today');

      App.startDataMonitor(data.geo.name, timestamp);

      if (forceRefresh) UI.showRefreshStatus(source);
      UI.announceStatus(`Weather loaded for ${data.geo.name}`);

    } catch (error) {
      console.error("Weather Load Error:", error);
      UI.showError(error.message === 'City not found' ? 'City not found.' : 'Network error.');
      UI.announceStatus('Failed to load weather data');
    } finally {
      UI.hideLoading();
    }
  }
};

document.addEventListener('DOMContentLoaded', App.init);
