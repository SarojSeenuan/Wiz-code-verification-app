// ============================================================
// Wiz検証用の意図的な脆弱性を含むNext.jsアプリケーションルート
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. 機密情報のコンソール出力（S01,S02,S05で検出）
// 2. 不適切なエラーハンドリング（S01,S02で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // 機密情報をコンソールに出力（脆弱性） - S01,S02,S05で検出
    console.log('Application started');
    console.log('Environment:', {
      API_URL: process.env.API_URL,
      API_KEY: process.env.API_KEY,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV
    });

    // ローカルストレージの内容をコンソールに出力（脆弱性）
    if (typeof window !== 'undefined') {
      console.log('LocalStorage contents:', {
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
        password: localStorage.getItem('password') // パスワードをログ出力（脆弱性）
      });
    }

    // グローバルエラーハンドラー（詳細情報を露出 - S01,S02で検出）
    window.onerror = function(message, source, lineno, colno, error) {
      console.error('Global error:', {
        message,
        source,
        lineno,
        colno,
        error,
        stack: error?.stack
      });
      return false;
    };

    // 未処理のPromiseリジェクションをログ出力（脆弱性）
    window.onunhandledrejection = function(event) {
      console.error('Unhandled promise rejection:', {
        reason: event.reason,
        promise: event.promise
      });
    };
  }, []);

  return <Component {...pageProps} />;
}
