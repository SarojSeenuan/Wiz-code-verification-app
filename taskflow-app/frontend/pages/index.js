/**
 * タスク一覧ページ（ホーム画面）
 * ゲストモード＆ログインユーザー対応
 * 8-bit Retro Style
 *
 * ⚠️ Wiz検証用 - 意図的な脆弱性を含む
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { tasks as tasksApi, auth } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [taskList, setTaskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // フィルター状態
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });

  useEffect(() => {
    // ユーザー情報取得
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);

    // ⚠️ 意図的な脆弱性：ユーザー情報をログ出力
    console.log('[DEBUG] Current user:', currentUser);

    // タスク一覧と統計を取得
    fetchTasks();
    fetchStats();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      // ⚠️ フィルターパラメーターをログ出力
      console.log('[DEBUG] Fetching tasks with filters:', params);

      const response = await tasksApi.getAll(params);
      setTaskList(response.tasks || []);

      // ⚠️ タスクデータをログ出力
      console.log('[DEBUG] Tasks loaded:', response.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('タスクの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await tasksApi.getStats();
      setStats(response.stats || {});

      // ⚠️ 統計情報をログ出力
      console.log('[DEBUG] Stats:', response.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const applyFilters = () => {
    fetchTasks();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      search: ''
    });
    setTimeout(() => fetchTasks(), 0);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('このタスクを削除しますか？')) return;

    try {
      await tasksApi.delete(taskId);
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('タスクの削除に失敗しました');
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: 'pixel-badge-danger',
      medium: 'pixel-badge-warning',
      low: 'pixel-badge-primary'
    };
    return badges[priority] || 'pixel-badge';
  };

  const getStatusBadge = (status) => {
    const badges = {
      todo: 'pixel-badge',
      in_progress: 'pixel-badge-warning',
      completed: 'pixel-badge-success'
    };
    return badges[status] || 'pixel-badge';
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

  return (
    <Layout title="TaskFlow - Task List">
      <div className="pixel-container py-8">
        {/* ヘッダーセクション */}
        <div className="mb-8">
          <h1 className="text-3xl mb-4">
            ▶ TASK LIST
          </h1>

          {!user && (
            <div className="pixel-alert pixel-alert-info">
              <p>
                ゲストモードで閲覧中です。ログインすると全機能が利用できます。
              </p>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        {stats && (
          <div className="mb-8 pixel-card">
            <h2 className="text-lg mb-4">◆ Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-2">Total</div>
                <div className="text-2xl text-[var(--pixel-blue)]">{stats.totalTasks || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-2">Todo</div>
                <div className="text-2xl">{stats.todoTasks || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-2">Progress</div>
                <div className="text-2xl text-[var(--pixel-warning)]">{stats.inProgressTasks || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-2">Done</div>
                <div className="text-2xl text-[var(--pixel-success)]">{stats.completedTasks || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-2">High</div>
                <div className="text-2xl text-[var(--pixel-error)]">{stats.highPriorityTasks || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-2">Overdue</div>
                <div className="text-2xl text-[var(--pixel-error)] pixel-blink">{stats.overdueTasks || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* フィルター＆検索 */}
        <div className="mb-8 pixel-card">
          <h2 className="text-lg mb-4">◆ Filter & Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div className="md:col-span-2">
              <label className="block text-xs mb-2">Search</label>
              <input
                type="text"
                className="pixel-input"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>

            {/* ステータスフィルター */}
            <div>
              <label className="block text-xs mb-2">Status</label>
              <select
                className="pixel-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All</option>
                <option value="todo">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
              </select>
            </div>

            {/* 優先度フィルター */}
            <div>
              <label className="block text-xs mb-2">Priority</label>
              <select
                className="pixel-select"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">All</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>

          {/* フィルターボタン */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={applyFilters}
              className="pixel-btn pixel-btn-primary"
            >
              Apply Filter
            </button>
            <button
              onClick={clearFilters}
              className="pixel-btn"
            >
              Clear
            </button>
          </div>
        </div>

        {/* タスク作成ボタン */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl">◆ Tasks ({taskList.length})</h2>
          <Link href="/tasks/new">
            <button className="pixel-btn pixel-btn-success">
              ＋ New Task
            </button>
          </Link>
        </div>

        {/* ローディング */}
        {loading && (
          <div className="text-center py-12">
            <div className="pixel-loading mx-auto mb-4"></div>
            <p className="text-sm">Loading tasks...</p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="pixel-alert pixel-alert-danger">
            <p>{error}</p>
          </div>
        )}

        {/* タスク一覧 */}
        {!loading && !error && (
          <div className="pixel-grid pixel-grid-2">
            {taskList.length === 0 ? (
              <div className="pixel-card md:col-span-2 text-center py-12">
                <p className="text-lg mb-4">📝</p>
                <p className="text-sm text-[var(--pixel-text-secondary)]">
                  タスクがありません。新しいタスクを作成してください。
                </p>
              </div>
            ) : (
              taskList.map((task) => (
                <div key={task.id} className="pixel-card hover:border-[var(--pixel-blue)] transition-colors">
                  {/* タスクヘッダー */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <Link href={`/tasks/${task.id}`}>
                        <h3 className="text-sm mb-2 cursor-pointer hover:text-[var(--pixel-blue)] break-words">
                          {task.title}
                        </h3>
                      </Link>

                      {/* バッジ */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`pixel-badge ${getStatusBadge(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                        <span className={`pixel-badge ${getPriorityBadge(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* タスク説明 */}
                  {task.description && (
                    <p className="text-xs text-[var(--pixel-text-secondary)] mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* タグ */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {task.tags.map((tag, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-[var(--pixel-bg-tertiary)] border-2 border-[var(--pixel-border)]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 期限 */}
                  {task.dueDate && (
                    <div className="text-xs mb-3">
                      <span className="text-[var(--pixel-text-secondary)]">Due: </span>
                      <span className={
                        new Date(task.dueDate) < new Date() && task.status !== 'completed'
                          ? 'text-[var(--pixel-error)] pixel-blink'
                          : 'text-[var(--pixel-text-primary)]'
                      }>
                        {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}

                  <div className="pixel-divider my-3"></div>

                  {/* フッター */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--pixel-text-secondary)]">
                      by {task.createdBy || 'Unknown'}
                    </span>

                    <div className="flex gap-2">
                      <Link href={`/tasks/${task.id}`}>
                        <button className="pixel-btn pixel-btn-primary text-xs px-2 py-1">
                          View
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="pixel-btn pixel-btn-danger text-xs px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
