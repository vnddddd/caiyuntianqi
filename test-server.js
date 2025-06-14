const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

// MIME 类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 模拟天气数据
const mockWeatherData = {
  current: {
    temperature: 25,
    humidity: 60,
    wind_speed: 12,
    weather_info: {
      icon: "☀️",
      desc: "晴"
    },
    air_quality: {
      pm25: 35,
      pm10: 45,
      aqi: 85,
      description: "良"
    }
  },
  hourly: Array.from({length: 24}, (_, i) => ({
    datetime: new Date(Date.now() + i * 3600000).toISOString(),
    temperature: 20 + Math.random() * 10,
    weather: Math.random() > 0.5 ? "晴" : "多云",
    icon: Math.random() > 0.5 ? "☀️" : "☁️"
  })),
  daily: Array.from({length: 7}, (_, i) => ({
    date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
    weather: Math.random() > 0.5 ? "晴" : "多云",
    icon: Math.random() > 0.5 ? "☀️" : "☁️",
    temp_max: 25 + Math.random() * 5,
    temp_min: 15 + Math.random() * 5
  })),
  forecast_keypoint: "未来两小时不会下雨"
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // API 路由
  if (pathname === '/api/weather') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(mockWeatherData));
    return;
  }

  if (pathname === '/api/location/ip') {
    const mockLocationData = {
      lat: 39.9042,
      lng: 116.4074,
      address: "北京市 朝阳区 三里屯街道"
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(mockLocationData));
    return;
  }

  if (pathname === '/api/location/geocode') {
    const mockGeocodeData = {
      address: "北京市 朝阳区 三里屯街道"
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(mockGeocodeData));
    return;
  }

  // 静态文件服务
  let filePath = pathname === '/' ? './static/index.html' : `./static${pathname}`;
  
  // 安全检查
  if (filePath.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
