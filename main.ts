/**
 * 彩云天气网站 - Deno Deploy 入口文件
 * 响应式天气查看应用，支持桌面端和移动端
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";

// 声明 Deno 全局对象类型
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
    readTextFile(path: string): Promise<string>;
  };
}

// 环境变量配置
const CAIYUN_API_TOKEN = Deno.env.get("CAIYUN_API_TOKEN") || "";
const AMAP_API_KEY = Deno.env.get("AMAP_API_KEY") || "";
const PORT = parseInt(Deno.env.get("PORT") || "8000");

// 彩云天气 API 基础配置
const CAIYUN_API_BASE = "https://api.caiyunapp.com/v2.6";

// 天气现象映射
const SKYCON_MAP: Record<string, { icon: string; desc: string }> = {
  "CLEAR_DAY": { icon: "☀️", desc: "晴" },
  "CLEAR_NIGHT": { icon: "🌙", desc: "晴夜" },
  "PARTLY_CLOUDY_DAY": { icon: "⛅", desc: "多云" },
  "PARTLY_CLOUDY_NIGHT": { icon: "☁️", desc: "多云夜" },
  "CLOUDY": { icon: "☁️", desc: "阴" },
  "LIGHT_HAZE": { icon: "🌫️", desc: "轻雾" },
  "MODERATE_HAZE": { icon: "🌫️", desc: "中雾" },
  "HEAVY_HAZE": { icon: "🌫️", desc: "重雾" },
  "LIGHT_RAIN": { icon: "🌦️", desc: "小雨" },
  "MODERATE_RAIN": { icon: "🌧️", desc: "中雨" },
  "HEAVY_RAIN": { icon: "⛈️", desc: "大雨" },
  "STORM_RAIN": { icon: "⛈️", desc: "暴雨" },
  "LIGHT_SNOW": { icon: "🌨️", desc: "小雪" },
  "MODERATE_SNOW": { icon: "❄️", desc: "中雪" },
  "HEAVY_SNOW": { icon: "❄️", desc: "大雪" },
  "STORM_SNOW": { icon: "❄️", desc: "暴雪" },
  "DUST": { icon: "🌪️", desc: "浮尘" },
  "SAND": { icon: "🌪️", desc: "沙尘" },
  "WIND": { icon: "💨", desc: "大风" }
};

// 数据验证辅助函数
function safeGet(obj: any, path: string, defaultValue: any = null) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : defaultValue;
  }, obj);
}

function safeRound(value: any, defaultValue: number = 0): number {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : Math.round(num);
}

// 格式化天气数据
function formatWeatherData(rawData: any, longitude: number) {
  try {
    const { result } = rawData;

    if (!result) {
      throw new Error("API 返回数据格式错误：缺少 result 字段");
    }

    const { realtime, hourly, daily } = result;

    if (!realtime) {
      throw new Error("API 返回数据格式错误：缺少实时天气数据");
    }

    // 当前天气 - 添加数据验证
    const current = {
      temperature: safeRound(realtime.temperature),
      apparent_temperature: safeRound(realtime.apparent_temperature),
      humidity: safeRound(safeGet(realtime, 'humidity', 0) * 100),
      wind_speed: safeRound(safeGet(realtime, 'wind.speed', 0) * 3.6), // m/s 转 km/h
      wind_direction: safeRound(safeGet(realtime, 'wind.direction', 0)),
      pressure: safeRound(safeGet(realtime, 'pressure', 101325) / 100), // Pa 转 hPa
      visibility: safeGet(realtime, 'visibility', 0),
      skycon: safeGet(realtime, 'skycon', 'CLEAR_DAY'),
      weather_info: SKYCON_MAP[realtime.skycon] || { icon: "🌤️", desc: "未知" },
      air_quality: safeGet(realtime, 'air_quality', {})
    };

    // 24小时预报 - 修复时间显示错误
    let hourlyForecast: any[] = [];
    if (hourly && hourly.temperature && Array.isArray(hourly.temperature)) {
      // 根据经度计算当地时区
      const timezoneOffset = Math.round(longitude / 15); // 经度每15度约等于1小时时差

      // 获取当地当前时间
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // 转换为UTC时间
      const localTime = new Date(utcTime + (timezoneOffset * 3600000)); // 转换为当地时间
      const currentHour = localTime.getHours();

      console.log(`经度: ${longitude}, 时区偏移: ${timezoneOffset}, 当地时间: ${localTime.toLocaleString()}, 当前小时: ${currentHour}`);

      hourlyForecast = hourly.temperature.slice(0, 24).map((temp: any, index: number) => {
        // 从当前小时开始计算，每小时递增
        const targetHour = (currentHour + index) % 24;
        const skyconValue = safeGet(hourly, `skycon.${index}.value`, 'CLEAR_DAY');

        return {
          time: targetHour,
          temperature: safeRound(safeGet(temp, 'value', 0)),
          skycon: skyconValue,
          weather_info: SKYCON_MAP[skyconValue] || { icon: "🌤️", desc: "未知" }
        };
      });
    }

    // 3天预报 - 添加数据验证
    let dailyForecast: any[] = [];
    if (daily && daily.temperature && Array.isArray(daily.temperature)) {
      dailyForecast = daily.temperature.slice(0, 3).map((temp: any, index: number) => {
        const date = new Date(Date.now() + index * 24 * 60 * 60 * 1000);
        const skyconValue = safeGet(daily, `skycon.${index}.value`, 'CLEAR_DAY');

        // 生成相对日期描述和星期几
        let relativeDay: string;
        if (index === 0) {
          relativeDay = '今天';
        } else if (index === 1) {
          relativeDay = '明天';
        } else if (index === 2) {
          relativeDay = '后天';
        } else {
          relativeDay = date.toLocaleDateString('zh-CN', { weekday: 'short' });
        }

        // 获取生活指数
        const lifeIndex = safeGet(daily, `life_index`, {});

        return {
          date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          weekday: date.toLocaleDateString('zh-CN', { weekday: 'short' }), // 星期几
          relativeDay: relativeDay, // 今天/明天/后天
          max_temp: safeRound(safeGet(temp, 'max', 0)),
          min_temp: safeRound(safeGet(temp, 'min', 0)),
          skycon: skyconValue,
          weather_info: SKYCON_MAP[skyconValue] || { icon: "🌤️", desc: "未知" },
          life_index: {
            ultraviolet: safeGet(lifeIndex, `ultraviolet.${index}`, { index: '', desc: '暂无数据' }),
            carWashing: safeGet(lifeIndex, `carWashing.${index}`, { index: '', desc: '暂无数据' }),
            dressing: safeGet(lifeIndex, `dressing.${index}`, { index: '', desc: '暂无数据' }),
            comfort: safeGet(lifeIndex, `comfort.${index}`, { index: '', desc: '暂无数据' }),
            coldRisk: safeGet(lifeIndex, `coldRisk.${index}`, { index: '', desc: '暂无数据' })
          }
        };
      });
    }

    return {
      current,
      hourly: hourlyForecast,
      daily: dailyForecast,
      forecast_keypoint: safeGet(result, 'forecast_keypoint', '暂无预报信息')
    };
  } catch (error) {
    console.error("数据格式化失败:", error);
    throw new Error(`数据处理失败: ${error.message}`);
  }
}

// 天气数据接口
async function getWeatherData(longitude: number, latitude: number) {
  if (!CAIYUN_API_TOKEN) {
    // 返回模拟的中雨天气数据用于测试
    console.log('🧪 使用模拟天气数据 (中雨)');
    return {
      current: {
        temperature: 26,
        apparent_temperature: 30,
        humidity: 87,
        wind_speed: 28,
        wind_direction: 0,
        pressure: 1007,
        visibility: 5.26,
        skycon: 'MODERATE_RAIN',
        weather_info: { icon: '🌧️', desc: '中雨' },
        air_quality: {
          aqi: { chn: 14 },
          description: { chn: '优' },
          pm25: 9,
          pm10: 14,
          o3: 19
        }
      },
      hourly: Array.from({ length: 24 }, (_, i) => ({
        time: (new Date().getHours() + i) % 24,
        temperature: 26 + Math.random() * 4 - 2,
        skycon: 'MODERATE_RAIN',
        weather_info: { icon: '🌧️', desc: '中雨' }
      })),
      daily: [
        {
          date: new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          weekday: '今天',
          relativeDay: '今天',
          max_temp: 29,
          min_temp: 24,
          skycon: 'MODERATE_RAIN',
          weather_info: { icon: '🌧️', desc: '中雨' },
          life_index: {
            ultraviolet: { index: '弱', desc: '辐射较弱，涂擦SPF12-15、PA+护肤品。' },
            carWashing: { index: '不宜', desc: '有雨，雨水和泥水会弄脏您的爱车。' },
            dressing: { index: '舒适', desc: '建议穿长袖衬衫单裤等服装。' },
            comfort: { index: '较舒适', desc: '白天有雨，会感到有点儿凉，但大部分人完全可以接受。' },
            coldRisk: { index: '少发', desc: '无明显降温，感冒机率较低。' }
          }
        }
      ],
      forecast_keypoint: '今天有中雨，注意携带雨具。'
    };
  }

  const url = `${CAIYUN_API_BASE}/${CAIYUN_API_TOKEN}/${longitude},${latitude}/weather?alert=true&dailysteps=3&hourlysteps=24`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }
    const rawData = await response.json();

    if (rawData.status !== "ok") {
      throw new Error(`API 返回错误: ${rawData.error || "未知错误"}`);
    }

    return formatWeatherData(rawData, longitude);
  } catch (error) {
    console.error("获取天气数据失败:", error);
    throw error;
  }
}

// IP 地理位置获取 - 使用多个备用接口
async function getLocationByIP(clientIP?: string): Promise<{ lat: number; lng: number; address: string } | null> {
  // 定义多个IP定位服务（按准确度和详细程度排序）
  const ipServices = [
    // 服务1: 美团接口（国内最详细，包含区县级信息）
    async () => {
      // 美团API需要真实的外网IP，跳过本地IP
      if (!clientIP || clientIP === 'auto' || clientIP.startsWith('127.') || clientIP.startsWith('192.168.') || clientIP.startsWith('10.') || clientIP === '::1') {
        throw new Error('美团API需要真实外网IP，跳过本地IP检测');
      }

      const ipApiUrl = `https://apimobile.meituan.com/locate/v2/ip/loc?rgeo=true&ip=${clientIP}`;
      console.log('美团API请求URL:', ipApiUrl);

      const response = await fetch(ipApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.meituan.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Origin': 'https://www.meituan.com'
        }
      });

      if (!response.ok) throw new Error(`美团API HTTP错误: ${response.status}`);

      const data = await response.json();
      console.log('美团API响应数据:', data);

      // 检查是否有错误
      if (data.error) {
        throw new Error(`美团API返回错误: ${data.error.message || data.error.type || '未知错误'}`);
      }

      if (data.data && data.data.lat && data.data.lng) {
        const { lat, lng, rgeo } = data.data;
        let address = '未知位置';

        // 美团API提供最详细的地址信息
        if (rgeo) {
          const addressParts = [];
          if (rgeo.country) addressParts.push(rgeo.country);
          if (rgeo.province && rgeo.province !== rgeo.city) addressParts.push(rgeo.province);
          if (rgeo.city) addressParts.push(rgeo.city);
          if (rgeo.district) addressParts.push(rgeo.district);
          if (rgeo.street) addressParts.push(rgeo.street);
          if (rgeo.town) addressParts.push(rgeo.town);

          address = addressParts.join(' ').trim();
        }

        return {
          lat,
          lng,
          address: address || '未知位置'
        };
      }
      throw new Error(`美团API返回数据格式错误: ${JSON.stringify(data)}`);
    },

    // 服务2: ip-api.com (免费，支持中文，稳定)
    async () => {
      const ipApiUrl = clientIP && clientIP !== 'auto' && !clientIP.startsWith('127.') && !clientIP.startsWith('192.168.') && !clientIP.startsWith('10.') && clientIP !== '::1'
        ? `http://ip-api.com/json/${clientIP}?lang=zh-CN&fields=status,lat,lon,country,regionName,city,district,zip,timezone`
        : `http://ip-api.com/json?lang=zh-CN&fields=status,lat,lon,country,regionName,city,district,zip,timezone`;

      console.log('ip-api请求URL:', ipApiUrl);
      const response = await fetch(ipApiUrl);
      if (!response.ok) throw new Error(`ip-api HTTP错误: ${response.status}`);

      const data = await response.json();
      console.log('ip-api响应数据:', data);

      if (data.status === 'success' && data.lat && data.lon) {
        const addressParts = [];
        if (data.country) addressParts.push(data.country);
        if (data.regionName) addressParts.push(data.regionName);
        if (data.city) addressParts.push(data.city);
        if (data.district) addressParts.push(data.district);

        return {
          lat: data.lat,
          lng: data.lon,
          address: addressParts.join(' ').trim() || '未知位置'
        };
      }
      throw new Error(`ip-api返回失败: ${data.status || '未知错误'}, message: ${data.message || '无详细信息'}`);
    },

    // 服务3: ipinfo.io (备用)
    async () => {
      const ipApiUrl = clientIP && clientIP !== 'auto' && !clientIP.startsWith('127.') && !clientIP.startsWith('192.168.') && !clientIP.startsWith('10.') && clientIP !== '::1'
        ? `https://ipinfo.io/${clientIP}/json`
        : `https://ipinfo.io/json`;

      console.log('ipinfo请求URL:', ipApiUrl);
      const response = await fetch(ipApiUrl);
      if (!response.ok) throw new Error(`ipinfo HTTP错误: ${response.status}`);

      const data = await response.json();
      console.log('ipinfo响应数据:', data);

      if (data.loc && typeof data.loc === 'string' && data.loc.includes(',')) {
        const [lat, lng] = data.loc.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          const addressParts = [];
          if (data.country) addressParts.push(data.country);
          if (data.region) addressParts.push(data.region);
          if (data.city) addressParts.push(data.city);

          return {
            lat,
            lng,
            address: addressParts.join(' ').trim() || '未知位置'
          };
        }
      }
      throw new Error(`ipinfo返回数据格式错误: loc=${data.loc}, 完整数据=${JSON.stringify(data)}`);
    }
  ];

  // 依次尝试各个服务
  for (let i = 0; i < ipServices.length; i++) {
    try {
      console.log(`尝试IP定位服务 ${i + 1}...`);
      const result = await ipServices[i]();
      console.log(`IP定位服务 ${i + 1} 成功:`, result);
      return result;
    } catch (error) {
      console.log(`IP定位服务 ${i + 1} 失败:`, error.message);
      // 继续尝试下一个服务
    }
  }

  console.error('所有IP定位服务都失败了');
  return null;
}

// 地理编码 - 将经纬度转换为详细地址 - 使用美团接口
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // 使用美团地理编码 API
    const geocodeUrl = `https://apimobile.meituan.com/group/v1/city/latlng/${lat},${lng}?tag=0`;

    const response = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.meituan.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.data) {
      const { country, province, city, district, areaName, detail } = data.data;

      // 构建详细地址
      let detailedAddress = '';
      if (country) detailedAddress += country;
      if (province && province !== city) detailedAddress += ' ' + province;
      if (city) detailedAddress += ' ' + city;
      if (district) detailedAddress += ' ' + district;
      if (areaName) detailedAddress += ' ' + areaName;
      if (detail) detailedAddress += ' ' + detail;

      return detailedAddress.trim() || '未知位置';
    }

    // 备用：使用免费的 OpenStreetMap Nominatim 服务
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-CN`;
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'CaiyunWeatherApp/1.0' }
    });
    const nominatimData = await nominatimResponse.json();

    if (nominatimData.display_name) {
      return nominatimData.display_name;
    }

    return '未知位置';
  } catch (error) {
    console.error('地理编码失败:', error);
    return '未知位置';
  }
}

// 位置搜索功能 - 增强版，包含超时处理和备用方案
async function searchLocation(query: string): Promise<Array<{lat: number, lng: number, name: string, address: string}>> {
  // 常见城市数据库 - 作为主要搜索源
  const commonCities = [
    { name: '北京', lat: 39.9042, lng: 116.4074, address: '中国 北京市' },
    { name: '上海', lat: 31.2304, lng: 121.4737, address: '中国 上海市' },
    { name: '广州', lat: 23.1291, lng: 113.2644, address: '中国 广东省 广州市' },
    { name: '深圳', lat: 22.5431, lng: 114.0579, address: '中国 广东省 深圳市' },
    { name: '杭州', lat: 30.2741, lng: 120.1551, address: '中国 浙江省 杭州市' },
    { name: '南京', lat: 32.0603, lng: 118.7969, address: '中国 江苏省 南京市' },
    { name: '成都', lat: 30.5728, lng: 104.0668, address: '中国 四川省 成都市' },
    { name: '西安', lat: 34.3416, lng: 108.9398, address: '中国 陕西省 西安市' },
    { name: '武汉', lat: 30.5928, lng: 114.3055, address: '中国 湖北省 武汉市' },
    { name: '重庆', lat: 29.5647, lng: 106.5507, address: '中国 重庆市' },
    { name: '天津', lat: 39.3434, lng: 117.3616, address: '中国 天津市' },
    { name: '苏州', lat: 31.2989, lng: 120.5853, address: '中国 江苏省 苏州市' },
    { name: '青岛', lat: 36.0986, lng: 120.3719, address: '中国 山东省 青岛市' },
    { name: '大连', lat: 38.9140, lng: 121.6147, address: '中国 辽宁省 大连市' },
    { name: '厦门', lat: 24.4798, lng: 118.0894, address: '中国 福建省 厦门市' },
    { name: '长沙', lat: 28.2282, lng: 112.9388, address: '中国 湖南省 长沙市' },
    { name: '济南', lat: 36.6512, lng: 117.1201, address: '中国 山东省 济南市' },
    { name: '哈尔滨', lat: 45.8038, lng: 126.5349, address: '中国 黑龙江省 哈尔滨市' },
    { name: '郑州', lat: 34.7466, lng: 113.6254, address: '中国 河南省 郑州市' },
    { name: '长春', lat: 43.8171, lng: 125.3235, address: '中国 吉林省 长春市' },
    { name: '沈阳', lat: 41.8057, lng: 123.4315, address: '中国 辽宁省 沈阳市' },
    { name: '昆明', lat: 25.0389, lng: 102.7183, address: '中国 云南省 昆明市' },
    { name: '福州', lat: 26.0745, lng: 119.2965, address: '中国 福建省 福州市' },
    { name: '无锡', lat: 31.4912, lng: 120.3124, address: '中国 江苏省 无锡市' },
    { name: '合肥', lat: 31.8206, lng: 117.2272, address: '中国 安徽省 合肥市' },
    { name: '石家庄', lat: 38.0428, lng: 114.5149, address: '中国 河北省 石家庄市' },
    { name: '宁波', lat: 29.8683, lng: 121.5440, address: '中国 浙江省 宁波市' },
    { name: '佛山', lat: 23.0218, lng: 113.1219, address: '中国 广东省 佛山市' },
    { name: '东莞', lat: 23.0489, lng: 113.7447, address: '中国 广东省 东莞市' },
    { name: '温州', lat: 28.0000, lng: 120.6667, address: '中国 浙江省 温州市' },
    { name: '泉州', lat: 24.8740, lng: 118.6757, address: '中国 福建省 泉州市' },
    { name: '烟台', lat: 37.5365, lng: 121.3914, address: '中国 山东省 烟台市' },
    { name: '嘉兴', lat: 30.7467, lng: 120.7550, address: '中国 浙江省 嘉兴市' },
    { name: '金华', lat: 29.1028, lng: 119.6472, address: '中国 浙江省 金华市' },
    { name: '台州', lat: 28.6568, lng: 121.4281, address: '中国 浙江省 台州市' },
    { name: '绍兴', lat: 30.0023, lng: 120.5810, address: '中国 浙江省 绍兴市' },
    { name: '湖州', lat: 30.8703, lng: 120.0937, address: '中国 浙江省 湖州市' },
    { name: '丽水', lat: 28.4517, lng: 119.9219, address: '中国 浙江省 丽水市' },
    { name: '衢州', lat: 28.9700, lng: 118.8733, address: '中国 浙江省 衢州市' },
    { name: '舟山', lat: 30.0360, lng: 122.2070, address: '中国 浙江省 舟山市' }
  ];

  // 首先在本地城市数据库中搜索
  const localMatches = commonCities.filter(city =>
    city.name.includes(query) ||
    query.includes(city.name) ||
    city.address.includes(query)
  );

  // 如果本地匹配到结果，直接返回
  if (localMatches.length > 0) {
    return localMatches;
  }

  // 如果本地没有匹配，尝试在线搜索（优先高德，备用其他服务）

  // 1. 首先尝试高德地图API（国内最准确最快）
  if (AMAP_API_KEY) {
    try {
      console.log('尝试高德地图搜索:', query);
      const amapUrl = `https://restapi.amap.com/v3/place/text?key=${AMAP_API_KEY}&keywords=${encodeURIComponent(query)}&types=&city=&children=1&offset=10&page=1&extensions=all`;

      // 创建带超时的fetch请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

      const response = await fetch(amapUrl, {
        headers: { 'User-Agent': 'CaiyunWeatherApp/1.0' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.status === '1' && data.pois && data.pois.length > 0) {
          console.log('高德地图搜索成功，找到', data.pois.length, '个结果');
          return data.pois.slice(0, 5).map((poi: any) => {
            const [lng, lat] = poi.location.split(',').map(Number);
            return {
              lat: lat,
              lng: lng,
              name: poi.name,
              address: `${poi.pname || ''} ${poi.cityname || ''} ${poi.adname || ''} ${poi.address || ''}`.trim()
            };
          });
        } else {
          console.log('高德地图搜索无结果:', data.info || '未知原因');
        }
      }
    } catch (error) {
      console.error('高德地图搜索失败:', error);
    }
  }

  // 2. 备用：尝试Photon API（基于OpenStreetMap，免费无限制）
  try {
    console.log('尝试Photon地理编码搜索:', query);
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;

    // 创建带超时的fetch请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

    const response = await fetch(photonUrl, {
      headers: { 'User-Agent': 'CaiyunWeatherApp/1.0' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        console.log('Photon搜索成功');
        return data.features.slice(0, 5).map((feature: any) => {
          const { coordinates } = feature.geometry;
          const { properties } = feature;
          return {
            lat: coordinates[1],
            lng: coordinates[0],
            name: properties.name || properties.city || properties.state,
            address: `${properties.country || ''} ${properties.state || ''} ${properties.city || ''} ${properties.name || ''}`.trim()
          };
        });
      }
    }
  } catch (error) {
    console.error('Photon搜索失败:', error);
  }

  // 2. 备用：尝试OpenStreetMap Nominatim
  try {
    console.log('尝试OpenStreetMap搜索:', query);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=zh-CN&countrycodes=cn`;

    // 创建带超时的fetch请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    const response = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'CaiyunWeatherApp/1.0' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        console.log('OpenStreetMap搜索成功');
        return data.map((item: any) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name
        }));
      }
    }
  } catch (error) {
    console.error('OpenStreetMap搜索失败，使用本地备用方案:', error);
  }

  // 如果在线搜索失败，返回模糊匹配的结果
  const fuzzyMatches = commonCities.filter(city => {
    const cityName = city.name.toLowerCase();
    const queryLower = query.toLowerCase();
    return cityName.includes(queryLower) ||
           queryLower.includes(cityName) ||
           city.address.toLowerCase().includes(queryLower);
  });

  return fuzzyMatches.length > 0 ? fuzzyMatches : [];
}

// 获取客户端真实IP的辅助函数
function getClientIP(req: Request, info?: Deno.ServeHandlerInfo): string {
  // 优先从Caddy传递的头字段获取真实IP
  const possibleHeaders = [
    'x-real-ip',           // Caddy设置的真实IP
    'x-forwarded-for',     // 标准的转发IP头
    'cf-connecting-ip',    // Cloudflare
    'x-client-ip',         // 其他代理
    'x-forwarded',
    'forwarded-for',
    'forwarded',
    'true-client-ip',
    'x-cluster-client-ip'
  ];

  for (const header of possibleHeaders) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for 可能包含多个IP，取第一个
      let ip = value.split(',')[0].trim();

      // 移除端口号（如果存在）
      if (ip.includes(':') && !ip.includes('::')) {
        // IPv4地址可能包含端口，移除端口部分
        ip = ip.split(':')[0];
      }

      if (ip && ip !== 'unknown' && ip !== '127.0.0.1' && ip !== 'localhost') {
        console.log(`从头字段 ${header} 获取到IP: ${ip}`);
        return ip;
      }
    }
  }

  // 最后尝试从Deno.ServeHandlerInfo获取IP
  if (info && info.remoteAddr) {
    const remoteAddr = info.remoteAddr;
    if ('hostname' in remoteAddr && remoteAddr.hostname) {
      let ip = remoteAddr.hostname;

      // 移除端口号（如果存在）
      if (ip.includes(':') && !ip.includes('::')) {
        ip = ip.split(':')[0];
      }

      if (ip !== '127.0.0.1' && ip !== 'localhost') {
        console.log(`从remoteAddr获取到IP: ${ip}`);
        return ip;
      }
    }
  }

  console.log('未能获取到有效的客户端IP，使用auto');
  return 'auto';
}

// 路由处理器
async function handler(req: Request, info: Deno.ServeHandlerInfo): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  // IP 定位 API
  if (pathname === "/api/location/ip") {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // 使用改进的IP获取函数
      const clientIP = getClientIP(req, info);



      const location = await getLocationByIP(clientIP === 'auto' ? undefined : clientIP);

      if (location) {
        return new Response(
          JSON.stringify(location),
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "无法获取 IP 位置信息" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }
  }

  // 地理编码 API
  if (pathname === "/api/location/geocode") {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "缺少经纬度参数" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    try {
      const address = await reverseGeocode(parseFloat(lat), parseFloat(lng));

      return new Response(
        JSON.stringify({ address }),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }
  }

  // 位置搜索 API
  if (pathname === "/api/location/search") {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const query = url.searchParams.get("q");

    if (!query) {
      return new Response(
        JSON.stringify({ error: "缺少搜索关键词" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    try {
      const results = await searchLocation(query);

      return new Response(
        JSON.stringify({ results }),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }
  }

  // API 路由
  if (pathname === "/api/weather") {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const longitude = url.searchParams.get("lng");
    const latitude = url.searchParams.get("lat");

    if (!longitude || !latitude) {
      return new Response(
        JSON.stringify({ error: "缺少经纬度参数" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    try {
      const weatherData = await getWeatherData(
        parseFloat(longitude),
        parseFloat(latitude)
      );
      
      return new Response(
        JSON.stringify(weatherData),
        {
          headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }
  }

  // favicon.ico 处理
  if (pathname === "/favicon.ico") {
    // 返回一个简单的天气图标作为favicon
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌤️</text></svg>`;
    return new Response(svgIcon, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400" // 缓存1天
      }
    });
  }

  // 静态文件服务
  if (pathname === "/" || pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile("./static/index.html");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch {
      return new Response("页面未找到", { status: 404 });
    }
  }



  // 其他静态资源
  if (pathname.startsWith("/static/")) {
    try {
      return await serveDir(req, {
        fsRoot: ".",
        urlRoot: "",
      });
    } catch {
      return new Response("文件未找到", { status: 404 });
    }
  }

  return new Response("页面未找到", { status: 404 });
}

// 启动服务器
console.log(`🌤️  彩云天气网站启动中...`);
console.log(`🚀 服务器运行在: http://localhost:${PORT}`);
console.log(`📡 API Token 状态: ${CAIYUN_API_TOKEN ? "已配置" : "未配置"}`);

await serve(handler, { port: PORT });
