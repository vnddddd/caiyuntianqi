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
function formatWeatherData(rawData: any) {
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
      hourlyForecast = hourly.temperature.slice(0, 24).map((temp: any, index: number) => {
        const hour = new Date(Date.now() + index * 60 * 60 * 1000).getHours();
        const skyconValue = safeGet(hourly, `skycon.${index}.value`, 'CLEAR_DAY');

        return {
          time: hour,
          temperature: safeRound(safeGet(temp, 'value', 0)),
          skycon: skyconValue,
          weather_info: SKYCON_MAP[skyconValue] || { icon: "🌤️", desc: "未知" }
        };
      });
    }

    // 7天预报 - 添加数据验证
    let dailyForecast: any[] = [];
    if (daily && daily.temperature && Array.isArray(daily.temperature)) {
      dailyForecast = daily.temperature.slice(0, 7).map((temp: any, index: number) => {
        const date = new Date(Date.now() + index * 24 * 60 * 60 * 1000);
        const skyconValue = safeGet(daily, `skycon.${index}.value`, 'CLEAR_DAY');

        return {
          date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          weekday: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
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

  const url = `${CAIYUN_API_BASE}/${CAIYUN_API_TOKEN}/${longitude},${latitude}/weather?alert=true&dailysteps=7&hourlysteps=24`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }
    const rawData = await response.json();

    if (rawData.status !== "ok") {
      throw new Error(`API 返回错误: ${rawData.error || "未知错误"}`);
    }

    return formatWeatherData(rawData);
  } catch (error) {
    console.error("获取天气数据失败:", error);
    throw error;
  }
}

// IP 地理位置获取
async function getLocationByIP(clientIP?: string): Promise<{ lat: number; lng: number; address: string } | null> {
  try {
    // 使用免费的 IP 地理位置服务
    const ipApiUrl = clientIP
      ? `http://ip-api.com/json/${clientIP}?lang=zh-CN&fields=status,lat,lon,country,regionName,city,district`
      : `http://ip-api.com/json?lang=zh-CN&fields=status,lat,lon,country,regionName,city,district`;

    const response = await fetch(ipApiUrl);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        lat: data.lat,
        lng: data.lon,
        address: `${data.country} ${data.regionName} ${data.city}${data.district ? ' ' + data.district : ''}`
      };
    }

    return null;
  } catch (error) {
    console.error('IP 定位失败:', error);
    return null;
  }
}

// 地理编码 - 将经纬度转换为详细地址
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // 使用高德地理编码 API（免费，无需 key 的基础服务）
    const geocodeUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&output=json&radius=1000&extensions=all`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === '1' && data.regeocode) {
      const addressComponent = data.regeocode.addressComponent;
      const formatted = data.regeocode.formatted_address;

      // 构建详细地址
      let detailedAddress = '';
      if (addressComponent.province) detailedAddress += addressComponent.province;
      if (addressComponent.city && addressComponent.city !== addressComponent.province) {
        detailedAddress += ' ' + addressComponent.city;
      }
      if (addressComponent.district) detailedAddress += ' ' + addressComponent.district;
      if (addressComponent.township) detailedAddress += ' ' + addressComponent.township;

      return detailedAddress.trim() || formatted || '未知位置';
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
