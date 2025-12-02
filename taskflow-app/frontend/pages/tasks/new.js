// ============================================================
// Wiz検証用の意図的な脆弱性を含む新規タスク作成ページ
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. XSS脆弱性（S01,S02で検出）
// 2. 機密情報のコンソール出力（S01,S02で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { tasks, auth } from '../../lib/api';

export default function NewTask() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // 機密情報をコンソールに出力（脆弱性） - S01,S02で検出
    console.log('Form data changed:', {
      name: e.target.name,
      value: e.target.value,
      fullForm: formData
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = auth.getCurrentUser();
      if (!user) {
        setError('ログインが必要です');
        router.push('/login');
        return;
      }

      // フォームデータをコンソールに出力（脆弱性） - S01,S02で検出
      console.log('Creating task with data:', formData);

      // XSS脆弱性: ユーザー入力をサニタイズせずに送信 - S01,S02で検出
      const taskData = {
        user_id: user.id,
        ...formData
      };

      const response = await tasks.create(taskData);

      if (response.success) {
        console.log('Task created:', response.task);
        router.push(`/tasks/${response.task.id}`);
      } else {
        setError(response.error || 'タスクの作成に失敗しました');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      setError(err.response?.data?.error || 'タスクの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>新規タスク作成 - TaskFlow</title>
      </Head>

      <div className="min-h-screen">
        <div className="pixel-container">
          {/* ヘッダー */}
          <div className="mb-8">
            <Link href="/">
              <button className="pixel-btn mb-4">
                ◀ BACK TO HOME
              </button>
            </Link>
            <h1 className="text-3xl pixel-text-shadow">
              ▶ NEW TASK
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
                    <option value="pending">保留中</option>
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
                <label htmlFor="due_date" className="block text-xs mb-2">
                  DUE DATE
                </label>
                <input
                  type="datetime-local"
                  name="due_date"
                  id="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="pixel-input"
                />
              </div>

              <div className="pixel-divider"></div>

              {/* 送信ボタン */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="pixel-btn pixel-btn-success flex-1"
                >
                  {loading ? 'CREATING...' : '▶ CREATE TASK'}
                </button>
                <Link href="/" className="flex-1">
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
                    formData,
                    user: auth.getCurrentUser()
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
