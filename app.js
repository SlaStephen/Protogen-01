const filterButtons = document.querySelectorAll(".filter");
const projects = document.querySelectorAll(".project");

function setFilter(category) {
	filterButtons.forEach((button) => {
		button.setAttribute("aria-pressed", String(button.dataset.filter === category));
	});
	projects.forEach((project) => {
		project.hidden = category !== "All" && project.dataset.category !== category;
	});
}

filterButtons.forEach((button) => {
	button.addEventListener("click", () => setFilter(button.dataset.filter));
});

const weatherWidget = document.querySelector(".weather");
const weatherRefresh = document.querySelector(".weather-refresh");
const weatherStatus = document.querySelector(".weather-status");
const weatherReading = document.querySelector(".weather-reading");

function weatherCondition(code) {
	if (code === 0) return ["☀️", "Clear skies"];
	if (code === 1 || code === 2) return ["🌤️", "Partly cloudy"];
	if (code === 3) return ["☁️", "Overcast"];
	if (code === 45 || code === 48) return ["🌫️", "Fog"];
	if ([51, 53, 55, 56, 57].includes(code)) return ["🌧️", "Drizzle"];
	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["🌧️", "Rain"];
	if ([71, 73, 75, 77, 85, 86].includes(code)) return ["❄️", "Snow"];
	if ([95, 96, 99].includes(code)) return ["⛈️", "Thunderstorm"];
	return ["🌡️", "Current conditions"];
}

function finishWeather(message) {
	weatherStatus.textContent = message;
	weatherWidget.setAttribute("aria-busy", "false");
	weatherRefresh.disabled = false;
}

function loadWeather() {
	weatherRefresh.disabled = true;
	weatherWidget.setAttribute("aria-busy", "true");
	weatherReading.hidden = true;
	weatherStatus.textContent = "Finding your location...";

	if (!window.isSecureContext || !navigator.geolocation) {
		finishWeather("Location requires HTTPS or localhost and a browser with location support.");
		return;
	}

	navigator.geolocation.getCurrentPosition(async (position) => {
		weatherStatus.textContent = "Loading weather...";
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000);
		try {
			const url = new URL("https://api.open-meteo.com/v1/forecast");
			url.search = new URLSearchParams({
				latitude: position.coords.latitude,
				longitude: position.coords.longitude,
				current: "temperature_2m,weather_code",
				temperature_unit: "fahrenheit"
			}).toString();
			const response = await fetch(url, { signal: controller.signal });
			if (!response.ok) throw new Error("Weather request failed");
			const data = await response.json();
			if (!Number.isFinite(data.current?.temperature_2m) || !Number.isInteger(data.current?.weather_code)) {
				throw new Error("Invalid weather data");
			}
			const [icon, description] = weatherCondition(data.current.weather_code);
			document.querySelector(".weather-icon").textContent = icon;
			document.querySelector(".weather-temperature").textContent = `${Math.round(data.current.temperature_2m)}°F`;
			weatherReading.hidden = false;
			finishWeather(description);
		} catch {
			finishWeather("Weather unavailable. Please try again.");
		} finally {
			clearTimeout(timeout);
		}
	}, (error) => {
		finishWeather(error.code === 1
			? "Location access denied. Allow location in your browser settings, then refresh."
			: "Location unavailable. Please try again.");
	}, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

if (weatherWidget) {
	weatherRefresh.addEventListener("click", loadWeather);
	loadWeather();
}
