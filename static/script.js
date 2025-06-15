/**
 * 彩云天气网站 - 前端交互脚本
 * 处理位置获取、天气数据展示、用户界面更新
 */

// 天气特效管理器
class WeatherEffectsManager {
  constructor() {
    this.effectsContainer = document.getElementById('weatherEffects');
    this.currentEffects = [];
    this.animationFrames = [];
  }

  // 清除所有特效
  clearAllEffects() {
    if (this.effectsContainer) {
      this.effectsContainer.innerHTML = '';
    }
    this.currentEffects = [];
    // 清除动画帧
    this.animationFrames.forEach(frame => cancelAnimationFrame(frame));
    this.animationFrames = [];
    // 移除背景摇摆效果
    this.effectsContainer.classList.remove('background-sway', 'sway-light', 'sway-moderate', 'sway-strong');
  }

  // 应用天气特效
  applyWeatherEffects(weatherData) {
    this.clearAllEffects();

    const { current } = weatherData;
    const skycon = current.skycon;
    const windSpeed = current.wind_speed || 0;
    const visibility = current.visibility || 10;

    console.log('应用天气特效:', skycon, '风速:', windSpeed, '能见度:', visibility);

    // 根据天气状况应用特效
    if (skycon.includes('RAIN')) {
      this.addRainEffect(skycon);
    } else if (skycon.includes('SNOW')) {
      this.addSnowEffect(skycon);
    } else if (skycon.includes('STORM')) {
      this.addThunderEffect();
      this.addRainEffect('HEAVY_RAIN');
    } else if (skycon.includes('HAIL')) {
      this.addHailEffect();
    } else if (skycon.includes('HAZE') || visibility < 5) {
      this.addFogEffect(visibility);
    } else if (skycon.includes('DUST') || skycon.includes('SAND') || skycon.includes('WIND')) {
      this.addDustEffect();
    } else if (skycon.includes('CLEAR_DAY')) {
      this.addSunshineEffect();
    } else if (skycon.includes('CLOUDY')) {
      this.addCloudsEffect();
    }

    // 风力特效
    if (windSpeed > 10) {
      this.addWindEffect(windSpeed);
    }

    // 背景摇摆效果（基于风速）
    if (windSpeed > 20) {
      this.addBackgroundSway('strong');
    } else if (windSpeed > 10) {
      this.addBackgroundSway('moderate');
    } else if (windSpeed > 5) {
      this.addBackgroundSway('light');
    }
  }

  // 雨滴特效
  addRainEffect(intensity) {
    const rainDiv = document.createElement('div');
    rainDiv.className = 'rain-effect';

    if (intensity.includes('LIGHT')) {
      rainDiv.classList.add('rain-light');
    } else if (intensity.includes('HEAVY') || intensity.includes('STORM')) {
      rainDiv.classList.add('rain-heavy');
    } else {
      rainDiv.classList.add('rain-moderate');
    }

    this.effectsContainer.appendChild(rainDiv);
    this.currentEffects.push('rain');
  }

  // 雪花特效
  addSnowEffect(intensity) {
    const snowDiv = document.createElement('div');
    snowDiv.className = 'snow-effect';

    if (intensity.includes('LIGHT')) {
      snowDiv.classList.add('snow-light');
    } else if (intensity.includes('HEAVY') || intensity.includes('STORM')) {
      snowDiv.classList.add('snow-heavy');
    } else {
      snowDiv.classList.add('snow-moderate');
    }

    // 创建雪花
    const snowflakeCount = intensity.includes('HEAVY') ? 50 : intensity.includes('LIGHT') ? 20 : 35;
    for (let i = 0; i < snowflakeCount; i++) {
      const snowflake = document.createElement('div');
      snowflake.className = 'snowflake';
      snowflake.textContent = '❄';
      snowflake.style.left = Math.random() * 100 + '%';
      snowflake.style.animationDelay = Math.random() * 3 + 's';
      snowflake.style.animationDuration = (Math.random() * 3 + 2) + 's';
      snowDiv.appendChild(snowflake);
    }

    this.effectsContainer.appendChild(snowDiv);
    this.currentEffects.push('snow');
  }

