import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/common/Button';
import Footer from '../components/common/Footer';

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if the user is already logged in
    const token = localStorage.getItem('token');
    // if (token) {
    //   navigate('/dashboard');
    //   return;
    // }

    // Check for query parameters in case we're returning from OAuth
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    
    if (errorParam) {
      switch (errorParam) {
        case 'missing-code':
          setError('Authentication code was missing. Please try again.');
          break;
        case 'invalid-token':
          setError('Could not validate your Google account. Please try again.');
          break;
        case 'auth-failed':
          setError('Authentication failed. Please try again.');
          break;
        default:
          setError('An error occurred during sign-in. Please try again.');
      }
    }
  }, [navigate, location]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Request auth URL from backend
      const response = await fetch('http://localhost:5000/api/auth/url');
      
      if (!response.ok) {
        throw new Error('Failed to get authentication URL');
      }
      
      const data = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Failed to initiate Google login:', err);
      setError(err.message || 'Failed to start Google authentication. Please try again.');
      setIsLoading(false);
    }
  };

  // For development/debugging: clear localStorage to reset login state
  const handleClearStorage = () => {
    localStorage.clear();
    setError('Local storage cleared. You can now test the login flow.');
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
                className="flex items-center justify-center w-full"
              >
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </Button>
              
              {/* For development only - remove in production */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleClearStorage}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear storage (Dev only)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LoginPage;