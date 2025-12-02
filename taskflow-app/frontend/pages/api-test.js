// API設定テストページ
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function ApiTest() {
  const [config, setConfig] = useState({});

  useEffect(() => {
    setConfig({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      API_URL: process.env.API_URL,
      NODE_ENV: process.env.NODE_ENV,
      allEnv: process.env
    });
  }, []);

  const testBackend = async () => {
    try {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      console.log('Backend health check:', data);
      alert('Backend is working! Check console for details.');
    } catch (error) {
      console.error('Backend error:', error);
      alert('Backend is NOT working! Check console for details.');
    }
  };

  const testLogin = async () => {
    try {
      console.log('Sending login request to: http://localhost:3001/api/auth/login');
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);

      const data = await response.json();
      console.log('Login response data:', data);

      if (response.ok) {
        alert(`Login SUCCESS! Token: ${data.token?.substring(0, 20)}...`);
      } else {
        alert(`Login FAILED! Status: ${response.status}, Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(`Login request FAILED! Error: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>API Configuration Test</title>
      </Head>
      <div className="min-h-screen p-8">
        <h1 className="text-3xl mb-8">API Configuration Test</h1>

        <div className="mb-8">
          <h2 className="text-xl mb-4">Environment Variables:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>

        <div className="space-x-4">
          <button
            onClick={testBackend}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Backend Health
          </button>
          <button
            onClick={testLogin}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Login
          </button>
        </div>
      </div>
    </>
  );
}
