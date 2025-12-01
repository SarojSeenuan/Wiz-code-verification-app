// ============================================================
// Wiz検証用の意図的な脆弱性を含むダッシュボードページ
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. XSS脆弱性（S01,S02で検出）
// 2. 機密情報の露出（S01,S02で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { tasks, auth } from '../lib/api';

export default function Home() {
  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 現在のユーザーを取得
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);

    // タスク一覧を取得
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await tasks.getAll();
      setTaskList(response.tasks || []);
    } catch (err) {
      setError(err.message);
      // エラーの詳細をコンソールに出力（脆弱性）
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'in_progress':
        return '進行中';
      case 'pending':
        return '保留中';
      default:
        return status;
    }
  };

  return (
    <>
      <Head>
        <title>TaskFlow - タスク管理システム</title>
        <meta name="description" content="TaskFlow タスク管理システム（Wiz検証用）" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">TaskFlow</h1>
                <p className="text-sm text-gray-500">タスク管理システム（Wiz検証用）</p>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    {/* XSS脆弱性: ユーザー名をサニタイズせずに表示 - S01,S02で検出 */}
                    <span
                      className="text-gray-700"
                      dangerouslySetInnerHTML={{ __html: `ようこそ、${user.username}さん` }}
                    />
                    <Link
                      href="/login"
                      onClick={() => auth.logout()}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      ログアウト
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      ログイン
                    </Link>
                    <Link
                      href="/register"
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      新規登録
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">タスク一覧</h2>
            <Link
              href="/tasks/new"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              新規タスク作成
            </Link>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-bold">エラーが発生しました</p>
              {/* エラーの詳細を表示（脆弱性） - S01,S02で検出 */}
              <p dangerouslySetInnerHTML={{ __html: error }} />
            </div>
          )}

          {/* ローディング表示 */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">読み込み中...</p>
            </div>
          ) : taskList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600">タスクがありません</p>
              <p className="text-sm text-gray-500 mt-2">新しいタスクを作成してください</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {taskList.map((task) => (
                  <li key={task.id} className="hover:bg-gray-50">
                    <Link href={`/tasks/${task.id}`} className="block px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* XSS脆弱性: タスクタイトルをサニタイズせずに表示 - S01,S02で検出 */}
                          <h3
                            className="text-lg font-medium text-gray-900"
                            dangerouslySetInnerHTML={{ __html: task.title }}
                          />
                          {/* XSS脆弱性: タスク説明をサニタイズせずに表示 - S01,S02で検出 */}
                          <p
                            className="mt-1 text-sm text-gray-600"
                            dangerouslySetInnerHTML={{ __html: task.description }}
                          />
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            {/* XSS脆弱性: ユーザー名をサニタイズせずに表示 */}
                            <span dangerouslySetInnerHTML={{ __html: `担当者: ${task.username}` }} />
                            <span>作成日: {new Date(task.created_at).toLocaleDateString('ja-JP')}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* デバッグ情報表示（脆弱性） - S01,S02,S05で検出 */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-bold text-yellow-800">デバッグ情報（本番環境では表示されません）</p>
              <pre className="mt-2 text-xs text-yellow-700 overflow-auto">
                {JSON.stringify({
                  user,
                  taskCount: taskList.length,
                  apiUrl: process.env.API_URL,
                  environment: process.env.NODE_ENV
                }, null, 2)}
              </pre>
            </div>
          )}
        </main>

        {/* フッター */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-sm text-gray-500">
              TaskFlow - Wiz検証用サンプルアプリケーション（意図的な脆弱性を含む）
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
