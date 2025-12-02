/**
 * ユーザープロフィールAPIルート
 * /api/users/*
 *
 * ⚠️ Wiz検証用 - 意図的な脆弱性を含む
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { getStorage } = require('../storage');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users/profile
 * 現在のユーザープロフィール取得
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const storage = getStorage();
    const user = await storage.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // ⚠️ プロフィール情報をログ出力
    console.log('[DEBUG] Profile accessed:', {
      username: user.username,
      email: user.email
    });

    res.json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('[ERROR] Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * PUT /api/users/profile
 * プロフィール更新
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { bio, email, avatar } = req.body;

    // ⚠️ 更新内容をログ出力
    console.log('[DEBUG] Updating profile:', {
      userId: req.user.id,
      updates: { bio, email, avatar }
    });

    const storage = getStorage();

    // メール重複チェック
    if (email) {
      const existingEmail = await storage.findUserByEmail(email);
      if (existingEmail && existingEmail.id !== req.user.id) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use'
        });
      }
    }

    const updates = {};
    if (bio !== undefined) updates.bio = bio;
    if (email !== undefined) updates.email = email;
    if (avatar !== undefined) updates.avatar = avatar;

    const updatedUser = await storage.updateUser(req.user.id, updates);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio || '',
        avatar: updatedUser.avatar || ''
      }
    });
  } catch (error) {
    console.error('[ERROR] Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * PUT /api/users/password
 * パスワード変更
 */
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // ⚠️ 意図的な脆弱性：パスワードをログ出力
    console.log('[DEBUG] Password change attempt:', {
      userId: req.user.id,
      currentPassword,
      newPassword
    });

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // ⚠️ 弱いパスワードポリシー
    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 4 characters'
      });
    }

    const storage = getStorage();
    const user = await storage.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 現在のパスワード検証
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // パスワード更新
    await storage.updateUser(req.user.id, {
      password: newPassword // updateUser内でハッシュ化される
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('[ERROR] Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * DELETE /api/users/account
 * アカウント削除
 */
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    // ⚠️ パスワードをログ出力
    console.log('[DEBUG] Account deletion attempt:', {
      userId: req.user.id,
      password
    });

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account'
      });
    }

    const storage = getStorage();
    const user = await storage.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password'
      });
    }

    // アカウント削除（関連タスクも削除される）
    const deleted = await storage.deleteUser(req.user.id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete account'
      });
    }

    console.log('[INFO] Account deleted:', user.username);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('[ERROR] Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/users/profile/image
 * プロフィール画像アップロード
 * （簡易実装：Base64またはURL）
 */
router.post('/profile/image', authenticateToken, async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required'
      });
    }

    // ⚠️ 画像データサイズをログ出力
    console.log('[DEBUG] Profile image upload:', {
      userId: req.user.id,
      imageSize: imageData.length
    });

    const storage = getStorage();
    const updatedUser = await storage.updateUser(req.user.id, {
      avatar: imageData
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      avatar: updatedUser.avatar
    });
  } catch (error) {
    console.error('[ERROR] Upload image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
