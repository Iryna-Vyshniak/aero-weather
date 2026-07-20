export const Utils = {
    formatTime: (unixTimestamp, timezoneOffset = 0) => {
        // Враховуємо часовий пояс міста
        const d = new Date((unixTimestamp + timezoneOffset) * 1000);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
    },
    
    formatDayWithMonth: (unixTimestamp, timezoneOffset = 0) => {
        const d = new Date((unixTimestamp + timezoneOffset) * 1000);
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    },
    
    capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),

    getIconUrl: (iconCode, conditionId) => {
        const isDay = iconCode.includes('d');
        const time = isDay ? 'day' : 'night';
        let iconName = 'cloudy';

        if (conditionId >= 200 && conditionId < 300) {
            iconName = [210, 211, 212, 221].includes(conditionId) ? `thunderstorms-${time}` : `thunderstorms-${time}-rain`;
            if (conditionId === 212 || conditionId === 202) iconName = `thunderstorms-${time}-extreme`;
        } else if (conditionId >= 300 && conditionId < 400) {
            iconName = `partly-cloudy-${time}-drizzle`;
        } else if (conditionId >= 500 && conditionId < 600) {
            if (conditionId === 511) iconName = 'sleet';
            else if (conditionId > 501 && conditionId < 505) iconName = 'rain';
            else iconName = `partly-cloudy-${time}-rain`;
        } else if (conditionId >= 600 && conditionId < 700) {
            if (conditionId >= 611 && conditionId <= 616) iconName = 'sleet';
            else iconName = `partly-cloudy-${time}-snow`;
        } else if (conditionId >= 700 && conditionId < 800) {
            if (conditionId === 781) iconName = 'tornado';
            else if (conditionId === 731 || conditionId === 761) iconName = 'dust';
            else if (conditionId === 711) iconName = 'smoke';
            else if (conditionId === 721) iconName = 'haze';
            else iconName = 'fog'; // 701, 741
        } else if (conditionId === 800) {
            iconName = `clear-${time}`;
        } else if (conditionId === 801 || conditionId === 802) {
            iconName = `partly-cloudy-${time}`;
        } else if (conditionId === 803) {
            iconName = 'cloudy';
        } else if (conditionId === 804) {
            iconName = 'overcast';
        }

        return `./icons/${iconName}.svg`;
    },

    getWindDirection: (degrees) => {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(degrees / 45) % 8];
    }
};