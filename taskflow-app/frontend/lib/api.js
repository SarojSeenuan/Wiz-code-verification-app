// ============================================================
// Wiz検証用の意図的な脆弱性を含むAPIクライアント
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. ハードコードされたAPIキー（S05で検出）
// 2. 機密情報のローカルストレージ保存（S01,S02で検出）
// 3. 不適切なエラーハンドリング（S01,S02で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import axios from 'axios';

// ハードコードされたAPI設定（S05で検出される脆弱性）
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = 'pk_live_1234567890abcdef1234567890abcdef'; // ハードコードされたAPIキー

// Axiosインスタンス作成
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY // ハードコードされたAPIキーをヘッダーに含める（脆弱性）
  }
});

// リクエストインターセプター（機密情報をログ出力 - S01,S02で検出）
api.interceptors.request.use(
  (config) => {
    // ローカルストレージからトークンを取得（脆弱性：機密情報をlocalStorageに保存）
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const password = localStorage.getItem('password'); // パスワードをlocalStorageに保存（脆弱性）

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // デバッグ情報をコンソールに出力（機密情報を含む可能性） - S01,S02で検出
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data,
        token: token,
        password: password // パスワードをログ出力（脆弱性）
      });
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（詳細なエラー情報を露出 - S01,S02で検出）
api.interceptors.response.use(
  (response) => {
    // レスポンス全体をログ出力（機密情報を含む可能性） - S01,S02で検出
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    // 詳細なエラー情報をログ出力（脆弱性）
    console.error('Response error:', {
      message: error.message,
      response: error.response?.data,
      config: error.config,
      headers: error.config?.headers
    });
    return Promise.reject(error);
  }
);

// ============================================================
// 認証API
// ============================================================

export const auth = {
  // ログイン（パスワードをlocalStorageに保存 - S01,S02で検出）
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });

    if (response.data.success && typeof window !== 'undefined') {
      // トークンとパスワードをlocalStorageに保存（脆弱性）
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('password', password); // パスワードを平文で保存（脆弱性）

      // 機密情報をコンソールに出力（脆弱性）
      console.log('Login successful:', {
        token: response.data.token,
        user: response.data.user,
        password: password
      });
    }

    return response.data;
  },

  // ユーザー登録
  register: async (username, email, password) => {
    const response = await api.post('/api/auth/register', { username, email, password });

    if (response.data.success && typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('password', password); // パスワードを平文で保存（脆弱性）
    }

    return response.data;
  },

  // ログアウト
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('password');
    }
  },

  // 現在のユーザー取得
  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }
};

// ============================================================
// タスクAPI
// ============================================================

export const tasks = {
  // タスク一覧取得
  getAll: async (params = {}) => {
    const response = await api.get('/api/tasks', { params });
    return response.data;
  },

  // タスク詳細取得
  getById: async (id) => {
    const response = await api.get(`/api/tasks/${id}`);
    return response.data;
  },

  // タスク作成（XSS脆弱性：入力をサニタイズしない）
  create: async (taskData) => {
    // XSS脆弱性: ユーザー入力をサニタイズせずに送信 - S01,S02で検出
    const response = await api.post('/api/tasks', taskData);
    return response.data;
  },

  // タスク更新
  update: async (id, taskData) => {
    // XSS脆弱性: ユーザー入力をサニタイズせずに送信 - S01,S02で検出
    const response = await api.put(`/api/tasks/${id}`, taskData);
    return response.data;
  },

  // タスク削除
  delete: async (id) => {
    const response = await api.delete(`/api/tasks/${id}`);
    return response.data;
  },

  // タスクコメント取得
  getComments: async (id) => {
    const response = await api.get(`/api/tasks/${id}/comments`);
    return response.data;
  },

  // タスクコメント追加（XSS脆弱性）
  addComment: async (id, text) => {
    // XSS脆弱性: コメントをサニタイズせずに送信 - S01,S02で検出
    const response = await api.post(`/api/tasks/${id}/comments`, {
      text
    });
    return response.data;
  },

  // タスクコメント削除
  deleteComment: async (taskId, commentId) => {
    const response = await api.delete(`/api/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  },

  // タスク統計情報取得
  getStats: async () => {
    const response = await api.get('/api/tasks/stats');
    return response.data;
  }
};

// ============================================================
// ユーザーAPI
// ============================================================

export const users = {
  // プロフィール取得
  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },

  // プロフィール更新
  updateProfile: async (profileData) => {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  },

  // パスワード変更
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/api/users/password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  // アカウント削除
  deleteAccount: async (password) => {
    const response = await api.delete('/api/users/account', {
      data: { password }
    });
    return response.data;
  },

  // プロフィール画像アップロード
  uploadProfileImage: async (imageData) => {
    const response = await api.post('/api/users/profile/image', {
      imageData
    });
    return response.data;
  }
};

// ============================================================
// デバッグAPI（機密情報を取得 - S01,S02,S05で検出）
// ============================================================

export const debug = {
  // サーバー設定情報を取得（脆弱性）
  getConfig: async () => {
    const response = await api.get('/api/config');
    console.log('Server config:', response.data); // 機密情報をログ出力（脆弱性）
    return response.data;
  }
};

export default api;
