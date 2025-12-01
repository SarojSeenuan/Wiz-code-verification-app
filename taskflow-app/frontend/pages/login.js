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

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-extrabold text-gray-900">TaskFlow</h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            アカウントにログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            または{' '}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              新規アカウントを作成
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* エラーメッセージ */}
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {/* XSS脆弱性: エラーメッセージをサニタイズせずに表示 - S01,S02で検出 */}
                        <span dangerouslySetInnerHTML={{ __html: error }} />
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* ユーザー名 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  ユーザー名
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="ユーザー名を入力"
                  />
                </div>
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="パスワードを入力"
                  />
                </div>
              </div>

              {/* 送信ボタン */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'ログイン中...' : 'ログイン'}
                </button>
              </div>
            </form>

            {/* デバッグ情報（脆弱性） - S01,S02,S05で検出 */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs font-bold text-yellow-800">デバッグ情報</p>
                <pre className="mt-2 text-xs text-yellow-700 overflow-auto">
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
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-bold text-blue-800">テスト用アカウント</p>
              <p className="mt-2 text-xs text-blue-700">
                ユーザー名: admin<br />
                パスワード: password123
              </p>
              <p className="mt-2 text-xs text-blue-600">
                ※ SQLインジェクションテスト: <code>admin' OR '1'='1</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
