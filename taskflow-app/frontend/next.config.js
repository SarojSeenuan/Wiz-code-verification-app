// ============================================================
// Wiz検証用の意図的な脆弱性を含むNext.js設定
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. 緩いセキュリティヘッダー設定（S01,S02で検出）
// 2. 環境変数の不適切な露出（S05で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 環境変数をクライアントに露出（脆弱性） - S05で検出
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3000',
    API_KEY: process.env.NEXT_PUBLIC_API_KEY || 'pk_live_1234567890abcdef',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'this-is-a-hardcoded-nextauth-secret',
    SECRET_COOKIE_PASSWORD: process.env.SECRET_COOKIE_PASSWORD || 'complex_password_at_least_32_characters_long'
  },

  // 緩いセキュリティヘッダー（脆弱性） - S01,S02で検出
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN' // 脆弱性: より厳格なDENYではない
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Content-Security-Policyが設定されていない（脆弱性）
        ]
      }
    ];
  },

  // 外部画像ドメインの制限なし（脆弱性） - S01,S02で検出
  images: {
    domains: ['*'], // すべてのドメインを許可（脆弱性）
    unoptimized: true
  },

  // 開発用の設定を本番でも有効化（脆弱性）
  poweredByHeader: true, // X-Powered-Byヘッダーを露出（脆弱性）

  // Webpackの設定
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアント側でNode.jsモジュールを使用可能にする（脆弱性）
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig;
