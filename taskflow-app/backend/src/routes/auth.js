/**
 * 認証APIルート
 * /api/auth/*
 *
 * ⚠️ Wiz検証用 - 意図的な脆弱性を含む
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { getStorage } = require('../storage');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * ユーザー登録
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, bio } = req.body;

    // ⚠️ 意図的な脆弱性：入力値をそのままログ出力
    console.log('[DEBUG] Registration attempt:', {
      username,
      email,
      password,
      bio
    });

    // バリデーション（⚠️ 意図的に弱い）
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    // ⚠️ 意図的な脆弱性：弱いパスワードポリシー
    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 4 characters'
      });
    }

    const storage = getStorage();

    // ユーザー名の重複チェック
    const existingUser = await storage.findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // メールの重複チェック
    const existingEmail = await storage.findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // ユーザー作成
    const newUser = await storage.createUser({
      username,
      email,
      password,
      bio
    });

    // トークン生成
    const token = generateToken(newUser);

    // ⚠️ 意図的な脆弱性：レスポンスに機密情報を含める
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        bio: newUser.bio || '',
        avatar: newUser.avatar || '',
        // ⚠️ 平文パスワードを返す（検証用）
        plainPassword: newUser.plainPassword
      }
    });
  } catch (error) {
    console.error('[ERROR] Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      // ⚠️ エラー詳細を露出
      details: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * ユーザーログイン
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // ⚠️ 意図的な脆弱性：認証情報をログ出力
    console.log('[DEBUG] Login attempt:', { username, password });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const storage = getStorage();
    const user = await storage.findUserByUsername(username);

    if (!user) {
      // ⚠️ 意図的な脆弱性：詳細なエラーメッセージ（ユーザー列挙攻撃が可能）
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // ⚠️ 詳細なエラーメッセージ
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // トークン生成
    const token = generateToken(user);

    // ⚠️ ログイン成功をログ出力
    console.log('[DEBUG] Login successful:', {
      username: user.username,
      token
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    console.error('[ERROR] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報取得
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const storage = getStorage();
    const user = await storage.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || '',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[ERROR] Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * ログアウト（クライアント側でトークン削除）
 */
router.post('/logout', (req, res) => {
  // ⚠️ トークンをログ出力
  console.log('[DEBUG] Logout request');

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
