// ============================================================
// Wiz検証用の意図的な脆弱性を含むタスク編集ページ
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. XSS脆弱性（S01,S02で検出）
// 2. 機密情報のコンソール出力（S01,S02で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { tasks, auth } from '../../../lib/api';

export default function EditTask() {
  const router = useRouter();
  const { id } = router.query;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    tags: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError('');

      // 機密情報をコンソールに出力（脆弱性） - S01,S02で検出
      console.log('[DEBUG] Fetching task:', id);

      const response = await tasks.getById(id);
      const task = response.task;

      // タスクデータをコンソールに出力（脆弱性）
      console.log('[DEBUG] Task loaded:', task);

      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
        tags: task.tags ? task.tags.join(', ') : ''
      });
    } catch (err) {
      console.error('Failed to fetch task:', err);
      setError('タスクの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // 機密情報をコンソールに出力（脆弱性） - S01,S02で検出
    console.log('[DEBUG] Form data changed:', {
      name: e.target.name,
      value: e.target.value,
      fullForm: formData
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const user = auth.getCurrentUser();
      if (!user) {
        setError('ログインが必要です');
        router.push('/login');
        return;
      }

      // フォームデータをコンソールに出力（脆弱性） - S01,S02で検出
      console.log('[DEBUG] Updating task with data:', formData);

      // XSS脆弱性: ユーザー入力をサニタイズせずに送信 - S01,S02で検出
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      };

      const response = await tasks.update(id, taskData);

      if (response.success) {
        console.log('[DEBUG] Task updated:', response.task);
        router.push(`/tasks/${id}`);
      } else {
        setError(response.error || 'タスクの更新に失敗しました');
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError(err.response?.data?.error || 'タスクの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="タスク編集中...">
        <div className="pixel-container py-8">
          <div className="text-center py-12">
            <div className="pixel-loading mx-auto mb-4"></div>
            <p className="text-sm">Loading task...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`タスク編集 - ${formData.title}`}>
      <Head>
        <title>タスク編集 - TaskFlow</title>
      </Head>

      <div className="pixel-container py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href={`/tasks/${id}`}>
            <button className="pixel-btn mb-4">
              ◀ BACK TO TASK
            </button>
          </Link>
          <h1 className="text-3xl pixel-text-shadow">
            ▶ EDIT TASK
          </h1>
        </div>

        {/* メインカード */}
        <div className="pixel-card max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* エラーメッセージ */}
            {error && (
              <div className="pixel-alert pixel-alert-danger">
                {/* XSS脆弱性: エラーメッセージをサニタイズせずに表示 - S01,S02で検出 */}
                <span dangerouslySetInnerHTML={{ __html: error }} />
              </div>
            )}

            {/* タイトル */}
            <div>
              <label htmlFor="title" className="block text-xs mb-2">
                TITLE <span className="text-[var(--pixel-error)]">*</span>
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="pixel-input"
                placeholder="Enter task title..."
              />
            </div>

            {/* 説明 */}
            <div>
              <label htmlFor="description" className="block text-xs mb-2">
                DESCRIPTION
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="pixel-textarea"
                placeholder="Enter task description..."
              />
            </div>

            {/* ステータスと優先度 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ステータス */}
              <div>
                <label htmlFor="status" className="block text-xs mb-2">
                  STATUS
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="pixel-select"
                >
                  <option value="todo">未着手</option>
                  <option value="in_progress">進行中</option>
                  <option value="completed">完了</option>
                </select>
              </div>

              {/* 優先度 */}
              <div>
                <label htmlFor="priority" className="block text-xs mb-2">
                  PRIORITY
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="pixel-select"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>

            {/* 期限 */}
            <div>
              <label htmlFor="dueDate" className="block text-xs mb-2">
                DUE DATE
              </label>
              <input
                type="datetime-local"
                name="dueDate"
                id="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="pixel-input"
              />
            </div>

            {/* タグ */}
            <div>
              <label htmlFor="tags" className="block text-xs mb-2">
                TAGS
              </label>
              <input
                type="text"
                name="tags"
                id="tags"
                value={formData.tags}
                onChange={handleChange}
                className="pixel-input"
                placeholder="tag1, tag2, tag3..."
              />
              <p className="mt-2 text-xs text-[var(--pixel-text-secondary)]">
                カンマ区切りで複数のタグを入力できます
              </p>
            </div>

            <div className="pixel-divider"></div>

            {/* 送信ボタン */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="pixel-btn pixel-btn-primary flex-1"
              >
                {saving ? 'SAVING...' : '▶ SAVE CHANGES'}
              </button>
              <Link href={`/tasks/${id}`} className="flex-1">
                <button type="button" className="pixel-btn w-full">
                  CANCEL
                </button>
              </Link>
            </div>
          </form>

          {/* デバッグ情報（脆弱性） - S01,S02で検出 */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 pixel-alert pixel-alert-warning">
              <p className="text-xs font-bold mb-2">◆ DEBUG INFO</p>
              <pre className="text-xs overflow-auto" suppressHydrationWarning>
                {JSON.stringify({
                  taskId: id,
                  formData,
                  user: auth.getCurrentUser()
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
