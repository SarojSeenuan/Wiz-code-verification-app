# ⚠️ WARNING: このDockerfileは検証目的専用です
# ⚠️ 意図的なセキュリティ脆弱性が含まれています
# ⚠️ 本番環境では絶対に使用しないでください

# 【脆弱性1】古いベースイメージ（セキュリティパッチ未適用）
# Node.js 18に更新して互換性を確保（まだ比較的古いバージョンを維持）
FROM node:18.17.0

# 【脆弱性2】ハードコードされたシークレット
ENV AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
ENV AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
ENV JWT_SECRET="hardcoded-jwt-secret-key-DO-NOT-USE"
ENV DATABASE_PASSWORD="postgres123"

# 作業ディレクトリの設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 【脆弱性3】古い依存関係のインストール（既知の脆弱性を含む）
RUN npm install --production

# アプリケーションコードをコピー
COPY . .

# 【脆弱性4】rootユーザーとして実行（権限昇格のリスク）
# USER node を指定すべきだが、意図的に省略

# 【脆弱性5】不要なポートを開放
EXPOSE 3001
EXPOSE 22
EXPOSE 3306

# 【脆弱性6】センシティブな情報をログに出力
RUN echo "Database Password: $DATABASE_PASSWORD" > /app/config.log
RUN echo "AWS Keys: $AWS_ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY" >> /app/config.log

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# アプリケーション起動
CMD ["node", "src/index.js"]

# Wiz Code検証ポイント:
# - S06: SBOM生成（脆弱な依存関係の検出）
# - S07: Code-to-Cloudトレーサビリティ（このDockerfileからECS/EKSへの追跡）
# - S05: シークレット検出（ハードコードされた認証情報）
# - S08: ランタイム優先順位付け（実行中のパッケージの脆弱性）
