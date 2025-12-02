/**
 * タスクAPIルート
 * /api/tasks/*
 *
 * ⚠️ Wiz検証用 - 意図的な脆弱性を含む
 * - XSS可能な入力（サニタイズなし）
 * - 認可チェック不足
 */

const express = require('express');
const { getStorage } = require('../storage');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tasks
 * タスク一覧取得（ゲスト・ログインユーザー対応）
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const storage = getStorage();
    const { status, priority, tags, search } = req.query;

    // フィルター設定
    const filters = {
      userId: req.isGuest ? null : req.user.id,
      status,
      priority,
      tags: tags ? tags.split(',') : undefined,
      search
    };

    // ⚠️ フィルター情報をログ出力
    console.log('[DEBUG] Fetching tasks with filters:', filters);

    const tasks = await storage.getAllTasks(filters);

    // ⚠️ タスク詳細をログ出力
    console.log(`[DEBUG] Found ${tasks.length} tasks`);

    res.json({
      success: true,
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('[ERROR] Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/tasks/stats
 * タスク統計情報取得
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const storage = getStorage();
    const userId = req.isGuest ? null : req.user.id;

    const stats = await storage.getStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[ERROR] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/tasks/:id
 * 特定タスク取得
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const storage = getStorage();
    const task = await storage.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // ⚠️ タスク詳細をログ出力
    console.log('[DEBUG] Task details:', task);

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('[ERROR] Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/tasks
 * タスク作成（ゲスト・ログインユーザー対応）
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;

    // ⚠️ 入力値をそのままログ出力
    console.log('[DEBUG] Creating task:', {
      title,
      description,
      status,
      priority,
      dueDate,
      tags
    });

    // ⚠️ 意図的な脆弱性：入力サニタイズなし（XSS可能）
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    const storage = getStorage();

    const taskData = {
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      tags: tags || [],
      userId: req.isGuest ? null : req.user.id,
      createdBy: req.isGuest ? 'Guest' : req.user.username
    };

    const newTask = await storage.createTask(taskData);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    console.error('[ERROR] Create task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * PUT /api/tasks/:id
 * タスク更新
 */
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;

    // ⚠️ 更新内容をログ出力
    console.log('[DEBUG] Updating task:', {
      id: req.params.id,
      updates: { title, description, status, priority, dueDate, tags }
    });

    const storage = getStorage();

    // タスクの存在確認
    const existingTask = await storage.getTaskById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // ⚠️ 意図的な脆弱性：認可チェック不足
    // 他のユーザーのタスクも編集可能

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (tags !== undefined) updates.tags = tags;

    const updatedTask = await storage.updateTask(req.params.id, updates);

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('[ERROR] Update task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * タスク削除
 */
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    console.log('[DEBUG] Deleting task:', req.params.id);

    const storage = getStorage();

    // タスクの存在確認
    const existingTask = await storage.getTaskById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // ⚠️ 意図的な脆弱性：認可チェック不足
    // 他のユーザーのタスクも削除可能

    const deleted = await storage.deleteTask(req.params.id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete task'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('[ERROR] Delete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/tasks/:id/comments
 * タスクのコメント一覧取得
 */
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const storage = getStorage();
    const comments = await storage.getCommentsByTaskId(req.params.id);

    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error('[ERROR] Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/tasks/:id/comments
 * コメント作成
 */
router.post('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { text } = req.body;

    // ⚠️ コメント内容をログ出力
    console.log('[DEBUG] Creating comment:', {
      taskId: req.params.id,
      text,
      user: req.isGuest ? 'Guest' : req.user.username
    });

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required'
      });
    }

    const storage = getStorage();

    // タスクの存在確認
    const task = await storage.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // ユーザー情報を取得（アバター情報を含める）
    let userAvatar = null;
    if (!req.isGuest) {
      const user = await storage.findUserById(req.user.id);
      userAvatar = user ? user.avatar : null;
    }

    const commentData = {
      taskId: req.params.id,
      userId: req.isGuest ? null : req.user.id,
      username: req.isGuest ? 'Guest' : req.user.username,
      avatar: userAvatar,
      text
    };

    const newComment = await storage.createComment(commentData);

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('[ERROR] Create comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * DELETE /api/tasks/:taskId/comments/:commentId
 * コメント削除
 */
router.delete('/:taskId/comments/:commentId', optionalAuth, async (req, res) => {
  try {
    console.log('[DEBUG] Deleting comment:', req.params.commentId);

    const storage = getStorage();
    const deleted = await storage.deleteComment(req.params.commentId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('[ERROR] Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
