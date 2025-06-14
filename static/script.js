/**
 * 彩云天气网站 - 前端交互脚本
 * 处理位置获取、天气数据展示、用户界面更新
 */

class WeatherApp {
  constructor() {
    this.currentLocation = null;
    this.weatherData = null;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
    this.isLoading = false;
    this.init();
  }

  // 初始化应用
  init() {
    this.bindEvents();
    this.checkLocationPermission();
  }

  // 绑定事件监听器
  bindEvents() {
    console.log('绑定事件监听器');
    const locationBtn = document.getElementById('locationBtn');
    const manualLocationBtn = document.getElementById('manualLocationBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const retryBtn = document.getElementById('retryBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const searchBtn = document.getElementById('searchBtn');
    const locationSearch = document.getElementById('locationSearch');

    console.log('手动位置按钮:', manualLocationBtn);

    locationBtn?.addEventListener('click', () => this.getCurrentLocation());
    manualLocationBtn?.addEventListener('click', () => {
      console.log('手动位置按钮被点击');
      this.showLocationModal();
    });
    refreshBtn?.addEventListener('click', () => this.refreshWeatherData());
    retryBtn?.addEventListener('click', () => this.getCurrentLocation());
    closeModalBtn?.addEventListener('click', () => this.hideLocationModal());
    searchBtn?.addEventListener('click', () => this.searchLocation());

    // 回车键搜索
    locationSearch?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchLocation();
      }
    });

    // 热门城市按钮
    document.querySelectorAll('.city-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target;
        const city = target.dataset.city;
        const lng = parseFloat(target.dataset.lng || '0');
        const lat = parseFloat(target.dataset.lat || '0');
        this.selectLocation(lng, lat, city || '');
      });
    });

    // 点击模态框外部关闭
    document.getElementById('locationModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideLocationModal();
      }
    });
  }

  // 刷新天气数据
  async refreshWeatherData() {
    if (!this.currentLocation || this.isLoading) {
      return;
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
      refreshBtn.disabled = true;
    }

    // 清除缓存，强制重新获取
    const key = this.getCacheKey(this.currentLocation.lng, this.currentLocation.lat);
    this.cache.delete(key);

    try {
      await this.fetchWeatherData(this.currentLocation.lng, this.currentLocation.lat);
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
      }
    }
  }

  // 检查位置权限并自动获取位置
  async checkLocationPermission() {
    console.log('检查位置权限');
    if ('geolocation' in navigator) {
      try {
        // 尝试获取位置权限状态
        if ('permissions' in navigator) {
          console.log('检查权限状态');
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          console.log('权限状态:', permission.state);
          if (permission.state === 'granted') {
            this.getCurrentLocation();
            return;
          }
        }

        // 如果没有权限API或权限未授予，显示获取位置按钮
        console.log('显示位置获取提示');
        this.showLocationPrompt();
      } catch (error) {
        console.log('权限检查失败:', error);
        this.showLocationPrompt();
      }
    } else {
      console.log('浏览器不支持地理位置');
      this.showError('您的浏览器不支持地理位置功能');
    }
  }

  // 显示位置获取提示
  showLocationPrompt() {
    console.log('显示位置获取提示');
    this.hideLoading();
    const locationBtn = document.getElementById('locationBtn');
    const manualLocationBtn = document.getElementById('manualLocationBtn');
    console.log('位置按钮:', locationBtn, '手动位置按钮:', manualLocationBtn);

    if (locationBtn) {
      locationBtn.style.display = 'flex';
      locationBtn.innerHTML = '<span class="location-icon">📍</span>获取我的位置';
      locationBtn.disabled = false;
    }

    if (manualLocationBtn) {
      manualLocationBtn.style.display = 'flex';
    }
  }

  // 获取当前位置
  getCurrentLocation() {
    this.showLoading('正在获取位置信息...');
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5分钟缓存
    };

    navigator.geolocation.getCurrentPosition(
      (position) => this.onLocationSuccess(position),
      (error) => this.onLocationError(error),
      options
    );
  }

  // 位置获取成功
  async onLocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    this.currentLocation = { lat: latitude, lng: longitude };

    console.log('位置获取成功:', this.currentLocation);

    // 更新按钮状态
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
      locationBtn.innerHTML = '<span class="location-icon">✅</span>位置已获取';
      locationBtn.disabled = true;
    }

    // 获取详细地址并获取天气数据
    this.showLoading('正在获取位置信息...');
    const detailedAddress = await this.getDetailedAddress(longitude, latitude);
    await this.fetchWeatherData(longitude, latitude, detailedAddress);
  }

  // 位置获取失败
  async onLocationError(error) {
    console.error('位置获取失败:', error);

    let errorMessage = '获取位置失败';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = '位置访问被拒绝，尝试使用 IP 定位...';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = '位置信息不可用，尝试使用 IP 定位...';
        break;
      case error.TIMEOUT:
        errorMessage = '位置获取超时，尝试使用 IP 定位...';
        break;
    }

    this.showLoading(errorMessage);

    // 尝试 IP 定位作为备用方案
    try {
      await this.getLocationByIP();
    } catch (ipError) {
      console.error('IP 定位也失败:', ipError);
      this.showError('无法获取位置信息，请手动选择位置');
    }
  }

  // 通过 IP 获取位置
  async getLocationByIP() {
    try {
      const response = await fetch('/api/location/ip');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      this.currentLocation = { lat: data.lat, lng: data.lng };

      console.log('IP 定位成功:', this.currentLocation, '地址:', data.address);

      // 更新按钮状态
      const locationBtn = document.getElementById('locationBtn');
      if (locationBtn) {
        locationBtn.innerHTML = '<span class="location-icon">🌐</span>IP 定位';
        locationBtn.disabled = true;
      }

      // 获取天气数据
      await this.fetchWeatherData(this.currentLocation.lng, this.currentLocation.lat, data.address);

    } catch (error) {
      console.error('IP 定位失败:', error);
      throw error;
    }
  }

  // 生成缓存键
  getCacheKey(lng, lat) {
    return `weather_${lng.toFixed(4)}_${lat.toFixed(4)}`;
  }

  // 检查缓存
  getCachedData(lng, lat) {
    const key = this.getCacheKey(lng, lat);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    return null;
  }

  // 设置缓存
  setCachedData(lng, lat, data) {
    const key = this.getCacheKey(lng, lat);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // 获取天气数据
  async fetchWeatherData(lng, lat, locationName = null) {
    if (this.isLoading) {
      return; // 防止重复请求
    }

    // 检查缓存
    const cachedData = this.getCachedData(lng, lat);
    if (cachedData) {
      console.log('使用缓存数据');
      this.weatherData = cachedData;
      this.displayWeatherData(locationName);
      return;
    }

    this.isLoading = true;
    this.showLoading('正在获取天气信息...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(`/api/weather?lng=${lng}&lat=${lat}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // 缓存数据
      this.setCachedData(lng, lat, data);

      this.weatherData = data;
      this.displayWeatherData(locationName);

    } catch (error) {
      if (error.name === 'AbortError') {
        this.showError('请求超时，请检查网络连接');
      } else {
        console.error('获取天气数据失败:', error);
        this.showError(`获取天气数据失败: ${error.message}`);
      }
    } finally {
      this.isLoading = false;
    }
  }

  // 获取详细地址
  async getDetailedAddress(lng, lat) {
    try {
      const response = await fetch(`/api/location/geocode?lng=${lng}&lat=${lat}`);

      if (!response.ok) {
        return '未知位置';
      }

      const data = await response.json();
      return data.address || '未知位置';
    } catch (error) {
      console.error('获取地址失败:', error);
      return '未知位置';
    }
  }

  // 显示位置选择模态框
  showLocationModal() {
    console.log('显示位置选择模态框');
    const modal = document.getElementById('locationModal');
    console.log('模态框元素:', modal);
    if (modal) {
      modal.style.display = 'flex';
      console.log('模态框已显示');
      // 清空搜索框
      const searchInput = document.getElementById('locationSearch');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      // 清空搜索结果
      const searchResults = document.getElementById('searchResults');
      if (searchResults) {
        searchResults.innerHTML = '';
      }
    } else {
      console.error('找不到模态框元素');
    }
  }

  // 隐藏位置选择模态框
  hideLocationModal() {
    const modal = document.getElementById('locationModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // 搜索位置
  async searchLocation() {
    const searchInput = document.getElementById('locationSearch');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput || !searchResults) return;

    const query = searchInput.value.trim();
    if (!query) return;

    searchResults.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">搜索中...</div>';

    try {
      // 使用高德地理编码 API 搜索
      const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(query)}&output=json`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const results = data.geocodes.slice(0, 5); // 最多显示5个结果

        searchResults.innerHTML = results.map(result => {
          const [lng, lat] = result.location.split(',').map(Number);
          return `
            <div class="search-result-item" data-lng="${lng}" data-lat="${lat}" data-name="${result.formatted_address}">
              <div style="font-weight: 500;">${result.formatted_address}</div>
              <div style="font-size: 0.875rem; color: #666; margin-top: 0.25rem;">
                ${result.province} ${result.city} ${result.district}
              </div>
            </div>
          `;
        }).join('');

        // 绑定点击事件
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const lng = parseFloat(target.dataset.lng || '0');
            const lat = parseFloat(target.dataset.lat || '0');
            const name = target.dataset.name || '';
            this.selectLocation(lng, lat, name);
          });
        });
      } else {
        searchResults.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">未找到相关位置</div>';
      }
    } catch (error) {
      console.error('搜索位置失败:', error);
      searchResults.innerHTML = '<div style="text-align: center; padding: 1rem; color: #f56565;">搜索失败，请重试</div>';
    }
  }

  // 选择位置
  async selectLocation(lng, lat, locationName) {
    this.hideLocationModal();
    this.currentLocation = { lat, lng };

    // 更新按钮状态
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
      locationBtn.innerHTML = '<span class="location-icon">📍</span>已选择位置';
      locationBtn.disabled = true;
    }

    // 获取天气数据
    await this.fetchWeatherData(lng, lat, locationName);
  }

  // 显示天气数据
  async displayWeatherData(locationName = null) {
    if (!this.weatherData) return;

    const { current, hourly, daily, forecast_keypoint } = this.weatherData;

    // 更新当前天气
    this.updateCurrentWeather(current);

    // 更新空气质量
    this.updateAirQuality(current.air_quality);

    // 更新24小时预报
    this.updateHourlyForecast(hourly);

    // 更新7天预报
    this.updateDailyForecast(daily);

    // 更新位置和时间信息
    await this.updateLocationInfo(forecast_keypoint, locationName);

    // 显示天气内容
    this.showWeatherContent();
  }

  // 更新当前天气信息
  updateCurrentWeather(current) {
    document.getElementById('currentTemp').textContent = current.temperature;
    document.getElementById('weatherIcon').textContent = current.weather_info.icon;
    document.getElementById('weatherDesc').textContent = current.weather_info.desc;
    document.getElementById('feelsLike').textContent = `体感温度 ${current.apparent_temperature}°C`;
    document.getElementById('humidity').textContent = `${current.humidity}%`;
    document.getElementById('windSpeed').textContent = `${current.wind_speed} km/h`;
    document.getElementById('visibility').textContent = `${current.visibility} km`;
    document.getElementById('pressure').textContent = `${current.pressure} hPa`;
  }

  // 更新空气质量信息
  updateAirQuality(airQuality) {
    if (!airQuality) return;
    
    document.getElementById('aqiValue').textContent = airQuality.aqi?.chn || '--';
    document.getElementById('aqiDesc').textContent = airQuality.description?.chn || '--';
    document.getElementById('pm25').textContent = `${airQuality.pm25 || '--'} μg/m³`;
    document.getElementById('pm10').textContent = `${airQuality.pm10 || '--'} μg/m³`;
    document.getElementById('o3').textContent = `${airQuality.o3 || '--'} μg/m³`;
  }

  // 更新24小时预报
  updateHourlyForecast(hourly) {
    const container = document.getElementById('hourlyForecast');
    if (!container || !hourly) return;

    container.innerHTML = hourly.map(item => `
      <div class="hourly-item">
        <div class="hourly-time">${item.time}:00</div>
        <div class="hourly-icon">${item.weather_info.icon}</div>
        <div class="hourly-temp">${item.temperature}°</div>
      </div>
    `).join('');
  }

  // 更新7天预报
  updateDailyForecast(daily) {
    const container = document.getElementById('dailyForecast');
    if (!container || !daily) return;

    container.innerHTML = daily.map(item => `
      <div class="daily-item">
        <div class="daily-date">
          <div class="daily-weekday">${item.weekday}</div>
          <div class="daily-date-text">${item.date}</div>
        </div>
        <div class="daily-weather">
          <div class="daily-icon">${item.weather_info.icon}</div>
          <div class="daily-desc">${item.weather_info.desc}</div>
        </div>
        <div class="daily-temp">
          <div class="daily-temp-range">${item.min_temp}° / ${item.max_temp}°</div>
        </div>
      </div>
    `).join('');
  }

  // 更新位置和时间信息
  async updateLocationInfo(forecastKeypoint, locationName = null) {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 如果没有提供位置名称，尝试获取详细地址
    let displayLocation = locationName;
    if (!displayLocation && this.currentLocation) {
      displayLocation = await this.getDetailedAddress(this.currentLocation.lng, this.currentLocation.lat);
    }

    document.getElementById('currentLocation').textContent = displayLocation || '当前位置';
    document.getElementById('updateTime').textContent = `更新时间: ${timeString}`;

    // 如果有预报要点，可以在某处显示
    if (forecastKeypoint) {
      console.log('预报要点:', forecastKeypoint);
    }
  }

  // 显示加载状态
  showLoading(message = '正在加载...') {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('weatherContent').style.display = 'none';
    
    const loadingText = document.querySelector('.loading-state p');
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  // 隐藏加载状态
  hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
  }

  // 显示错误状态
  showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('weatherContent').style.display = 'none';
    
    document.getElementById('errorMessage').textContent = message;
    
    // 重置位置按钮
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
      locationBtn.innerHTML = '<span class="location-icon">📍</span>重新获取位置';
      locationBtn.disabled = false;
    }
  }

  // 显示天气内容
  showWeatherContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('weatherContent').style.display = 'block';

    // 显示刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.style.display = 'flex';
    }
  }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new WeatherApp();
});
