// ============================================================
// Wiz検証用の意図的な脆弱性を含むタスク詳細ページ
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
import { useRouter } from 'next/router';
import { tasks, auth } from '../../lib/api';

export default function TaskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchTaskDetail();
      fetchComments();
    }
  }, [id]);

  const fetchTaskDetail = async () => {
    try {
      setLoading(true);
      const response = await tasks.getById(id);
      setTask(response.task);
      console.log('Task detail:', response.task); // 機密情報をログ出力（脆弱性）
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch task:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await tasks.getComments(id);
      setComments(response.comments || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      // XSS脆弱性: コメントをサニタイズせずに送信 - S01,S02で検出
      console.log('Adding comment:', newComment);
      await tasks.addComment(id, newComment);
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('コメントの追加に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!confirm('このタスクを削除してもよろしいですか？')) return;

    try {
      await tasks.delete(id);
      router.push('/');
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('タスクの削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">タスクの読み込みに失敗しました</p>
          <Link href="/" className="mt-4 text-primary-600 hover:text-primary-500">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

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
        <title>{task.title} - TaskFlow</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-primary-600 hover:text-primary-500">
                ← ホームに戻る
              </Link>
              <div className="flex items-center space-x-4">
                <Link
                  href={`/tasks/${id}/edit`}
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  編集
                </Link>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              {/* XSS脆弱性: タスクタイトルをサニタイズせずに表示 - S01,S02で検出 */}
              <h1
                className="text-3xl font-bold text-gray-900"
                dangerouslySetInnerHTML={{ __html: task.title }}
              />
              <div className="mt-2 flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
                {/* XSS脆弱性: ユーザー名をサニタイズせずに表示 */}
                <span
                  className="text-sm text-gray-500"
                  dangerouslySetInnerHTML={{ __html: `担当者: ${task.username}` }}
                />
              </div>
            </div>

            <div className="px-6 py-5">
              <h2 className="text-lg font-medium text-gray-900 mb-2">説明</h2>
              {/* XSS脆弱性: タスク説明をサニタイズせずに表示 - S01,S02で検出 */}
              <div
                className="text-gray-700 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">作成日時</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(task.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">更新日時</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(task.updated_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* コメントセクション */}
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">コメント ({comments.length})</h2>
            </div>

            {/* コメント一覧 */}
            <div className="px-6 py-5">
              {comments.length === 0 ? (
                <p className="text-gray-500">コメントはありません</p>
              ) : (
                <ul className="space-y-4">
                  {comments.map((comment) => (
                    <li key={comment.id} className="border-l-4 border-primary-500 pl-4 py-2">
                      {/* XSS脆弱性: ユーザー名をサニタイズせずに表示 */}
                      <p
                        className="text-sm font-medium text-gray-900"
                        dangerouslySetInnerHTML={{ __html: comment.username }}
                      />
                      {/* XSS脆弱性: コメント内容をサニタイズせずに表示 - S01,S02で検出 */}
                      <p
                        className="mt-1 text-sm text-gray-700"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString('ja-JP')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {/* コメント投稿フォーム */}
              <form onSubmit={handleAddComment} className="mt-6">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                  コメントを追加
                </label>
                <div className="mt-1">
                  <textarea
                    id="comment"
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="shadow-sm block w-full sm:text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="コメントを入力してください"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  コメントを投稿
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
