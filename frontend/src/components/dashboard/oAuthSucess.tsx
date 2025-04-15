import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuthSuccess: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userId = params.get('userId');
    console.log("token: ", token);
    console.log("userId: ", userId);

    if (!token || !userId) {
      setError('Authentication failed: Missing token or user ID');
      return;
    }

    try {
      // Store authentication data
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      
      // Add token expiration time (24 hours)
      const expiresAt = new Date().getTime() + (24 * 60 * 60 * 1000);
      localStorage.setItem('tokenExpiry', expiresAt.toString());
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error storing authentication data:', err);
      setError('Failed to complete authentication. Please try again.');
    }
  }, [location, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Signing In</h2>
        <p className="text-gray-600">Completing authentication...</p>
        <div className="mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
};

export default OAuthSuccess;