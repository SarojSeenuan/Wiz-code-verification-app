#!/bin/bash
# ============================================================
# Wiz検証用の意図的な脆弱性を含むデータベース初期化スクリプト
# ============================================================
# 本スクリプトには以下の意図的な脆弱性が含まれています：
# 1. ハードコードされたデータベース認証情報（S05で検出）
# 2. ハードコードされたAWS認証情報（S05で検出）
# 3. 不適切な権限設定（S05で検出）
#
# 本番環境では絶対に使用しないでください
# ============================================================

set -e

# ハードコードされた認証情報（S05で検出される脆弱性）
DB_HOST="taskflow-db.xxxxx.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="taskflow"
DB_USER="taskflow_admin"
DB_PASSWORD="SuperSecret123!"  # ハードコードされたパスワード

# AWS認証情報（S05で検出される脆弱性）
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

echo "データベース初期化を開始します..."
echo "ホスト: $DB_HOST"
echo "データベース: $DB_NAME"

# PostgreSQLクライアントの確認
if ! command -v psql &> /dev/null; then
    echo "エラー: psqlコマンドが見つかりません"
    exit 1
fi

# データベース接続テスト
echo "データベース接続をテストしています..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT version();"

# データベース作成
echo "データベースを作成しています..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres <<EOF
CREATE DATABASE $DB_NAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# テーブル作成
echo "テーブルを作成しています..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
EOF

# 初期データ挿入
echo "初期データを挿入しています..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users (username, email, password) VALUES
    ('admin', 'admin@example.com', '\$2b\$10\$abcdefghijklmnopqrstuvwxyz1234567890'),
    ('testuser', 'test@example.com', '\$2b\$10\$abcdefghijklmnopqrstuvwxyz0987654321');

INSERT INTO tasks (user_id, title, description, status) VALUES
    (1, 'タスク1', 'これはサンプルタスクです', 'pending'),
    (1, 'タスク2', 'Wiz検証用のタスク', 'in_progress'),
    (2, 'タスク3', 'ユーザー2のタスク', 'completed');
EOF

echo "データベース初期化が完了しました"
