const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const CONFIG = {
  arkApiUrl:
    process.env.ARK_API_URL ||
    "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  arkApiKey: process.env.ARK_API_KEY || "",
  authToken: process.env.AUTH_TOKEN || "your-secret-auth-token-here",
  defaultModel: process.env.DEFAULT_MODEL || "doubao-1-5-pro-32k-250115",
  maxTokens: parseInt(process.env.MAX_TOKENS) || 2048,
};

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(req.method + " " + req.path + " " + res.statusCode + " " + ms + "ms");
  });
  next();
});

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "AI备忘录后端", version: "1.0.0" });
});

app.get("/api/models", (req, res) => {
  res.json({
    models: [
      { id: "doubao-1-5-pro-32k-250115", name: "豆包 1.5 Pro 32K" },
      { id: "doubao-1-5-pro-128k-250115", name: "豆包 1.5 Pro 128K" },
      { id: "doubao-lite-32k-250115", name: "豆包 Lite 32K" },
      { id: "deepseek-v3-241226", name: "DeepSeek V3" },
      { id: "deepseek-r1-250120", name: "DeepSeek R1" },
    ],
    defaultModel: CONFIG.defaultModel,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    console.log("[DEBUG] Received Authorization: " + (auth ? auth.substring(0, 30) + "..." : "EMPTY"));
    console.log("[DEBUG] Expected: Bearer " + CONFIG.authToken);
    console.log("[DEBUG] AUTH_TOKEN env set: " + (process.env.AUTH_TOKEN ? "YES" : "NO (using default)"));
    if (!auth || auth !== "Bearer " + CONFIG.authToken) {
      console.log("[DEBUG] Auth mismatch! auth=" + auth + " expected=Bearer " + CONFIG.authToken);
      return res.status(401).json({
        error: "身份验证失败",
        message: "Auth Token 无效，请联系管理员",
        code: "AUTH_FAILED",
        debug: { received: auth ? auth.substring(0, 40) : null, expected: "Bearer " + CONFIG.authToken }
      });
    }

    const msg = req.body.message;
    const ctx = req.body.context || "";
    const model = req.body.model || CONFIG.defaultModel;
    const style = req.body.style || "简约";

    if (!msg || typeof msg !== "string" || msg.trim().length === 0) {
      return res.status(400).json({
        error: "参数错误",
        message: "请提供 message 字段",
        code: "INVALID_PARAMS",
      });
    }

    if (msg.length > 5000) {
      return res.status(400).json({
        error: "消息过长",
        message: "消息长度不能超过 5000 字符",
        code: "MESSAGE_TOO_LONG",
      });
    }

    let stylePrompt = "请使用简洁、清晰的语气回复。";
    if (style === "正式") stylePrompt = "请使用正式、专业的语气回复。";
    if (style === "文艺") stylePrompt = "请使用文艺、优美的语气回复。";

    let system = "你是一个智能备忘录助手，帮助用户管理笔记、生成笔记内容、总结笔记等。";
    if (ctx.trim()) {
      system += "\n以下是用户的备忘录内容供参考：\n" + ctx;
    }
    system += "\n" + stylePrompt;

    if (!CONFIG.arkApiKey) {
      console.error("API Key not configured");
      return res.status(500).json({
        error: "服务器未配置",
        message: "管理员尚未配置 API Key",
        code: "NO_KEY",
      });
    }

    console.log("Request model=" + model);

    const body = JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: msg },
      ],
      temperature: 0.7,
      max_tokens: CONFIG.maxTokens,
    });

    const resp = await fetch(CONFIG.arkApiUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + CONFIG.arkApiKey,
        "Content-Type": "application/json",
      },
      body: body,
    });

    const data = await resp.json();

    if (!resp.ok) {
      let err = "HTTP " + resp.status;
      if (data.error?.message) err = data.error.message;
      else if (data.error) err = JSON.stringify(data.error);
      console.error("Ark error: " + err);
      return res.status(502).json({
        error: "AI服务异常",
        message: err,
        code: "ARK_ERROR",
      });
    }

    const reply = data.choices?.[0]?.message?.content || "";
    if (!reply) {
      return res.status(502).json({
        error: "AI 返回为空",
        code: "EMPTY",
      });
    }

    console.log("OK len=" + reply.length);

    res.json({
      success: true,
      data: {
        reply: reply,
        model: model,
        usage: data.usage || null,
      },
    });
  } catch (e) {
    console.error("Fatal: " + e.message);
    res.status(500).json({
      error: "服务器内部错误",
      message: e.message,
      code: "FATAL",
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log("  AI 备忘录 - 后端代理服务");
  console.log("========================================");
  console.log("  端口: " + PORT);
  console.log("  状态: 运行中");
  console.log("  模型: " + CONFIG.defaultModel);
  console.log("  Auth: " + (CONFIG.authToken ? "已配置" : "未配置"));
  console.log("  Key:  " + (CONFIG.arkApiKey ? "已配置" : "未配置"));
  console.log("========================================");
  console.log("");
});