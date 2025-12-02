// ============================================================
// Wiz検証用の意図的な脆弱性を含むユーザー登録ページ
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. 弱いパスワード検証（S01,S02で検出）
// 2. 機密情報のコンソール出力（S01,S02,S05で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth } from '../lib/api';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
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

    // 弱いパスワード検証（脆弱性） - S01,S02で検出
    // 本来は最小文字数、複雑性などをチェックすべき
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    // パスワードの長さチェックが緩い（脆弱性）
    if (formData.password.length < 4) {
      setError('パスワードは4文字以上である必要があります');
      return;
    }

    setLoading(true);

    try {
      // 登録情報をコンソールに出力（脆弱性） - S01,S02,S05で検出
      console.log('Attempting registration with:', formData);

      const response = await auth.register(
        formData.username,
        formData.email,
        formData.password
      );

      if (response.success) {
        // 登録成功をコンソールに出力（脆弱性）
        console.log('Registration successful:', response);

        // ホームページにリダイレクト
        router.push('/');
      } else {
        setError(response.error || 'ユーザー登録に失敗しました');
      }
    } catch (err) {
      // エラーの詳細をコンソールに出力（脆弱性）
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'ユーザー登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>新規登録 - TaskFlow</title>
        <meta name="description" content="TaskFlow 新規ユーザー登録" />
      </Head>

      <div className="min-h-screen flex flex-col justify-center">
        <div className="pixel-container max-w-2xl">
          {/* タイトルセクション */}
          <div className="text-center mb-8">
            <h1 className="text-4xl mb-4 pixel-text-shadow">
              ◆ TASKFLOW ◆
            </h1>
            <h2 className="text-xl mb-4">
              ▶ REGISTER
            </h2>
            <p className="text-sm text-[var(--pixel-text-secondary)]">
              すでにアカウントをお持ちですか？{' '}
              <Link href="/login" className="text-[var(--pixel-blue)] hover:text-[var(--pixel-lightest)]">
                ログイン
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
                  USERNAME <span className="text-[var(--pixel-error)]">*</span>
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

              {/* メールアドレス */}
              <div>
                <label htmlFor="email" className="block text-xs mb-2">
                  EMAIL <span className="text-[var(--pixel-error)]">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pixel-input"
                  placeholder="email@example.com"
                />
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" className="block text-xs mb-2">
                  PASSWORD <span className="text-[var(--pixel-error)]">*</span>
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
                {/* 弱いパスワードポリシーの警告（脆弱性） - S01,S02で検出 */}
                <p className="mt-2 text-xs text-[var(--pixel-text-secondary)]">
                  ⚠ 4文字以上のパスワードを設定してください
                </p>
              </div>

              {/* パスワード確認 */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs mb-2">
                  CONFIRM PASSWORD <span className="text-[var(--pixel-error)]">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pixel-input"
                  placeholder="Re-enter password..."
                />
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="pixel-btn pixel-btn-success flex-1"
                >
                  {loading ? 'CREATING...' : '▶ CREATE ACCOUNT'}
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
                <pre className="text-xs overflow-auto">
                  {JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password, // パスワードを表示（脆弱性）
                    confirmPassword: formData.confirmPassword
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
