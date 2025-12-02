/**
 * 認証ミドルウェア
 *
 * ⚠️ Wiz検証用 - 意図的な脆弱性を含む
 * - 弱いJWTシークレット（S01, S02検出用）
 * - トークン情報のログ出力（S01, S02検出用）
 */

const jwt = require('jsonwebtoken');

// ⚠️ 意図的な脆弱性：環境変数から弱いシークレットを使用
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

/**
 * JWT認証ミドルウェア
 * Authorizationヘッダーからトークンを検証
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  // ⚠️ 意図的な脆弱性：トークンをコンソールに出力
  console.log('[DEBUG] Verifying token:', token);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // ⚠️ エラー詳細を露出
      console.log('[DEBUG] Token verification failed:', err.message);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        // ⚠️ 意図的な脆弱性：エラー詳細を返す
        details: err.message
      });
    }

    // ⚠️ ユーザー情報をログ出力
    console.log('[DEBUG] Authenticated user:', user);

    req.user = user;
    next();
  });
}

/**
 * オプショナル認証ミドルウェア
 * トークンがあれば検証、なければゲストとして続行
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // ゲストモード
    req.user = null;
    req.isGuest = true;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // トークンが無効でもゲストとして続行
      req.user = null;
      req.isGuest = true;
    } else {
      req.user = user;
      req.isGuest = false;
    }
    next();
  });
}

/**
 * JWTトークン生成
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email
  };

  // ⚠️ 意図的な脆弱性：ペイロードをログ出力
  console.log('[DEBUG] Generating token for user:', payload);

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });

  // ⚠️ 生成されたトークンをログ出力
  console.log('[DEBUG] Generated token:', token);

  return token;
}

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken
};
