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

  const getStatusBadge = (status) => {
    const badges = {
      todo: 'pixel-badge',
      in_progress: 'pixel-badge-warning',
      completed: 'pixel-badge-success'
    };
    return badges[status] || 'pixel-badge';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: 'pixel-badge-danger',
      medium: 'pixel-badge-warning',
      low: 'pixel-badge-primary'
    };
    return badges[priority] || 'pixel-badge';
  };

  const getStatusText = (status) => {
    const texts = {
      todo: '未着手',
      in_progress: '進行中',
      completed: '完了'
    };
    return texts[status] || status;
  };

  const getPriorityText = (priority) => {
    const texts = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return texts[priority] || priority;
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>読み込み中... - TaskFlow</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="pixel-loading mx-auto mb-4"></div>
            <p className="text-sm">Loading task...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !task) {
    return (
      <>
        <Head>
          <title>エラー - TaskFlow</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <div className="pixel-card text-center">
            <p className="text-[var(--pixel-error)] mb-4">タスクの読み込みに失敗しました</p>
            <Link href="/">
              <button className="pixel-btn pixel-btn-primary">
                ◀ BACK TO HOME
              </button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{task.title} - TaskFlow</title>
      </Head>

      <div className="min-h-screen">
        <div className="pixel-container py-8">
          {/* ヘッダー */}
          <div className="mb-8 flex flex-wrap justify-between items-center gap-4">
            <Link href="/">
              <button className="pixel-btn">
                ◀ BACK TO HOME
              </button>
            </Link>
            <div className="flex gap-4">
              <Link href={`/tasks/edit/${id}`}>
                <button className="pixel-btn pixel-btn-primary">
                  ✎ EDIT
                </button>
              </Link>
              <button
                onClick={handleDelete}
                className="pixel-btn pixel-btn-danger"
              >
                ✖ DELETE
              </button>
            </div>
          </div>

          {/* メインカード */}
          <div className="pixel-card mb-8">
            {/* タスクヘッダー */}
            <div className="mb-6">
              {/* XSS脆弱性: タスクタイトルをサニタイズせずに表示 - S01,S02で検出 */}
              <h1
                className="text-2xl mb-4 pixel-text-shadow"
                dangerouslySetInnerHTML={{ __html: task.title }}
              />
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`pixel-badge ${getStatusBadge(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
                <span className={`pixel-badge ${getPriorityBadge(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </span>
              </div>
              {/* XSS脆弱性: ユーザー名をサニタイズせずに表示 */}
              <p
                className="text-xs text-[var(--pixel-text-secondary)]"
                dangerouslySetInnerHTML={{ __html: `Created by: ${task.createdBy || 'Unknown'}` }}
              />
            </div>

            <div className="pixel-divider"></div>

            {/* タスク説明 */}
            <div className="my-6">
              <h2 className="text-sm mb-3">◆ DESCRIPTION</h2>
              {/* XSS脆弱性: タスク説明をサニタイズせずに表示 - S01,S02で検出 */}
              <div
                className="text-xs text-[var(--pixel-text-secondary)] whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: task.description || '説明はありません' }}
              />
            </div>

            {/* タグ */}
            {task.tags && task.tags.length > 0 && (
              <div className="my-6">
                <h2 className="text-sm mb-3">◆ TAGS</h2>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-[var(--pixel-bg-tertiary)] border-2 border-[var(--pixel-border)]">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 期限 */}
            {task.dueDate && (
              <div className="my-6">
                <h2 className="text-sm mb-3">◆ DUE DATE</h2>
                <p className={`text-xs ${
                  new Date(task.dueDate) < new Date() && task.status !== 'completed'
                    ? 'text-[var(--pixel-error)] pixel-blink'
                    : 'text-[var(--pixel-text-secondary)]'
                }`}>
                  {new Date(task.dueDate).toLocaleString('ja-JP')}
                </p>
              </div>
            )}

            <div className="pixel-divider"></div>

            {/* メタ情報 */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-xs text-[var(--pixel-text-secondary)] mb-1">Created</p>
                <p className="text-xs">
                  {task.createdAt ? new Date(task.createdAt).toLocaleString('ja-JP') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--pixel-text-secondary)] mb-1">Updated</p>
                <p className="text-xs">
                  {task.updatedAt ? new Date(task.updatedAt).toLocaleString('ja-JP') : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* コメントセクション */}
          <div className="pixel-card">
            <h2 className="text-lg mb-4">
              ◆ COMMENTS ({comments.length})
            </h2>

            {/* コメント一覧 */}
            {comments.length === 0 ? (
              <p className="text-xs text-[var(--pixel-text-secondary)] text-center py-8">
                コメントはありません
              </p>
            ) : (
              <div className="space-y-4 mb-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="pixel-card bg-[var(--pixel-bg-primary)]">
                    {/* コメントヘッダー: アバター + ユーザー名 */}
                    <div className="flex items-center gap-3 mb-2">
                      {/* アバター画像 */}
                      {comment.avatar && (
                        <img
                          src={comment.avatar}
                          alt={comment.username || 'Anonymous'}
                          className="w-8 h-8 rounded border-2 border-[var(--pixel-border)]"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      {/* ユーザー名 */}
                      {/* XSS脆弱性: ユーザー名をサニタイズせずに表示 */}
                      <p
                        className="text-xs font-bold"
                        dangerouslySetInnerHTML={{ __html: comment.username || 'Anonymous' }}
                      />
                    </div>
                    {/* XSS脆弱性: コメント内容をサニタイズせずに表示 - S01,S02で検出 */}
                    <p
                      className="text-xs text-[var(--pixel-text-secondary)] mb-2"
                      dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                    <p className="text-xs text-[var(--pixel-text-secondary)]">
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleString('ja-JP') : '-'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pixel-divider"></div>

            {/* コメント投稿フォーム */}
            <form onSubmit={handleAddComment} className="mt-6">
              <label htmlFor="comment" className="block text-xs mb-2">
                ADD COMMENT
              </label>
              <textarea
                id="comment"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="pixel-textarea mb-4"
                placeholder="Enter your comment..."
              />
              <button
                type="submit"
                className="pixel-btn pixel-btn-primary"
              >
                ▶ POST COMMENT
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