  // 雷暴特效
  addThunderEffect() {
    const thunderDiv = document.createElement('div');
    thunderDiv.className = 'thunder-effect';
    this.effectsContainer.appendChild(thunderDiv);
    this.currentEffects.push('thunder');
  }

  // 阳光特效
  addSunshineEffect() {
    const sunDiv = document.createElement('div');
    sunDiv.className = 'sunshine-effect';
    this.effectsContainer.appendChild(sunDiv);
    this.currentEffects.push('sunshine');
  }

  // 云层特效
  addCloudsEffect() {
    const cloudsDiv = document.createElement('div');
    cloudsDiv.className = 'clouds-effect';
    this.effectsContainer.appendChild(cloudsDiv);
    this.currentEffects.push('clouds');
  }

  // 雾霾特效
  addFogEffect(visibility) {
    const fogDiv = document.createElement('div');
    fogDiv.className = 'fog-effect';

    if (visibility < 1) {
      fogDiv.classList.add('fog-heavy');
    } else if (visibility < 3) {
      fogDiv.classList.add('fog-moderate');
    } else {
      fogDiv.classList.add('fog-light');
    }

    this.effectsContainer.appendChild(fogDiv);
    this.currentEffects.push('fog');
  }

  // 沙尘特效
  addDustEffect() {
    const dustDiv = document.createElement('div');
    dustDiv.className = 'dust-effect';

    // 添加沙尘粒子
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'dust-particle';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 2 + 's';
      particle.style.animationDuration = (Math.random() * 2 + 1) + 's';
      dustDiv.appendChild(particle);
    }

    this.effectsContainer.appendChild(dustDiv);
    this.currentEffects.push('dust');
  }

  // 冰雹特效
  addHailEffect() {
    const hailDiv = document.createElement('div');
    hailDiv.className = 'hail-effect';

    // 创建冰雹
    for (let i = 0; i < 25; i++) {
      const hailstone = document.createElement('div');
      hailstone.className = 'hailstone';
      hailstone.style.left = Math.random() * 100 + '%';
      hailstone.style.animationDelay = Math.random() * 2 + 's';
      hailstone.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
      hailDiv.appendChild(hailstone);
    }

    this.effectsContainer.appendChild(hailDiv);
    this.currentEffects.push('hail');
  }

  // 风力特效
  addWindEffect(windSpeed) {
    const windDiv = document.createElement('div');
    windDiv.className = 'wind-effect';

    if (windSpeed > 30) {
      windDiv.classList.add('wind-strong');
    } else if (windSpeed > 15) {
      windDiv.classList.add('wind-moderate');
    } else {
      windDiv.classList.add('wind-light');
    }

    // 创建风力粒子
    const particleCount = Math.min(Math.floor(windSpeed / 2), 40);
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'wind-particle';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 3 + 's';
      windDiv.appendChild(particle);
    }

    this.effectsContainer.appendChild(windDiv);
    this.currentEffects.push('wind');
  }

  // 背景摇摆特效
  addBackgroundSway(intensity) {
    this.effectsContainer.classList.add('background-sway', `sway-${intensity}`);
  }
}

class WeatherApp {
  constructor() {
    this.currentLocation = null;
    this.weatherData = null;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
    this.isLoading = false;
    this.favoriteLocations = this.loadFavoriteLocations();
    this.defaultLocation = this.loadDefaultLocation();
    this.weatherEffects = new WeatherEffectsManager();
    this.init();
  }

  // 初始化应用
  init() {
    this.bindEvents();
    // 立即设置基于时间的背景
    this.updateTimeBasedBackground();
    this.checkLocationPermission();
  }

  // 绑定事件监听器
  bindEvents() {
    const currentLocationBtn = document.getElementById('currentLocationBtn');
    const retryBtn = document.getElementById('retryBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const searchBtn = document.getElementById('searchBtn');
    const locationSearch = document.getElementById('locationSearch');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const setDefaultBtn = document.getElementById('setDefaultBtn');

    currentLocationBtn?.addEventListener('click', () => this.showLocationModal());
    retryBtn?.addEventListener('click', () => this.getCurrentLocation());
    closeModalBtn?.addEventListener('click', () => this.hideLocationModal());
    searchBtn?.addEventListener('click', () => this.searchLocation());

    // 模态框中的按钮事件
    const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
    const modalSetDefaultBtn = document.getElementById('modalSetDefaultBtn');
    modalFavoriteBtn?.addEventListener('click', () => this.toggleFavorite());
    modalSetDefaultBtn?.addEventListener('click', () => this.setAsDefault());

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



  // 检查位置权限并自动获取位置
  async checkLocationPermission() {
    // 优先检查是否有默认位置
    if (this.defaultLocation) {
      console.log('加载默认位置:', this.defaultLocation);
      this.currentLocation = { lat: this.defaultLocation.lat, lng: this.defaultLocation.lng };
      // 获取天气数据
      await this.fetchWeatherData(this.defaultLocation.lng, this.defaultLocation.lat, this.defaultLocation.name);
      return;
    }

    // 首先尝试GPS定位作为主要方案（更准确）
    if ('geolocation' in navigator) {
      try {
        console.log('开始尝试GPS定位...');
        // 尝试获取位置权限状态
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'granted') {
            console.log('GPS权限已授予，开始GPS定位...');
            this.getCurrentLocation();
            return;
          } else if (permission.state === 'prompt') {
            console.log('GPS权限需要用户确认，尝试请求权限...');
            this.getCurrentLocation(); // 这会触发权限请求
            return;
          } else {
            console.log('GPS权限被拒绝，尝试IP定位...');
          }
        } else {
          // 没有权限API，直接尝试获取位置（会触发权限请求）
          console.log('浏览器不支持权限API，直接尝试GPS定位...');
          this.getCurrentLocation();
          return;
        }
      } catch (error) {
        console.log('GPS权限检查失败，尝试IP定位:', error);
      }
    } else {
      console.log('浏览器不支持地理位置API，尝试IP定位...');
    }

    // GPS定位失败或不可用，尝试IP定位作为备用方案
    console.log('开始尝试IP定位作为备用方案...');
    try {
      await this.getLocationByIP();
      return; // IP定位成功，直接返回
    } catch (ipError) {
      console.log('IP定位也失败，加载默认位置（北京）:', ipError);
      // 直接加载默认位置（北京）
      await this.loadBeijingWeather();
    }
  }

  // 显示位置获取提示
  showLocationPrompt() {
    this.hideLoading();
    // 不自动显示模态框，让用户手动点击位置名称来选择
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



    // 获取详细地址并获取天气数据
    this.showLoading('正在获取位置信息...');
    const detailedAddress = await this.getDetailedAddress(longitude, latitude);
    await this.fetchWeatherData(longitude, latitude, detailedAddress);
  }

  // 位置获取失败
  async onLocationError(error) {
    console.error('GPS定位失败:', error);

    let errorMessage = 'GPS定位失败';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'GPS位置访问被拒绝，尝试使用 IP 定位...';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'GPS位置信息不可用，尝试使用 IP 定位...';
        break;
      case error.TIMEOUT:
        errorMessage = 'GPS定位超时，尝试使用 IP 定位...';
        break;
    }

    this.showLoading(errorMessage);

    // 尝试 IP 定位作为备用方案
    try {
      await this.getLocationByIP();
    } catch (ipError) {
      console.error('IP 定位也失败:', ipError);
      // 显示更友好的错误信息和建议
      this.showError(`
        <div style="text-align: center;">
          <h3>🌍 无法自动获取位置</h3>
          <p>可能的原因：</p>
          <ul style="text-align: left; display: inline-block;">
            <li>GPS权限被拒绝</li>
            <li>网络连接问题</li>
            <li>位置服务被禁用</li>
            <li>防火墙或网络限制</li>
          </ul>
          <p><strong>正在为您显示北京天气，您也可以手动选择位置</strong></p>
        </div>
      `);

      // 直接加载默认位置（北京）
      await this.loadBeijingWeather();
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



      // 获取天气数据
      await this.fetchWeatherData(this.currentLocation.lng, this.currentLocation.lat, data.address);

    } catch (error) {
      console.error('IP 定位失败:', error);
      throw error;
    }
  }



  // 加载默认位置（北京）
  async loadBeijingWeather() {
    try {
      console.log('加载默认位置：北京');
      this.currentLocation = { lat: 39.9042, lng: 116.4074 };



      // 获取天气数据
      await this.fetchWeatherData(116.4074, 39.9042, '北京市');

    } catch (error) {
      console.error('加载默认位置失败:', error);
      // 如果连默认位置都失败了，显示最终错误
      this.showError('网络连接异常，请检查网络后重试');
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
    console.log(`开始获取天气数据: lng=${lng}, lat=${lat}, locationName=${locationName}`);

    if (this.isLoading) {
      console.log('已有请求在进行中，跳过');
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
    console.log('开始发送API请求...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('请求超时，中止请求');
        controller.abort();
      }, 10000); // 10秒超时

      console.log('发送fetch请求到:', `/api/weather?lng=${lng}&lat=${lat}`);
      const response = await fetch(`/api/weather?lng=${lng}&lat=${lat}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('收到响应:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('开始解析JSON...');
      const data = await response.json();
      console.log('JSON解析完成，数据:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      // 缓存数据
      this.setCachedData(lng, lat, data);

      this.weatherData = data;
      console.log('开始显示天气数据...');
      this.displayWeatherData(locationName);
      console.log('天气数据显示完成');

    } catch (error) {
      console.error('获取天气数据出错:', error);
      if (error.name === 'AbortError') {
        this.showError('请求超时，请检查网络连接');
      } else {
        console.error('获取天气数据失败:', error);
        this.showError(`获取天气数据失败: ${error.message}`);
      }
    } finally {
      this.isLoading = false;
      console.log('fetchWeatherData 完成，isLoading 设为 false');
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
    const modal = document.getElementById('locationModal');
    if (modal) {
      modal.style.display = 'flex';

      // 显示当前位置操作区域
      this.updateCurrentLocationActions();

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
      // 更新收藏列表
      this.updateFavoriteList();
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
      // 使用后端搜索API
      const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const results = data.results.slice(0, 5); // 最多显示5个结果

        searchResults.innerHTML = results.map(result => {
          return `
            <div class="search-result-item" data-lng="${result.lng}" data-lat="${result.lat}" data-name="${result.name}">
              <div style="font-weight: 500;">${result.name}</div>
              <div style="font-size: 0.875rem; color: #666; margin-top: 0.25rem;">
                ${result.address || ''}
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

    // 更新3天预报
    this.updateDailyForecast(daily);

    // 更新生活指数提醒
    this.updateWeatherTips(daily);

    // 更新位置和时间信息
    this.updateLocationInfo(forecast_keypoint, locationName);

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

    // 更新基于时间的背景
    this.updateTimeBasedBackground();

    // 应用天气特效
    this.weatherEffects.applyWeatherEffects(this.weatherData);
  }

  // 根据当前时间更新背景（白天/夜晚）
  updateTimeBasedBackground() {
    const body = document.body;
    const now = new Date();
    const hour = now.getHours();

    // 移除之前的时间背景类
    body.classList.remove('time-day', 'time-night');

    // 判断是白天还是夜晚
    // 白天：6:00-19:00 (6点到19点)
    // 夜晚：19:00-6:00 (19点到次日6点)
    if (hour >= 6 && hour < 19) {
      // 白天背景
      body.classList.add('time-day');
      console.log('应用白天背景，当前时间:', hour + ':00');
    } else {
      // 夜晚背景
      body.classList.add('time-night');
      console.log('应用夜晚背景，当前时间:', hour + ':00');
    }
  }

  // 更新空气质量信息
  updateAirQuality(airQuality) {
    if (!airQuality) return;

    const aqiValue = airQuality.aqi?.chn || '--';
    const aqiDesc = airQuality.description?.chn || '--';

    // 更新右上角的空气质量显示（如果存在）
    const aqiValueEl = document.getElementById('aqiValue');
    const aqiDescEl = document.getElementById('aqiDesc');
    if (aqiValueEl) aqiValueEl.textContent = aqiValue;
    if (aqiDescEl) aqiDescEl.textContent = aqiDesc;

    // 更新右侧主要显示区域
    const aqiValueLargeEl = document.getElementById('aqiValueLarge');
    const aqiDescLargeEl = document.getElementById('aqiDescLarge');
    if (aqiValueLargeEl) aqiValueLargeEl.textContent = aqiValue;
    if (aqiDescLargeEl) aqiDescLargeEl.textContent = aqiDesc;

    // 更新详细数据
    const pm25El = document.getElementById('pm25');
    const pm10El = document.getElementById('pm10');
    const o3El = document.getElementById('o3');
    if (pm25El) pm25El.textContent = `${airQuality.pm25 || '--'} μg/m³`;
    if (pm10El) pm10El.textContent = `${airQuality.pm10 || '--'} μg/m³`;
    if (o3El) o3El.textContent = `${airQuality.o3 || '--'} μg/m³`;
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

  // 更新3天预报
  updateDailyForecast(daily) {
    const container = document.getElementById('dailyForecast');
    if (!container || !daily) return;

    container.innerHTML = daily.map(item => `
      <div class="daily-item" data-weekday="${item.weekday}">
        <div class="daily-left">
          <div class="daily-relative-day">${item.relativeDay || item.weekday}</div>
          <div class="daily-weekday">${item.weekday}</div>
        </div>
        <div class="daily-right">
          <div class="daily-weather">
            <div class="daily-icon">${item.weather_info.icon}</div>
            <div class="daily-desc">${item.weather_info.desc}</div>
          </div>
          <div class="daily-temp-range">${item.min_temp}° / ${item.max_temp}°</div>
        </div>
      </div>
    `).join('');
  }

  // 更新生活指数提醒
  updateWeatherTips(daily) {
    if (!daily || !daily[0] || !daily[0].life_index) {
      return;
    }

    const todayLifeIndex = daily[0].life_index;
    const tips = [];

    // 生活指数图标映射
    const indexIcons = {
      ultraviolet: '☀️',
      carWashing: '🚗',
      dressing: '👕',
      comfort: '😊',
      coldRisk: '🤧'
    };

    // 生活指数名称映射
    const indexNames = {
      ultraviolet: '紫外线',
      carWashing: '洗车',
      dressing: '穿衣',
      comfort: '舒适度',
      coldRisk: '感冒'
    };

    // 生成提醒信息
    Object.keys(indexIcons).forEach(key => {
      const indexData = todayLifeIndex[key];
      if (indexData && indexData.desc && indexData.desc !== '暂无数据') {
        tips.push(`${indexIcons[key]} ${indexNames[key]}: ${indexData.desc}`);
      }
    });

    // 显示生活指数提醒
    if (tips.length > 0) {
      const tipsContainer = document.getElementById('weatherTips');
      const tipsCard = document.getElementById('weatherTipsCard');

      if (tipsContainer && tipsCard) {
        tipsContainer.innerHTML = tips.map(tip =>
          `<div class="weather-tip-item">${tip}</div>`
        ).join('');
        tipsCard.style.display = 'block';
      }
    }
  }

  // 更新位置和时间信息
  updateLocationInfo(forecastKeypoint, locationName = null) {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 使用提供的位置名称，如果没有则使用默认值
    const displayLocation = locationName || '当前位置';

    document.getElementById('currentLocation').textContent = displayLocation;
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

    // 支持HTML内容
    const errorMessageElement = document.getElementById('errorMessage');
    if (message.includes('<')) {
      errorMessageElement.innerHTML = message;
    } else {
      errorMessageElement.textContent = message;
    }
    

  }

  // 显示天气内容
  showWeatherContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('weatherContent').style.display = 'block';

    // 更新收藏和默认按钮状态
    this.updateLocationActionButtons();
  }

  // 本地存储相关方法
  loadFavoriteLocations() {
    try {
      const stored = localStorage.getItem('favoriteLocations');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('加载收藏位置失败:', error);
      return [];
    }
  }

  saveFavoriteLocations() {
    try {
      localStorage.setItem('favoriteLocations', JSON.stringify(this.favoriteLocations));
    } catch (error) {
      console.error('保存收藏位置失败:', error);
    }
  }

  loadDefaultLocation() {
    try {
      const stored = localStorage.getItem('defaultLocation');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('加载默认位置失败:', error);
      return null;
    }
  }

  saveDefaultLocation(location) {
    try {
      localStorage.setItem('defaultLocation', JSON.stringify(location));
      this.defaultLocation = location;
    } catch (error) {
      console.error('保存默认位置失败:', error);
    }
  }

  // 收藏功能
  toggleFavorite() {
    if (!this.currentLocation) return;

    const currentLocationName = document.getElementById('currentLocation').textContent;
    const locationData = {
      name: currentLocationName,
      lat: this.currentLocation.lat,
      lng: this.currentLocation.lng,
      address: currentLocationName
    };

    const existingIndex = this.favoriteLocations.findIndex(
      loc => Math.abs(loc.lat - locationData.lat) < 0.001 && Math.abs(loc.lng - locationData.lng) < 0.001
    );

    if (existingIndex >= 0) {
      // 取消收藏
      this.favoriteLocations.splice(existingIndex, 1);
    } else {
      // 添加收藏
      this.favoriteLocations.push(locationData);
    }

    this.saveFavoriteLocations();
    this.updateLocationActionButtons();
    this.updateFavoriteList();
  }

  // 设为默认/取消默认
  setAsDefault() {
    if (!this.currentLocation) return;

    // 检查是否为当前默认位置
    const isCurrentDefault = this.defaultLocation &&
      Math.abs(this.defaultLocation.lat - this.currentLocation.lat) < 0.001 &&
      Math.abs(this.defaultLocation.lng - this.currentLocation.lng) < 0.001;

    if (isCurrentDefault) {
      // 取消默认位置
      this.clearDefaultLocation();
    } else {
      // 设为默认位置
      const currentLocationName = document.getElementById('currentLocation').textContent;
      const locationData = {
        name: currentLocationName,
        lat: this.currentLocation.lat,
        lng: this.currentLocation.lng,
        address: currentLocationName
      };
      this.saveDefaultLocation(locationData);
    }

    this.updateLocationActionButtons();
    this.updateFavoriteList();
  }

  // 清除默认位置
  clearDefaultLocation() {
    try {
      localStorage.removeItem('defaultLocation');
      this.defaultLocation = null;
    } catch (error) {
      console.error('清除默认位置失败:', error);
    }
  }

  // 更新当前位置操作区域
  updateCurrentLocationActions() {
    const currentLocationActions = document.getElementById('currentLocationActions');
    const modalCurrentLocation = document.getElementById('modalCurrentLocation');

    if (!this.currentLocation || !currentLocationActions) return;

    // 显示当前位置操作区域
    currentLocationActions.style.display = 'block';

    // 更新当前位置显示
    const currentLocationName = document.getElementById('currentLocation')?.textContent || '当前位置';
    if (modalCurrentLocation) {
      modalCurrentLocation.textContent = currentLocationName;
    }

    // 更新按钮状态
    this.updateModalActionButtons();
  }

  // 更新模态框中的操作按钮状态
  updateModalActionButtons() {
    if (!this.currentLocation) return;

    const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
    const modalSetDefaultBtn = document.getElementById('modalSetDefaultBtn');

    // 检查是否已收藏
    const isFavorited = this.favoriteLocations.some(
      loc => Math.abs(loc.lat - this.currentLocation.lat) < 0.001 && Math.abs(loc.lng - this.currentLocation.lng) < 0.001
    );

    // 检查是否为默认位置
    const isDefault = this.defaultLocation &&
      Math.abs(this.defaultLocation.lat - this.currentLocation.lat) < 0.001 &&
      Math.abs(this.defaultLocation.lng - this.currentLocation.lng) < 0.001;

    if (modalFavoriteBtn) {
      modalFavoriteBtn.classList.toggle('active', isFavorited);
      modalFavoriteBtn.title = isFavorited ? '取消收藏' : '收藏此位置';
      modalFavoriteBtn.querySelector('.favorite-icon').textContent = isFavorited ? '⭐' : '☆';
      modalFavoriteBtn.querySelector('.action-text').textContent = isFavorited ? '取消收藏' : '收藏';
    }

    if (modalSetDefaultBtn) {
      modalSetDefaultBtn.classList.toggle('default', isDefault);
      modalSetDefaultBtn.title = isDefault ? '取消默认位置' : '设为默认位置';
      modalSetDefaultBtn.querySelector('.default-icon').textContent = isDefault ? '📍' : '📌';
      modalSetDefaultBtn.querySelector('.action-text').textContent = isDefault ? '取消默认' : '设为默认';
    }
  }

  // 更新位置操作按钮状态（保留用于兼容性，但现在主要更新模态框按钮）
  updateLocationActionButtons() {
    this.updateModalActionButtons();
  }

  // 更新收藏列表显示
  updateFavoriteList() {
    const favoriteLocations = document.getElementById('favoriteLocations');
    const favoriteList = document.getElementById('favoriteList');

    if (!favoriteList) return;

    if (this.favoriteLocations.length === 0) {
      favoriteLocations.style.display = 'none';
      return;
    }

    favoriteLocations.style.display = 'block';
    favoriteList.innerHTML = this.favoriteLocations.map((location, index) => {
      const isDefault = this.defaultLocation &&
        Math.abs(this.defaultLocation.lat - location.lat) < 0.001 &&
        Math.abs(this.defaultLocation.lng - location.lng) < 0.001;

      return `
        <div class="favorite-item ${isDefault ? 'default' : ''}" data-index="${index}">
          <div class="favorite-info">
            <div class="favorite-name">${location.name}</div>
            <div class="favorite-address">${location.address}</div>
          </div>
          <div class="favorite-actions">
            ${!isDefault ? `<button class="favorite-action-btn set-default" title="设为默认">📍</button>` : ''}
            <button class="favorite-action-btn delete" title="删除">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // 绑定收藏项点击事件
    favoriteList.querySelectorAll('.favorite-item').forEach(item => {
      const index = parseInt(item.dataset.index);
      const location = this.favoriteLocations[index];

      // 点击收藏项选择位置
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('favorite-action-btn')) return;
        this.selectLocation(location.lng, location.lat, location.name);
      });

      // 设为默认按钮
      const setDefaultBtn = item.querySelector('.set-default');
      if (setDefaultBtn) {
        setDefaultBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.saveDefaultLocation(location);
          this.updateFavoriteList();
        });
      }

      // 删除按钮
      const deleteBtn = item.querySelector('.delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.favoriteLocations.splice(index, 1);
          this.saveFavoriteLocations();
          this.updateFavoriteList();
          this.updateLocationActionButtons();
        });
      }
    });
  }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new WeatherApp();
});
