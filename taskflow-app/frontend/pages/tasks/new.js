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

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/" className="text-primary-600 hover:text-primary-500">
              ← ホームに戻る
            </Link>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">新規タスク作成</h1>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
              {/* エラーメッセージ */}
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {/* XSS脆弱性: エラーメッセージをサニタイズせずに表示 - S01,S02で検出 */}
                        <span dangerouslySetInnerHTML={{ __html: error }} />
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* タイトル */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="タスクのタイトルを入力"
                  />
                </div>
              </div>

              {/* 説明 */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  説明
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="タスクの詳細な説明を入力"
                  />
                </div>
              </div>

              {/* ステータス */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  ステータス
                </label>
                <div className="mt-1">
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="pending">保留中</option>
                    <option value="in_progress">進行中</option>
                    <option value="completed">完了</option>
                  </select>
                </div>
              </div>

              {/* 優先度 */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  優先度
                </label>
                <div className="mt-1">
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
              </div>

              {/* 期限 */}
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                  期限
                </label>
                <div className="mt-1">
                  <input
                    type="datetime-local"
                    name="due_date"
                    id="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-end space-x-3">
                <Link
                  href="/"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '作成中...' : 'タスクを作成'}
                </button>
              </div>
            </form>

            {/* デバッグ情報（脆弱性） - S01,S02で検出 */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="px-6 py-5 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-500">デバッグ情報</p>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                  {JSON.stringify({
                    formData,
                    user: auth.getCurrentUser()
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
