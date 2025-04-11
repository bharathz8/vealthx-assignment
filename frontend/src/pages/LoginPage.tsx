import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Footer from '../components/common/Footer';

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!(window as any).google) return;

    (window as any).google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });
  }, []);
  console.log(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!(window as any).google) {
      setError('Google API not loaded');
      return;
    }
    (window as any).google.accounts.id.prompt();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to VealthX
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Track and manage all your financial assets in one place
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="flex items-center justify-center"
              >
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LoginPage;
