import Chart from 'chart.js/auto';

import { Storage } from './storage.js';
import { Utils } from './utils.js';
import { App } from '../main.js';

export const UI = {
    chartInstance: null,
    currentForecastData: null,
    statusTimeout: null,

    init: () => {
        UI.setupEventListeners();
        UI.renderRecentBadges();
    },

    setupEventListeners: () => {
        const form = document.getElementById('search-form');
        const input = document.getElementById('search-input');
        const badgesList = document.getElementById('recent-badges-list');
        const recentDropdown = document.getElementById('recent-searches');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = input.value.trim();
            if (query) {
                input.blur();
                recentDropdown.classList.add('hidden');
                input.setAttribute('aria-expanded', 'false');
                await App.loadWeather(query);
                input.value = '';
            }
        });

        // Dropdown interactions
        input.addEventListener('focus', () => {
            UI.renderRecentSearchesDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                recentDropdown.classList.add('hidden');
                input.setAttribute('aria-expanded', 'false');
            }
        });

        recentDropdown.addEventListener('click', async (e) => {
            const li = e.target.closest('li[role="option"]');
            if (li) {
                const city = li.dataset.city;
                input.value = city;
                recentDropdown.classList.add('hidden');
                input.setAttribute('aria-expanded', 'false');
                await App.loadWeather(city);
                input.value = '';
            }
        });

        // Delegate badge clicks
        badgesList.addEventListener('click', async (e) => {
            const btn = e.target.closest('.badge-btn');
            if (btn) {
                await App.loadWeather(btn.dataset.city);
            }
        });

        // Refresh logic
        document.getElementById('refresh-btn').addEventListener('click', async (e) => {
            const currentCity = document.getElementById('current-city').textContent.split(',')[0];
            if (currentCity && currentCity !== 'Loading...') {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.classList.add('spinning');
                await App.loadWeather(currentCity, true);
                setTimeout(() => {
                    btn.classList.remove('spinning');
                    btn.disabled = false;
                }, 500);
            }
        });

        // Tabs logic
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                UI.renderChartAndHourly(e.target.dataset.range);
            });
        });

        // Slider Navigation Events
        const hourlyContainer = document.getElementById('hourly-container');
        document.getElementById('slider-prev').addEventListener('click', () => {
            hourlyContainer.scrollBy({ left: -250, behavior: 'smooth' });
        });
        document.getElementById('slider-next').addEventListener('click', () => {
            hourlyContainer.scrollBy({ left: 250, behavior: 'smooth' });
        });
        hourlyContainer.addEventListener('scroll', () => {
            requestAnimationFrame(UI.updateSliderNavigation);
        });
    },

    updateSliderNavigation: () => {
        const container = document.getElementById('hourly-container');
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');

        if (!container || !prevBtn || !nextBtn) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;

        if (scrollLeft > 5) {
            prevBtn.classList.add('visible');
        } else {
            prevBtn.classList.remove('visible');
        }

        if (Math.ceil(scrollLeft) + clientWidth < scrollWidth - 5) {
            nextBtn.classList.add('visible');
        } else {
            nextBtn.classList.remove('visible');
        }
    },

    showLoading: () => document.getElementById('loader').classList.remove('hidden'),
    hideLoading: () => document.getElementById('loader').classList.add('hidden'),

    announceStatus: (msg) => document.getElementById('live-announcer').textContent = msg,

    showError: (msg) => {
        const toast = document.getElementById('error-toast');
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 4000);
    },

    showRefreshStatus: (source) => {
        const statusEl = document.getElementById('refresh-status');
        if (UI.statusTimeout) clearTimeout(UI.statusTimeout);

        const checkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block; vertical-align:middle; margin-right:4px; margin-top:-2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        statusEl.innerHTML = source === 'cache'
            ? `${checkIcon} Cached data`
            : `${checkIcon} Refreshed data`;

        statusEl.classList.remove('hidden');

        UI.statusTimeout = setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
    },

    renderRecentBadges: () => {
        const searches = Storage.getRecentSearches();
        const list = document.getElementById('recent-badges-list');

        list.innerHTML = '';
        if (searches.length === 0) return;

        const fragment = document.createDocumentFragment();
        searches.forEach(city => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'badge-btn';
            btn.dataset.city = city;
            btn.textContent = city;
            btn.setAttribute('aria-label', `Load weather for ${city}`);

            li.appendChild(btn);
            fragment.appendChild(li);
        });
        list.appendChild(fragment);
    },

    renderRecentSearchesDropdown: () => {
        const searches = Storage.getRecentSearches();
        const list = document.getElementById('recent-searches');
        const input = document.getElementById('search-input');

        if (searches.length === 0) {
            list.classList.add('hidden');
            input.setAttribute('aria-expanded', 'false');
            return;
        }

        list.innerHTML = '';
        const fragment = document.createDocumentFragment();
        searches.forEach(city => {
            const li = document.createElement('li');
            li.className = 'recent-search-item';
            li.setAttribute('role', 'option');
            li.setAttribute('tabindex', '0');
            li.dataset.city = city;
            li.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="opacity:0.7"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${city}
          `;
            fragment.appendChild(li);
        });

        list.appendChild(fragment);
        list.classList.remove('hidden');
        input.setAttribute('aria-expanded', 'true');
    },

    updateBackground: (conditionCode, iconCode = '01d') => {
        const isNight = iconCode.includes('n');
        let bgState = isNight ? 'clear-night' : 'clear-day';
        if (conditionCode >= 200 && conditionCode < 300) bgState = 'thunderstorm';
        else if (conditionCode >= 300 && conditionCode < 600) bgState = 'rain';
        else if (conditionCode >= 600 && conditionCode < 700) bgState = 'snow';
        else if (conditionCode >= 801 && conditionCode <= 804) bgState = isNight ? 'clouds-night' : 'clouds-day';
        document.body.setAttribute('data-weather', bgState);
    },

    updateDataStatus: (timestamp) => {
        if (!timestamp) return;
        const ageInMs = Date.now() - timestamp;
        const dot = document.getElementById('status-dot');
        const badge = document.getElementById('status-badge');
        const text = document.getElementById('last-updated');

        dot.classList.remove('green', 'yellow', 'red');

        // 1 hour = 3600000ms, 1 hour 50 mins = 6600000ms
        if (ageInMs >= 6600000) {
            dot.classList.add('red');
            text.textContent = 'Data: Old';
            badge.setAttribute('aria-label', 'Data status: Older than 1 hour 50 minutes');
        } else if (ageInMs >= 3600000) {
            dot.classList.add('yellow');
            text.textContent = 'Data: > 1h';
            badge.setAttribute('aria-label', 'Data status: Older than 1 hour');
        } else {
            dot.classList.add('green');
            text.textContent = 'Live Data';
            badge.setAttribute('aria-label', 'Data status: Fresh data');
        }
    },

    renderHero: (geo, current, timestamp) => {
        const cityEl = document.getElementById('current-city');
        const tempEl = document.getElementById('current-temp');
        const descEl = document.getElementById('current-desc');

        cityEl.textContent = `${geo.name}, ${geo.country}`;
        cityEl.classList.remove('skeleton', 'skeleton-city');

        tempEl.textContent = Math.round(current.main.temp);
        tempEl.classList.remove('skeleton', 'skeleton-temp');

        const desc = Utils.capitalize(current.weather[0].description);
        descEl.textContent = desc;
        descEl.classList.remove('skeleton', 'skeleton-desc');

        document.getElementById('current-high').textContent = `H: ${Math.round(current.main.temp_max)}°`;
        document.getElementById('current-low').textContent = `L: ${Math.round(current.main.temp_min)}°`;

        const iconEl = document.getElementById('hero-icon');
        // Inject advanced UI icon
        iconEl.src = Utils.getIconUrl(current.weather[0].icon, current.weather[0].id);
        iconEl.alt = desc;
        iconEl.setAttribute('aria-hidden', 'false');
        iconEl.classList.remove('hidden');

        UI.updateDataStatus(timestamp);
        UI.updateBackground(current.weather[0].id, current.weather[0].icon);
    },

    renderMetrics: (current) => {
        document.getElementById('metric-feels').textContent = Math.round(current.main.feels_like);
        const diff = current.main.feels_like - current.main.temp;
        document.getElementById('metric-feels-desc').textContent = diff > 2 ? 'Feels noticeably warmer.' : diff < -2 ? 'Feels noticeably colder.' : 'Similar to actual temperature.';

        document.getElementById('metric-wind').textContent = Math.round(current.wind.speed * 3.6);
        document.getElementById('metric-wind-dir').textContent = Utils.getWindDirection(current.wind.deg);
        document.getElementById('wind-compass').style.transform = `rotate(${current.wind.deg}deg)`;

        const visKm = (current.visibility / 1000).toFixed(1);
        document.getElementById('metric-vis').textContent = visKm;
        document.getElementById('metric-vis-desc').textContent = visKm > 8 ? 'Perfectly clear view.' : 'Reduced visibility.';

        document.getElementById('metric-hum').textContent = current.main.humidity;
    },

    renderDailyForecast: (forecast) => {
        const dailyContainer = document.getElementById('daily-container');
        dailyContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        const dailyMap = new Map();
        const tzOffset = forecast.city.timezone; // Отримуємо часовий пояс міста

        forecast.list.forEach(item => {
            // Визначаємо точну дату в цільовому місті
            const d = new Date((item.dt + tzOffset) * 1000);
            const dateStr = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;

            if (!dailyMap.has(dateStr)) {
                dailyMap.set(dateStr, { min: item.main.temp_min, max: item.main.temp_max, icon: item.weather[0].icon, id: item.weather[0].id, dt: item.dt });
            } else {
                const day = dailyMap.get(dateStr);
                day.min = Math.min(day.min, item.main.temp_min);
                day.max = Math.max(day.max, item.main.temp_max);
                if (item.dt_txt.includes('12:00:00')) {
                    day.icon = item.weather[0].icon;
                    day.id = item.weather[0].id;
                }
            }
        });

        const dailyArray = Array.from(dailyMap.values()).slice(0, 5);
        const absMin = Math.min(...dailyArray.map(d => d.min));
        const absMax = Math.max(...dailyArray.map(d => d.max));
        const range = absMax - absMin || 1;

        dailyArray.forEach((day, index) => {
            const dayName = index === 0 ? 'Today' : Utils.formatDayWithMonth(day.dt, tzOffset);
            const iconUrl = Utils.getIconUrl(day.icon, day.id); 
            const leftPct = ((day.min - absMin) / range) * 100;
            const widthPct = ((day.max - day.min) / range) * 100;

            const row = document.createElement('div');
            row.className = 'daily-row';
            row.innerHTML = `
            <div class="daily-day">${dayName}</div>
            <div class="daily-icon-wrapper">
              <img src="${iconUrl}" alt="" width="32" height="32" class="daily-icon" loading="lazy" aria-hidden="true">
            </div>
            <div class="daily-temps">
              <span class="temp-min">${Math.round(day.min)}°</span>
              <div class="temp-bar" aria-hidden="true">
                <div class="temp-bar-fill" style="left: ${leftPct}%; width: ${Math.max(widthPct, 10)}%;"></div>
              </div>
              <span class="temp-max">${Math.round(day.max)}°</span>
            </div>
          `;
            fragment.appendChild(row);
        });
        dailyContainer.appendChild(fragment);
    },

    renderChartAndHourly: (rangeType) => {
        if (!UI.currentForecastData) return;
        const list = UI.currentForecastData.list;
        const tzOffset = UI.currentForecastData.city.timezone; // Часовий пояс міста

        // Функція для отримання точної дати саме в місті, яке ми шукаємо
        const getCityDateStr = (dt) => {
            const d = new Date((dt + tzOffset) * 1000);
            return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        };

        // Визначаємо "Сьогодні" та "Завтра" відносно поточного світового часу + пояс міста
        const nowUnix = Math.floor(Date.now() / 1000);
        const cityTodayStr = getCityDateStr(nowUnix);
        const cityTmrwStr = getCityDateStr(nowUnix + 86400);

        let filteredList = [];
        
        if (rangeType === 'today') {
            filteredList = list.filter(item => getCityDateStr(item.dt) === cityTodayStr);
            // Якщо пізній вечір (мало записів на сьогодні), плавно продовжуємо графік ранком завтрашнього дня
            if (filteredList.length < 4) {
                const tomorrowItems = list.filter(item => getCityDateStr(item.dt) === cityTmrwStr);
                filteredList = [...filteredList, ...tomorrowItems].slice(0, 8);
            }
        } else if (rangeType === 'tomorrow') {
            filteredList = list.filter(item => getCityDateStr(item.dt) === cityTmrwStr);
        } else if (rangeType === 'next3') {
            filteredList = list.filter(item => {
                const dStr = getCityDateStr(item.dt);
                return dStr !== cityTodayStr && dStr !== cityTmrwStr;
            });
            filteredList = filteredList.filter((_, i) => i % 2 === 0);
        }

        const strip = document.getElementById('hourly-container');
        strip.innerHTML = '';
        const fragment = document.createDocumentFragment();

        filteredList.forEach(item => {
            // Відображаємо час в локальному поясі міста!
            let timeDisplay = Utils.formatTime(item.dt, tzOffset);

            // Додаємо дату (Fri 24 Jul) для Next 3 Days, АБО якщо графік "Today" зайшов за опівніч
            if (rangeType === 'next3' || (rangeType === 'today' && getCityDateStr(item.dt) !== cityTodayStr)) {
                const dateStr = Utils.formatDayWithMonth(item.dt, tzOffset).replace(',', ''); 
                timeDisplay = `<span style="display:block; font-size:0.75em; opacity:0.8; margin-bottom:2px; white-space:nowrap;">${dateStr}</span>${timeDisplay}`;
            }

            const iconUrl = Utils.getIconUrl(item.weather[0].icon, item.weather[0].id); 
            const li = document.createElement('li');
            li.className = 'hourly-item';
            li.innerHTML = `
            <span class="hourly-time" style="text-align: center; line-height: 1.2;">${timeDisplay}</span>
            <img src="${iconUrl}" alt="" width="32" height="32" class="hourly-icon" loading="lazy" aria-hidden="true">
            <span class="hourly-temp">${Math.round(item.main.temp)}°</span>
          `;
            fragment.appendChild(li);
        });
        strip.appendChild(fragment);

        strip.scrollLeft = 0;

        // Підписи для графіка Chart.js також у часовому поясі міста
        const labels = filteredList.map(item => Utils.formatTime(item.dt, tzOffset));
        const data = filteredList.map(item => item.main.temp);

        requestAnimationFrame(() => {
            UI.updateSliderNavigation();

            setTimeout(() => {
                if (UI.chartInstance) {
                    UI.chartInstance.data.labels = labels;
                    UI.chartInstance.data.datasets[0].data = data;
                    UI.chartInstance.update();
                } else if (window.Chart) {
                    UI.initChart(labels, data);
                } else {
                    window.addEventListener('load', () => UI.initChart(labels, data));
                }
            }, 0);
        });
    },

    initChart: (labels, data) => {
        const ctx = document.getElementById('tempChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 180);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

        Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
        Chart.defaults.font.family = 'Inter';

        UI.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperature',
                    data: data,
                    borderColor: '#38BDF8',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', callbacks: { label: (c) => `${Math.round(c.raw)}°C` } } },
                scales: { x: { display: false }, y: { display: false, suggestedMin: Math.min(...data) - 2, suggestedMax: Math.max(...data) + 2 } },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }
};