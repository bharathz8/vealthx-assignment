import React, { useState, useEffect } from 'react';
import Button from '../common/Button';

interface GoogleDriveAuthProps {
  onAuthSuccess: () => void;
}

const GoogleDriveAuth: React.FC<GoogleDriveAuthProps> = ({ onAuthSuccess }) => {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we're returning from OAuth redirect
  useEffect(() => {
    // Parse URL parameters (in case we're coming back from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    // If we have a code in the URL, exchange it for tokens
    if (code) {
      exchangeCodeForTokens(code);
    } else if (error) {
      setError('Authorization was denied or canceled.');
    }

    // Clean up URL after processing
    if (code || error) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Function to exchange authorization code for tokens
  const exchangeCodeForTokens = async (code: string) => {
    setIsAuthorizing(true);
    try {
      const response = await fetch('http://localhost:5000/api/googledrive/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsAuthorized(true);
        onAuthSuccess();
      } else {
        throw new Error(data.message || 'Failed to complete authorization');
      }
    } catch (err) {
      setError('Failed to complete Google Drive authorization. Please try again.');
      console.error(err);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleAuthClick = async () => {
    setIsAuthorizing(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/googledrive/authorize', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.authUrl) {
        // First, store current state so we can check it after redirect
        localStorage.setItem('googleDriveAuthPending', 'true');
        
        // Redirect to the Google authorization page in the same window
        // This is more reliable than using window.open() for OAuth flows
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (err) {
      setError('Failed to initiate Google Drive authorization. Please try again.');
      console.error(err);
      setIsAuthorizing(false);
    }
  };

  // Check if we already have authorization from previous sessions
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/googledrive/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const data = await response.json();
        
        if (data.isAuthorized) {
          setIsAuthorized(true);
        }
      } catch (err) {
        console.error('Error checking authorization status:', err);
      }
    };
    
    checkExistingAuth();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Google Drive Authorization</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isAuthorized ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p>✓ Google Drive connected successfully!</p>
          <p className="text-sm mt-1">We can now scan your documents for financial information.</p>
        </div>
      ) : (
        <div>
          <p className="mb-4">
            Connect your Google Drive to automatically detect financial assets from your documents.
          </p>
          <Button
            onClick={handleAuthClick}
            disabled={isAuthorizing}
          >
            {isAuthorizing ? 'Connecting...' : 'Connect Google Drive'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveAuth;