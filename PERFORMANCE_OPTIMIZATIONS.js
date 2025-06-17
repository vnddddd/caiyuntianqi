/**
 * 天气应用性能优化示例代码
 * 解决代码审查中发现的关键性能问题
 */

// 1. 优化的WeatherApp类 - 解决内存泄漏和性能问题
class OptimizedWeatherApp {
  constructor() {
    this.currentLocation = null;
    this.weatherData = null;
    
    // 优化：LRU缓存，限制大小
    this.cache = new LRUCache(50, 5 * 60 * 1000); // 最多50项，5分钟过期
    
    // 优化：缓存DOM元素引用
    this.domElements = {};
    
    // 优化：跟踪事件监听器以便清理
    this.eventListeners = [];
    
    // 优化：请求队列防止重复请求
    this.requestQueue = new Map();
    
    this.isLoading = false;
    this.favoriteLocations = this.loadFavoriteLocations();
    this.defaultLocation = this.loadDefaultLocation();

    this.init();
  }

  // 优化：初始化时缓存DOM元素
  cacheDOMElements() {
    const elements = [
      'currentTemp', 'weatherIcon', 'weatherDesc', 'feelsLike',
      'humidity', 'windSpeed', 'visibility', 'pressure',
      'currentLocation', 'updateTime', 'loadingState',
      'errorState', 'weatherContent', 'hourlyForecast', 'dailyForecast'
    ];
    
    elements.forEach(id => {
      this.domElements[id] = document.getElementById(id);
    });
  }

  // 优化：安全的事件监听器绑定
  addEventListenerSafe(element, event, handler, options = {}) {
    if (element) {
      element.addEventListener(event, handler, options);
      this.eventListeners.push({ element, event, handler });
    }
  }

  // 优化：清理资源
  cleanup() {
    // 清理事件监听器
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    
    // 清理缓存
    this.cache.clear();
    
    // 取消所有进行中的请求
    this.requestQueue.forEach(controller => controller.abort());
    this.requestQueue.clear();
  }

  // 优化：防重复请求的API调用
  async fetchWeatherDataOptimized(lng, lat, locationName = null) {
    const requestKey = `${lng.toFixed(4)}_${lat.toFixed(4)}`;
    
    // 检查是否有相同请求正在进行
    if (this.requestQueue.has(requestKey)) {
      console.log('相同请求正在进行中，等待结果...');
      return this.requestQueue.get(requestKey).promise;
    }
    
    // 检查缓存
    const cachedData = this.cache.get(requestKey);
    if (cachedData) {
      console.log('使用缓存数据');
      this.weatherData = cachedData;
      this.displayWeatherData(locationName);
      return;
    }

    // 创建新请求
    const controller = new AbortController();
    const promise = this._performWeatherRequest(lng, lat, controller.signal);
    
    this.requestQueue.set(requestKey, { controller, promise });
    
    try {
      const data = await promise;
      
      // 缓存结果
      this.cache.set(requestKey, data);
      
      this.weatherData = data;
      this.displayWeatherData(locationName);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.handleError(error, '获取天气数据');
      }
    } finally {
      this.requestQueue.delete(requestKey);
      this.isLoading = false;
    }
  }

  // 优化：统一错误处理
  handleError(error, context) {
    console.error(`${context}失败:`, error);
    
    let userMessage = '网络连接异常，请检查网络后重试';
    
    if (error.message.includes('timeout')) {
      userMessage = '请求超时，请重试';
    } else if (error.message.includes('404')) {
      userMessage = '服务暂时不可用，请稍后重试';
    } else if (error.message.includes('permission')) {
      userMessage = '权限被拒绝，请检查设置';
    }
    
    this.showError(userMessage);
  }

  // 优化：数值验证函数
  validateNumber(value, defaultValue = 0, min = -Infinity, max = Infinity) {
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  // 优化：批量更新DOM以减少重排
  updateCurrentWeatherOptimized(current) {
    // 使用DocumentFragment批量更新
    const updates = [
      { element: this.domElements.currentTemp, content: current.temperature },
      { element: this.domElements.weatherIcon, content: current.weather_info.icon },
      { element: this.domElements.weatherDesc, content: current.weather_info.desc },
      { element: this.domElements.feelsLike, content: `体感温度 ${current.apparent_temperature}°C` },
      { element: this.domElements.humidity, content: `${current.humidity}%` },
      { element: this.domElements.windSpeed, content: `${current.wind_speed} km/h` },
      { element: this.domElements.visibility, content: `${current.visibility} km` },
      { element: this.domElements.pressure, content: `${current.pressure} hPa` }
    ];

    // 批量更新，减少DOM操作
    requestAnimationFrame(() => {
      updates.forEach(({ element, content }) => {
        if (element) element.textContent = content;
      });
      
      // 更新背景
      this.updateTimeBasedBackground();
    });
  }
}

// 2. LRU缓存实现
class LRUCache {
  constructor(maxSize = 50, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // 移到最前面（LRU）
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.data;
  }

  set(key, data) {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 如果超过最大大小，删除最旧的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

// 3. 防抖函数 - 优化搜索性能
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 4. 节流函数 - 优化滚动和resize事件
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// 5. 性能监控工具
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      loadTimes: []
    };
  }

  recordAPICall() {
    this.metrics.apiCalls++;
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  recordError() {
    this.metrics.errors++;
  }

  recordLoadTime(time) {
    this.metrics.loadTimes.push(time);
    // 只保留最近100次记录
    if (this.metrics.loadTimes.length > 100) {
      this.metrics.loadTimes.shift();
    }
  }

  getStats() {
    const avgLoadTime = this.metrics.loadTimes.length > 0 
      ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length 
      : 0;
    
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      averageLoadTime: avgLoadTime.toFixed(2),
      cacheHitRate: `${cacheHitRate}%`
    };
  }
}

// 6. 使用示例
/*
// 初始化优化后的应用
const weatherApp = new OptimizedWeatherApp();

// 初始化性能监控
const perfMonitor = new PerformanceMonitor();

// 在页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  weatherApp.cleanup();
});

// 优化的搜索函数
const optimizedSearch = debounce(async (query) => {
  const startTime = performance.now();
  try {
    await weatherApp.searchLocation(query);
    perfMonitor.recordLoadTime(performance.now() - startTime);
  } catch (error) {
    perfMonitor.recordError();
    weatherApp.handleError(error, '搜索位置');
  }
}, 300);

// 定期输出性能统计
setInterval(() => {
  console.log('性能统计:', perfMonitor.getStats());
}, 60000); // 每分钟输出一次
*/

export { OptimizedWeatherApp, LRUCache, PerformanceMonitor, debounce, throttle };
