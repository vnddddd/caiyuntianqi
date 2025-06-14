# 彩云天气网站

基于彩云天气 API 的响应式天气查看网站，使用 Deno Deploy 部署。

## 功能特点

- 🌤️ **实时天气数据** - 显示当前温度、湿度、风速等详细信息
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🌍 **自动定位** - 基于浏览器地理位置 API 自动获取当前位置
- 📊 **空气质量** - 显示 PM2.5、PM10、AQI 等空气质量指标
- ⏰ **24小时预报** - 未来24小时逐小时天气预报
- 📅 **7天预报** - 未来一周天气趋势
- 💾 **智能缓存** - 5分钟数据缓存，减少 API 调用
- 🔄 **一键刷新** - 手动刷新获取最新数据
- ⚡ **快速加载** - 基于 Deno Deploy 的全球 CDN 加速

## 技术栈

- **后端**: Deno + TypeScript
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **部署**: Deno Deploy
- **API**: 彩云天气 API v2.6
- **样式**: 现代 CSS Grid/Flexbox 布局

## 本地开发

### 前置要求

- [Deno](https://deno.land/) 1.37+ 
- 彩云天气 API Token

### 安装和运行

1. 克隆项目
```bash
git clone <repository-url>
cd 彩云天气
```

2. 设置环境变量
```bash
# Windows (PowerShell)
$env:CAIYUN_API_TOKEN="your_api_token_here"

# macOS/Linux
export CAIYUN_API_TOKEN="your_api_token_here"
```

3. 启动开发服务器
```bash
deno task dev
```

4. 打开浏览器访问 `http://localhost:8000`

### 获取彩云天气 API Token

1. 访问 [彩云天气开发者平台](https://dashboard.caiyunapp.com/)
2. 注册账号并登录
3. 创建应用获取 API Token
4. 将 Token 设置为环境变量 `CAIYUN_API_TOKEN`

## 部署到 Deno Deploy

### 方法一：GitHub 集成（推荐）

1. 将代码推送到 GitHub 仓库
2. 访问 [Deno Deploy](https://dash.deno.com/)
3. 创建新项目并连接 GitHub 仓库
4. 设置环境变量 `CAIYUN_API_TOKEN`
5. 部署完成，获得全球 CDN 加速的网站

### 方法二：使用 deployctl

1. 安装 deployctl
```bash
deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts
```

2. 部署项目
```bash
deployctl deploy --project=your-project-name main.ts
```

## 项目结构

```
彩云天气/
├── main.ts                 # Deno 服务器入口文件
├── deno.json               # Deno 配置文件
├── static/                 # 静态资源目录
│   ├── index.html          # 主页面
│   ├── styles.css          # 样式文件
│   └── script.js           # 前端脚本
├── README.md               # 项目说明
└── 彩云天气api文档.md       # API 文档
```

## API 接口

### GET /api/weather

获取指定位置的天气数据

**参数:**
- `lng` (必需): 经度
- `lat` (必需): 纬度

**响应示例:**
```json
{
  "current": {
    "temperature": 25,
    "humidity": 60,
    "wind_speed": 12,
    "weather_info": {
      "icon": "☀️",
      "desc": "晴"
    }
  },
  "hourly": [...],
  "daily": [...],
  "forecast_keypoint": "未来两小时不会下雨"
}
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [彩云天气](https://caiyunapp.com/) - 提供天气数据 API
- [Deno Deploy](https://deno.com/deploy) - 提供部署平台
- [Inter 字体](https://rsms.me/inter/) - 现代化字体设计
