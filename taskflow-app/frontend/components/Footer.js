/**
 * Footer Component - 8bit Retro Style
 */

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t-4 border-[var(--pixel-border)] bg-[var(--pixel-bg-secondary)] mt-auto">
      <div className="pixel-container">
        <div className="py-6">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* About */}
            <div>
              <h3 className="text-sm mb-4 text-[var(--pixel-blue)]">▶ About TaskFlow</h3>
              <p className="text-xs leading-relaxed text-[var(--pixel-text-secondary)]">
                A retro 8-bit style task management application.
                Built for Wiz security verification.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-sm mb-4 text-[var(--pixel-blue)]">▶ Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-xs text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-lightest)]">
                    ◆ Task List
                  </a>
                </li>
                <li>
                  <a href="/tasks/new" className="text-xs text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-lightest)]">
                    ◆ Create Task
                  </a>
                </li>
                <li>
                  <a href="/profile" className="text-xs text-[var(--pixel-text-secondary)] hover:text-[var(--pixel-lightest)]">
                    ◆ Profile
                  </a>
                </li>
              </ul>
            </div>

            {/* Warning */}
            <div>
              <h3 className="text-sm mb-4 text-[var(--pixel-error)]">⚠ Warning</h3>
              <p className="text-xs leading-relaxed text-[var(--pixel-text-secondary)]">
                This application contains intentional security vulnerabilities
                for Wiz verification purposes only.
              </p>
              <p className="text-xs mt-2 text-[var(--pixel-error)] pixel-blink">
                DO NOT USE IN PRODUCTION
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="pixel-divider"></div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[var(--pixel-text-secondary)]">
              © {currentYear} TaskFlow - TIS Inc. Wiz Verification Project
            </p>

            <div className="flex items-center gap-4">
              <span className="pixel-badge">8-BIT STYLE</span>
              <span className="pixel-badge pixel-badge-warning">DEMO</span>
            </div>
          </div>

          {/* Easter Egg Stats */}
          <div className="mt-6 p-4 pixel-card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-1">Server</div>
                <div className="text-sm text-[var(--pixel-success)]">● Online</div>
              </div>
              <div>
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-1">Mode</div>
                <div className="text-sm text-[var(--pixel-blue)]">LocalStorage</div>
              </div>
              <div>
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-1">Version</div>
                <div className="text-sm">v1.0.0</div>
              </div>
              <div>
                <div className="text-xs text-[var(--pixel-text-secondary)] mb-1">Build</div>
                <div className="text-sm text-[var(--pixel-warning)]">VULNERABLE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
