-- ============================================================
-- TaskFlow データベース初期化SQLスクリプト
-- ============================================================
-- このファイルはPostgreSQLコンテナ起動時に自動実行されます
-- ⚠️ 検証目的専用 - 本番環境では使用しないでください
-- ============================================================

-- データベースとユーザーの存在確認
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'taskflow') THEN
        CREATE DATABASE taskflow;
    END IF;
END
$$;

-- データベースに接続
\c taskflow;

-- usersテーブル作成
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- tasksテーブル作成
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- commentsテーブル作成
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- attachmentsテーブル作成
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);

-- ⚠️ 意図的な脆弱性: デフォルトパスワードを持つ管理者ユーザー（S05で検出）
-- bcrypt hash for "admin123"
INSERT INTO users (username, email, password, role)
VALUES
    ('admin', 'admin@taskflow.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
    ('demo', 'demo@taskflow.local', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user')
ON CONFLICT (username) DO NOTHING;

-- サンプルタスクデータ挿入
INSERT INTO tasks (user_id, title, description, status, priority)
VALUES
    (1, 'Wiz統合テスト', 'Wizセキュリティスキャンの検証', 'in_progress', 'high'),
    (1, 'ドキュメント作成', 'README.mdの更新', 'pending', 'medium'),
    (2, 'デモ用タスク', 'デモ環境のセットアップ', 'completed', 'low')
ON CONFLICT DO NOTHING;

-- サンプルコメントデータ挿入
INSERT INTO comments (task_id, user_id, content)
VALUES
    (1, 1, 'S01-S11の検証シナリオを実行中'),
    (1, 2, '脆弱性検出の確認が必要'),
    (2, 1, 'MANUAL_SETUP_GUIDEを参照')
ON CONFLICT DO NOTHING;

-- ビュー作成（タスクサマリー）
CREATE OR REPLACE VIEW task_summary AS
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    u.username as owner,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT a.id) as attachment_count
FROM tasks t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN comments c ON t.id = c.task_id
LEFT JOIN attachments a ON t.id = a.task_id
GROUP BY t.id, t.title, t.status, t.priority, u.username;

-- 関数作成（タスク更新時にupdated_atを自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ⚠️ 意図的な脆弱性: 不適切な権限設定（全てのユーザーに全権限）
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- データベース初期化完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'TaskFlowデータベース初期化が完了しました';
    RAISE NOTICE '⚠️ このデータベースは検証目的専用です';
    RAISE NOTICE '⚠️ 意図的なセキュリティ脆弱性が含まれています';
    RAISE NOTICE '⚠️ 本番環境では絶対に使用しないでください';
    RAISE NOTICE '============================================================';
END $$;
