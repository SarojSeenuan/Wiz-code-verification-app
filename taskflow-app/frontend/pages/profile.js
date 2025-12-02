// ============================================================
// Wiz検証用の意図的な脆弱性を含むプロフィール管理ページ
// ============================================================
// 本ファイルには以下の意図的な脆弱性が含まれています：
// 1. 機密情報のコンソール出力（S01,S02,S05で検出）
// 2. パスワードのlocalStorage保存（S01,S02で検出）
// 3. 弱いパスワード検証（S01,S02で検出）
//
// 本番環境では絶対に使用しないでください
// ============================================================

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { users, auth } from '../lib/api';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // プロフィール情報
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    bio: '',
    avatar: ''
  });

  // パスワード変更
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // ユーザー情報をコンソールに出力（脆弱性） - S01,S02,S05で検出
    console.log('[DEBUG] Current user:', currentUser);

    setUser(currentUser);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await users.getProfile();
      const profile = response.profile;

      // プロフィール情報をコンソールに出力（脆弱性）
      console.log('[DEBUG] Profile loaded:', profile);

      setProfileData({
        username: profile.username || '',
        email: profile.email || '',
        bio: profile.bio || '',
        avatar: profile.avatar || ''
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('プロフィール情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });

    // 機密情報をコンソールに出力（脆弱性） - S01,S02で検出
    console.log('[DEBUG] Profile data changed:', {
      name: e.target.name,
      value: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });

    // パスワードをコンソールに出力（脆弱性） - S01,S02,S05で検出
    console.log('[DEBUG] Password data changed:', {
      name: e.target.name,
      value: e.target.value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // プロフィール更新データをコンソールに出力（脆弱性）
      console.log('[DEBUG] Updating profile:', profileData);

      const response = await users.updateProfile(profileData);

      if (response.success) {
        console.log('[DEBUG] Profile updated:', response.profile);
        setSuccess('プロフィールを更新しました');

        // ローカルストレージのユーザー情報を更新
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(response.profile));
        }
      } else {
        setError(response.error || 'プロフィールの更新に失敗しました');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.error || 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 弱いパスワード検証（脆弱性） - S01,S02で検出
    if (passwordData.newPassword.length < 4) {
      setError('新しいパスワードは4文字以上である必要があります');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    setSaving(true);

    try {
      // パスワード変更データをコンソールに出力（脆弱性） - S01,S02,S05で検出
      console.log('[DEBUG] Changing password:', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      const response = await users.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        console.log('[DEBUG] Password changed successfully');
        setSuccess('パスワードを変更しました');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // パスワードをlocalStorageに保存（脆弱性） - S01,S02で検出
        if (typeof window !== 'undefined') {
          localStorage.setItem('password', passwordData.newPassword);
        }
      } else {
        setError(response.error || 'パスワードの変更に失敗しました');
      }
    } catch (err) {
      console.error('Failed to change password:', err);
      setError(err.response?.data?.error || 'パスワードの変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      return;
    }

    const password = prompt('削除を確認するため、パスワードを入力してください:');
    if (!password) return;

    try {
      // アカウント削除をコンソールに出力（脆弱性）
      console.log('[DEBUG] Deleting account');

      const response = await users.deleteAccount(password);

      if (response.success) {
        console.log('[DEBUG] Account deleted');
        auth.logout();
        router.push('/');
      } else {
        setError(response.error || 'アカウントの削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError(err.response?.data?.error || 'アカウントの削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <Layout title="プロフィール読み込み中...">
        <div className="pixel-container py-8">
          <div className="text-center py-12">
            <div className="pixel-loading mx-auto mb-4"></div>
            <p className="text-sm">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="プロフィール管理">
      <Head>
        <title>プロフィール - TaskFlow</title>
      </Head>

      <div className="pixel-container py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/">
            <button className="pixel-btn mb-4">
              ◀ BACK TO HOME
            </button>
          </Link>
          <h1 className="text-3xl pixel-text-shadow">
            ▶ PROFILE
          </h1>
        </div>

        {/* メッセージ */}
        {error && (
          <div className="pixel-alert pixel-alert-danger mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="pixel-alert pixel-alert-success mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* プロフィール情報 */}
          <div className="pixel-card">
            <h2 className="text-lg mb-4">◆ PROFILE INFO</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* ユーザー名 */}
              <div>
                <label htmlFor="username" className="block text-xs mb-2">
                  USERNAME
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  className="pixel-input"
                  placeholder="Enter username..."
                  disabled
                />
                <p className="mt-2 text-xs text-[var(--pixel-text-secondary)]">
                  ユーザー名は変更できません
                </p>
              </div>

              {/* メールアドレス */}
              <div>
                <label htmlFor="email" className="block text-xs mb-2">
                  EMAIL
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className="pixel-input"
                  placeholder="email@example.com"
                />
              </div>

              {/* 自己紹介 */}
              <div>
                <label htmlFor="bio" className="block text-xs mb-2">
                  BIO
                </label>
                <textarea
                  name="bio"
                  id="bio"
                  rows={4}
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  className="pixel-textarea"
                  placeholder="Tell us about yourself..."
                />
              </div>

              {/* アバターURL */}
              <div>
                <label htmlFor="avatar" className="block text-xs mb-2">
                  AVATAR URL
                </label>
                <input
                  type="text"
                  name="avatar"
                  id="avatar"
                  value={profileData.avatar}
                  onChange={handleProfileChange}
                  className="pixel-input"
                  placeholder="https://example.com/avatar.png"
                />
                {/* アバタープレビュー */}
                {profileData.avatar && (
                  <div className="mt-4">
                    <p className="text-xs text-[var(--pixel-text-secondary)] mb-2">
                      プレビュー:
                    </p>
                    <img
                      src={profileData.avatar}
                      alt="Avatar preview"
                      className="w-16 h-16 rounded border-2 border-[var(--pixel-border)]"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="pixel-btn pixel-btn-primary w-full"
              >
                {saving ? 'SAVING...' : '▶ SAVE PROFILE'}
              </button>
            </form>
          </div>

          {/* パスワード変更 */}
          <div>
            <div className="pixel-card mb-8">
              <h2 className="text-lg mb-4">◆ CHANGE PASSWORD</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* 現在のパスワード */}
                <div>
                  <label htmlFor="currentPassword" className="block text-xs mb-2">
                    CURRENT PASSWORD
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="pixel-input"
                    placeholder="Enter current password..."
                  />
                </div>

                {/* 新しいパスワード */}
                <div>
                  <label htmlFor="newPassword" className="block text-xs mb-2">
                    NEW PASSWORD
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="pixel-input"
                    placeholder="Enter new password..."
                  />
                  {/* 弱いパスワードポリシーの警告（脆弱性） - S01,S02で検出 */}
                  <p className="mt-2 text-xs text-[var(--pixel-text-secondary)]">
                    ⚠ 4文字以上のパスワードを設定してください
                  </p>
                </div>

                {/* パスワード確認 */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs mb-2">
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="pixel-input"
                    placeholder="Re-enter new password..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="pixel-btn pixel-btn-warning w-full"
                >
                  {saving ? 'CHANGING...' : '▶ CHANGE PASSWORD'}
                </button>
              </form>
            </div>

            {/* アカウント削除 */}
            <div className="pixel-card">
              <h2 className="text-lg mb-4 text-[var(--pixel-error)]">
                ◆ DANGER ZONE
              </h2>
              <p className="text-xs text-[var(--pixel-text-secondary)] mb-4">
                アカウントを削除すると、すべてのデータが永久に失われます。この操作は取り消せません。
              </p>
              <button
                onClick={handleDeleteAccount}
                className="pixel-btn pixel-btn-danger w-full"
              >
                ✖ DELETE ACCOUNT
              </button>
            </div>
          </div>
        </div>

        {/* デバッグ情報（脆弱性） - S01,S02,S05で検出 */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-8 pixel-alert pixel-alert-warning">
            <p className="text-xs font-bold mb-2">◆ DEBUG INFO</p>
            <pre className="text-xs overflow-auto" suppressHydrationWarning>
              {JSON.stringify({
                user,
                profileData,
                passwordData, // パスワードを表示（脆弱性）
                localStorage: typeof window !== 'undefined' ? {
                  token: localStorage.getItem('token'),
                  user: localStorage.getItem('user'),
                  password: localStorage.getItem('password')
                } : null
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Layout>
  );
}
