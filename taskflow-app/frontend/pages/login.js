// ============================================================
// Wiz検証用の意図的な脆弱性を含むログインページ
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. 機密情報のコンソール出力（S01,S02,S05で検出）
// 2. パスワードのlocalStorage保存（S01,S02で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // 機密情報をコンソールに出力（脆弱性） - S01,S02,S05で検出
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
      // ログイン情報をコンソールに出力（脆弱性） - S01,S02,S05で検出
      console.log('Attempting login with:', formData);

      const response = await auth.login(formData.username, formData.password);

      if (response.success) {
        // ログイン成功をコンソールに出力（脆弱性）
        console.log('Login successful:', response);

        // ホームページにリダイレクト
        router.push('/');
      } else {
        setError(response.error || 'ログインに失敗しました');
      }
    } catch (err) {
      // エラーの詳細をコンソールに出力（脆弱性）
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>ログイン - TaskFlow</title>
        <meta name="description" content="TaskFlow ログイン" />
      </Head>

      <div className="min-h-screen flex flex-col justify-center">
        <div className="pixel-container max-w-2xl">
          {/* タイトルセクション */}
          <div className="text-center mb-8">
            <h1 className="text-4xl mb-4 pixel-text-shadow">
              ◆ TASKFLOW ◆
            </h1>
            <h2 className="text-xl mb-4">
              ▶ LOGIN
            </h2>
            <p className="text-sm text-[var(--pixel-text-secondary)]">
              または{' '}
              <Link href="/register" className="text-[var(--pixel-blue)] hover:text-[var(--pixel-lightest)]">
                新規アカウントを作成
              </Link>
            </p>
          </div>

          {/* メインカード */}
          <div className="pixel-card">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* エラーメッセージ */}
              {error && (
                <div className="pixel-alert pixel-alert-danger">
                  {/* XSS脆弱性: エラーメッセージをサニタイズせずに表示 - S01,S02で検出 */}
                  <span dangerouslySetInnerHTML={{ __html: error }} />
                </div>
              )}

              {/* ユーザー名 */}
              <div>
                <label htmlFor="username" className="block text-xs mb-2">
                  USERNAME
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="pixel-input"
                  placeholder="Enter username..."
                />
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" className="block text-xs mb-2">
                  PASSWORD
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pixel-input"
                  placeholder="Enter password..."
                />
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="pixel-btn pixel-btn-primary flex-1"
                >
                  {loading ? 'LOGGING IN...' : '▶ LOGIN'}
                </button>
                <Link href="/" className="flex-1">
                  <button type="button" className="pixel-btn w-full">
                    ◀ BACK
                  </button>
                </Link>
              </div>
            </form>

            {/* デバッグ情報（脆弱性） - S01,S02,S05で検出 */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-6 pixel-alert pixel-alert-warning">
                <p className="text-xs font-bold mb-2">◆ DEBUG INFO</p>
                <pre className="text-xs overflow-auto" suppressHydrationWarning>
                  {JSON.stringify({
                    username: formData.username,
                    password: formData.password, // パスワードを表示（脆弱性）
                    localStorage: typeof window !== 'undefined' ? {
                      token: localStorage.getItem('token'),
                      user: localStorage.getItem('user'),
                      password: localStorage.getItem('password')
                    } : null
                  }, null, 2)}
                </pre>
              </div>
            )}

            {/* テスト用アカウント情報（脆弱性） - S01,S02,S05で検出 */}
            <div className="mt-6 pixel-alert pixel-alert-info">
              <p className="text-xs font-bold mb-2">◆ TEST ACCOUNTS</p>
              <p className="text-xs mb-3">
                <span className="font-bold">Admin Account:</span><br />
                Username: <span className="text-[var(--pixel-blue)]">admin</span><br />
                Password: <span className="text-[var(--pixel-blue)]">admin123</span>
              </p>
              <p className="text-xs">
                <span className="font-bold">Test User:</span><br />
                Username: <span className="text-[var(--pixel-blue)]">testuser</span><br />
                Password: <span className="text-[var(--pixel-blue)]">password123</span>
              </p>
              <div className="pixel-divider my-3"></div>
              <p className="text-xs text-[var(--pixel-text-secondary)]">
                SQLインジェクションテスト: <code className="text-[var(--pixel-error)]">admin' OR '1'='1</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
