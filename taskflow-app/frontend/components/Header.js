/**
 * Header Component - 8bit Retro Style
 * ゲストモードとログインユーザーで表示を切り替え
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Header() {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // ユーザー情報を取得
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('password'); // ⚠️ 意図的な脆弱性
    setUser(null);
    router.push('/');
  };

  return (
    <header className="border-b-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-secondary)]">
      <div className="pixel-container">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/">
            <h1 className="text-xl md:text-2xl cursor-pointer hover:text-[var(--pixel-blue)] transition-colors pixel-text-shadow">
              ▶ TaskFlow
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/">
              <span className={`text-sm cursor-pointer transition-colors ${
                router.pathname === '/'
                  ? 'text-[var(--pixel-blue)]'
                  : 'hover:text-[var(--pixel-lightest)]'
              }`}>
                ◆ Tasks
              </span>
            </Link>

            {user ? (
              <>
                <Link href="/profile">
                  <span className={`text-sm cursor-pointer transition-colors ${
                    router.pathname === '/profile'
                      ? 'text-[var(--pixel-blue)]'
                      : 'hover:text-[var(--pixel-lightest)]'
                  }`}>
                    ◆ Profile
                  </span>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {/* アバター画像 */}
                    {user.avatar && (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-8 h-8 rounded border-2 border-[var(--pixel-border)]"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <span className="text-xs text-[var(--pixel-text-secondary)]">
                      {user.username}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="pixel-btn pixel-btn-danger text-xs px-3 py-2"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <span className="pixel-badge pixel-badge-success">
                  Guest Mode
                </span>
                <Link href="/login">
                  <button className="pixel-btn pixel-btn-primary text-xs px-3 py-2">
                    Login
                  </button>
                </Link>
                <Link href="/register">
                  <button className="pixel-btn text-xs px-3 py-2">
                    Register
                  </button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden pixel-btn text-xs px-3 py-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 border-t-4 border-[var(--pixel-border)] mt-4 pt-4">
            <div className="flex flex-col gap-4">
              <Link href="/">
                <span className="text-sm cursor-pointer block py-2 hover:text-[var(--pixel-blue)]">
                  ◆ Tasks
                </span>
              </Link>

              {user ? (
                <>
                  <Link href="/profile">
                    <span className="text-sm cursor-pointer block py-2 hover:text-[var(--pixel-blue)]">
                      ◆ Profile
                    </span>
                  </Link>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {/* アバター画像 */}
                      {user.avatar && (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-8 h-8 rounded border-2 border-[var(--pixel-border)]"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-xs text-[var(--pixel-text-secondary)]">
                        Logged in as: {user.username}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="pixel-btn pixel-btn-danger text-xs px-3 py-2"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="pixel-badge pixel-badge-success mb-2">
                    Guest Mode
                  </span>
                  <Link href="/login">
                    <button className="pixel-btn pixel-btn-primary text-xs px-3 py-2 w-full">
                      Login
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="pixel-btn text-xs px-3 py-2 w-full">
                      Register
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
