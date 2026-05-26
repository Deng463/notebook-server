# AI 备忘录 - 后端代理服务

## 一键部署到 Railway（免费）

### 步骤 1：准备代码

`ash
# 进入 server 目录
cd server

# 安装依赖
npm install
`

### 步骤 2：上传到 GitHub

1. 在 GitHub 创建一个新仓库（如 
otebook-server）
2. 把 server/ 文件夹里的**所有文件**推上去

`ash
git init
git add .
git commit -m "init: AI备忘录后端"
git remote add origin https://github.com/你的用户名/notebook-server.git
git push -u origin main
`

### 步骤 3：在 Railway 部署

1. 打开 https://railway.app 用 GitHub 登录
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择你刚才上传的仓库
4. Railway 会自动检测到 Node.js 项目并部署

### 步骤 4：设置环境变量

部署后在 Railway Dashboard 中设置：

| 变量 | 必填 | 说明 |
|------|------|------|
| ARK_API_KEY | ✅ | 火山引擎 API Key（获取地址见下面） |
| AUTH_TOKEN | ✅ | 自己生成的随机字符串，用于 App 端身份验证 |

点 **Deploy** 重新部署。

### 步骤 5：获取 API Key

1. 打开 https://console.volcengine.com/ark 注册火山引擎
2. **注册即送 50 万 tokens**，无需绑卡
3. 进入 **API Key 管理** → 创建新的 API Key
4. 复制 Key 到 Railway 的 ARK_API_KEY 环境变量中

### 步骤 6：配置 App

部署成功后 Railway 会给你一个域名（如 https://notebook-proxy.up.railway.app），修改 App 中的连接地址。

---

## App 端配置

在 Android 项目 AIService.java 中修改：

`java
// 你的 Railway 部署域名
private static String BASE_URL = "https://你的域名.up.railway.app";

// 身份 Token（与 Railway 中 AUTH_TOKEN 一致）
private static final String AUTH_TOKEN = "你设置的随机字符串";
`

---

## 验证后端是否正常运行

访问 https://你的域名.up.railway.app/，应该返回：

`json
{"status":"ok","service":"AI备忘录后端","version":"1.0.0"}
`

---

## 所有环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| ARK_API_KEY | ✅ | - | 火山引擎 API Key |
| AUTH_TOKEN | ✅ | - | 身份验证密钥（App端使用相同的值） |
| PORT | ❌ | 3000 | 端口号（Railway 自动设置） |
| DEFAULT_MODEL | ❌ | doubao-1.5-32k | 默认AI模型 |
| MAX_TOKENS | ❌ | 2048 | 最大 tokens |
| ARK_API_URL | ❌ | 火山引擎地址 | 自定义 API 地址 |

---

## API 文档

### POST /api/chat

AI 对话接口。

**请求头：**
`
Authorization: Bearer 你的AUTH_TOKEN
Content-Type: application/json
`

**请求体：**
`json
{
    "message": "用户消息",
    "context": "备忘录内容（可选）",
    "model": "doubao-1.5-32k",
    "style": "简约"
}
`

**成功响应：**
`json
{
    "success": true,
    "data": {
        "reply": "AI回复内容",
        "model": "doubao-1.5-32k",
        "usage": { "prompt_tokens": 100, "completion_tokens": 50 }
    }
}
`

### GET /api/models

获取可用模型列表。

### GET /

健康检查。