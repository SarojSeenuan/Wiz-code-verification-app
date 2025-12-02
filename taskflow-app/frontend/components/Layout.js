/**
 * Layout Component - 共通レイアウト
 * すべてのページで使用される共通構造
 */

import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, title = 'TaskFlow - 8bit Task Manager' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Retro 8-bit style task management application - Wiz Verification Project" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          {children}
        </main>

        <Footer />
      </div>
    </>
  );
}
