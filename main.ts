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

    // 24小时预报 - 添加数据验证
    let hourlyForecast: any[] = [];
    if (hourly && hourly.temperature && Array.isArray(hourly.temperature)) {
      // 获取当前时间，并根据经纬度估算时区
      const now = new Date();
      // 简单的时区估算：经度每15度约等于1小时时差
      const timezoneOffset = Math.round(longitude / 15);

      hourlyForecast = hourly.temperature.slice(0, 24).map((temp: any, index: number) => {
        // 计算本地时间（考虑时区）
        const utcTime = new Date(now.getTime() + index * 60 * 60 * 1000);
        const localTime = new Date(utcTime.getTime() + timezoneOffset * 60 * 60 * 1000);
        const hour = localTime.getHours();
        const skyconValue = safeGet(hourly, `skycon.${index}.value`, 'CLEAR_DAY');

        return {
          time: hour,
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

        return {
          date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          weekday: date.toLocaleDateString('zh-CN', { weekday: 'short' }), // 星期几
          relativeDay: relativeDay, // 今天/明天/后天
          max_temp: safeRound(safeGet(temp, 'max', 0)),
          min_temp: safeRound(safeGet(temp, 'min', 0)),
          skycon: skyconValue,
          weather_info: SKYCON_MAP[skyconValue] || { icon: "🌤️", desc: "未知" }
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
    throw new Error("彩云天气 API Token 未配置");
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
  // 定义多个IP定位服务（按准确度排序）
  const ipServices = [
    // 服务1: 腾讯位置服务（国内最准确）
    async () => {
      const ipApiUrl = clientIP
        ? `https://apis.map.qq.com/ws/location/v1/ip?ip=${clientIP}&key=OB4BZ-D4W3U-B7VVO-4PJWW-6TKDJ-WPB77`
        : `https://apis.map.qq.com/ws/location/v1/ip?key=OB4BZ-D4W3U-B7VVO-4PJWW-6TKDJ-WPB77`;

      const response = await fetch(ipApiUrl);
      if (!response.ok) throw new Error(`腾讯API: ${response.status}`);

      const data = await response.json();
      if (data.status === 0 && data.result) {
        const { location, ad_info } = data.result;
        return {
          lat: location.lat,
          lng: location.lng,
          address: `${ad_info.nation || ''} ${ad_info.province || ''} ${ad_info.city || ''} ${ad_info.district || ''}`.trim() || '未知位置'
        };
      }
      throw new Error('腾讯API返回错误');
    },

    // 服务2: 美团接口
    async () => {
      const ipApiUrl = clientIP
        ? `https://apimobile.meituan.com/locate/v2/ip/loc?rgeo=true&ip=${clientIP}`
        : `https://apimobile.meituan.com/locate/v2/ip/loc?rgeo=true`;

      const response = await fetch(ipApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.meituan.com/'
        }
      });

      if (!response.ok) throw new Error(`美团API: ${response.status}`);

      const data = await response.json();
      if (data.data && data.data.lat && data.data.lng) {
        const { lat, lng, rgeo } = data.data;
        let address = '未知位置';
        if (rgeo) {
          address = `${rgeo.country || ''} ${rgeo.province || ''} ${rgeo.city || ''} ${rgeo.district || ''}`.trim();
        }
        return { lat, lng, address: address || '未知位置' };
      }
      throw new Error('美团API返回数据格式错误');
    },

    // 服务3: ip-api.com (免费，支持中文)
    async () => {
      const ipApiUrl = clientIP
        ? `http://ip-api.com/json/${clientIP}?lang=zh-CN&fields=status,lat,lon,country,regionName,city,district`
        : `http://ip-api.com/json?lang=zh-CN&fields=status,lat,lon,country,regionName,city,district`;

      const response = await fetch(ipApiUrl);
      if (!response.ok) throw new Error(`ip-api: ${response.status}`);

      const data = await response.json();
      if (data.status === 'success') {
        return {
          lat: data.lat,
          lng: data.lon,
          address: `${data.country} ${data.regionName} ${data.city}${data.district ? ' ' + data.district : ''}`
        };
      }
      throw new Error('ip-api返回失败状态');
    },

    // 服务4: ipinfo.io (备用)
    async () => {
      const ipApiUrl = clientIP
        ? `https://ipinfo.io/${clientIP}/json`
        : `https://ipinfo.io/json`;

      const response = await fetch(ipApiUrl);
      if (!response.ok) throw new Error(`ipinfo: ${response.status}`);

      const data = await response.json();
      if (data.loc) {
        const [lat, lng] = data.loc.split(',').map(Number);
        return {
          lat,
          lng,
          address: `${data.country || ''} ${data.region || ''} ${data.city || ''}`.trim() || '未知位置'
        };
      }
      throw new Error('ipinfo返回数据格式错误');
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

// 位置搜索功能
async function searchLocation(query: string): Promise<Array<{lat: number, lng: number, name: string, address: string}>> {
  try {
    // 首先尝试使用 OpenStreetMap Nominatim 服务进行搜索
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=zh-CN&countrycodes=cn`;

    const response = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'CaiyunWeatherApp/1.0' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        name: item.display_name.split(',')[0].trim(),
        address: item.display_name
      }));
    }

    // 如果没有结果，返回一些常见城市的匹配
    const commonCities = [
      { name: '北京', lat: 39.9042, lng: 116.4074, address: '中国 北京市' },
      { name: '上海', lat: 31.2304, lng: 121.4737, address: '中国 上海市' },
      { name: '广州', lat: 23.1291, lng: 113.2644, address: '中国 广东省 广州市' },
      { name: '深圳', lat: 22.5431, lng: 114.0579, address: '中国 广东省 深圳市' },
      { name: '杭州', lat: 30.2741, lng: 120.1551, address: '中国 浙江省 杭州市' },
      { name: '南京', lat: 32.0603, lng: 118.7969, address: '中国 江苏省 南京市' },
      { name: '成都', lat: 30.5728, lng: 104.0668, address: '中国 四川省 成都市' },
      { name: '西安', lat: 34.3416, lng: 108.9398, address: '中国 陕西省 西安市' }
    ];

    const matchedCities = commonCities.filter(city =>
      city.name.includes(query) || query.includes(city.name)
    );

    return matchedCities;
  } catch (error) {
    console.error('位置搜索失败:', error);
    return [];
  }
}

// 路由处理器
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  // IP 定位 API
  if (pathname === "/api/location/ip") {
    if (req.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // 获取客户端 IP
      const clientIP = req.headers.get('x-forwarded-for') ||
                      req.headers.get('x-real-ip') ||
                      'auto';

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
