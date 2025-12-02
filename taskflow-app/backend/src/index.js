/**
 * TaskFlow Backend Server
 * Wiz検証用サンプルアプリケーション
 *
 * ⚠️ このアプリケーションは検証目的専用です
 * ⚠️ 意図的なセキュリティ脆弱性が含まれています
 * ⚠️ 本番環境では絶対に使用しないでください
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// ルートのインポート
const authRoutes = require("./routes/auth");
const tasksRoutes = require("./routes/tasks");
const usersRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 3001;

// ⚠️ 意図的な脆弱性：緩いCORS設定
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);

// ミドルウェア
app.use(bodyParser.json({ limit: "10mb" })); // プロフィール画像用
app.use(bodyParser.urlencoded({ extended: true }));

// ⚠️ 意図的な脆弱性：リクエストログ（機密情報含む可能性）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("[DEBUG] Request body:", req.body);
  }
  if (req.headers.authorization) {
    console.log("[DEBUG] Authorization header:", req.headers.authorization);
  }
  next();
});

// ヘルスチェック
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    storageMode: process.env.STORAGE_MODE || "localStorage",
    // ⚠️ 意図的な脆弱性：環境変数を露出
    config: {
      jwtSecret: process.env.JWT_SECRET,
      apiKey: process.env.API_KEY,
      debugMode: process.env.DEBUG_MODE,
    },
  });
});

// API情報
app.get("/api", (req, res) => {
  res.json({
    name: "TaskFlow API",
    version: "1.0.0",
    description: "Wiz検証用サンプルアプリケーション",
    warning: "⚠️ このアプリケーションは意図的なセキュリティ脆弱性を含みます",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
        logout: "POST /api/auth/logout",
      },
      tasks: {
        list: "GET /api/tasks",
        stats: "GET /api/tasks/stats",
        get: "GET /api/tasks/:id",
        create: "POST /api/tasks",
        update: "PUT /api/tasks/:id",
        delete: "DELETE /api/tasks/:id",
        comments: "GET /api/tasks/:id/comments",
        addComment: "POST /api/tasks/:id/comments",
        deleteComment: "DELETE /api/tasks/:taskId/comments/:commentId",
      },
      users: {
        profile: "GET /api/users/profile",
        updateProfile: "PUT /api/users/profile",
        changePassword: "PUT /api/users/password",
        deleteAccount: "DELETE /api/users/account",
        uploadImage: "POST /api/users/profile/image",
      },
    },
    // ⚠️ テストアカウント情報を露出
    testAccounts: [
      { username: "testuser", password: "password123" },
      { username: "admin", password: "admin123" },
    ],
  });
});

// ルーティング
app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/users", usersRoutes);

// ⚠️ 意図的な脆弱性：詳細なエラー情報を返す
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    // ⚠️ スタックトレースを露出
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    details: err,
  });
});

// 404ハンドラ
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         TaskFlow Backend API Server                   ║
║         Wiz検証用サンプルアプリケーション                ║
║                                                       ║
║  ⚠️  WARNING: 意図的な脆弱性を含みます                  ║
║  ⚠️  本番環境では使用しないでください                   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running on: http://localhost:${PORT}
📝 API Documentation: http://localhost:${PORT}/api
💚 Health Check: http://localhost:${PORT}/health

Environment: ${process.env.NODE_ENV || "development"}
Storage Mode: ${process.env.STORAGE_MODE || "localStorage"}

Test Accounts:
- Username: testuser, Password: password123
- Username: admin, Password: admin123
  `);

  // ⚠️ 環境変数を全て出力
  if (process.env.DEBUG_MODE === "true") {
    console.log("\n[DEBUG] Environment Variables:");
    console.log(process.env);
  }
});

module.exports = app;
