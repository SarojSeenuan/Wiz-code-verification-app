# ============================================================
# Wiz検証用の意図的な脆弱性を含むDockerfile
# ============================================================
# 本Dockerfileには以下の意図的な脆弱性が含まれています：
# 1. 古いベースイメージ（S03,S07で検出）
# 2. ハードコードされたシークレット（S05で検出）
# 3. root権限での実行（S03,S07で検出）
# 4. マルチステージビルド未使用（S03で検出）
#
# 本番環境では絶対に使用しないでください
# ============================================================

# 古いNode.jsイメージを使用（脆弱性あり）- S03,S07で検出
# Node.js 18に更新してNext.js 14と互換性を確保
FROM node:18-alpine3.18

# メタデータ
LABEL maintainer="TIS Wiz Team <wiz@example.com>"
LABEL version="1.0.0"
LABEL description="TaskFlow Frontend - Wiz Verification Sample"

# ビルド引数
ARG GIT_COMMIT
ARG GIT_BRANCH
ARG BUILD_DATE
ARG BUILD_ID
ARG GITHUB_REPOSITORY

# ハードコードされたシークレット（S05で検出される脆弱性）
ENV NEXT_PUBLIC_API_KEY="pk_live_1234567890abcdef1234567890abcdef" \
    NEXT_PUBLIC_ANALYTICS_ID="UA-123456789-1" \
    NEXTAUTH_SECRET="this-is-a-hardcoded-nextauth-secret" \
    NEXTAUTH_URL="http://localhost:3000" \
    SECRET_COOKIE_PASSWORD="complex_password_at_least_32_characters_long_for_cookie_encryption"

# 環境変数（NODE_ENVはビルド後に設定）
ENV PORT=3000 \
    GIT_COMMIT=$GIT_COMMIT \
    GIT_BRANCH=$GIT_BRANCH \
    BUILD_DATE=$BUILD_DATE \
    BUILD_ID=$BUILD_ID \
    GITHUB_REPOSITORY=$GITHUB_REPOSITORY

# 作業ディレクトリ
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール（devDependenciesも含む）
RUN npm install

# アプリケーションコードをコピー
COPY . .

# Next.jsアプリケーションをビルド
RUN npm run build

# ビルド後にNODE_ENVをproductionに設定
ENV NODE_ENV=production

# ポート公開
EXPOSE 3000

# root権限で実行（脆弱性） - S03,S07で検出
# 本来はUSER node等で非rootユーザーに切り替えるべき

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# アプリケーション起動
CMD ["npm", "start"]
