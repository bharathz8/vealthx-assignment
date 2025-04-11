import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getDetectedAssets, 
  getStaticAssets, 
  getMissingAssets, 
  saveMissingAsset,
  scanDocuments
} from '../api/apiClient';
import { Asset } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [detectedAssets, setDetectedAssets] = useState<Asset[]>([]);
  const [staticAssets, setStaticAssets] = useState<Asset[]>([]);
  const [missingAssets, setMissingAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Try to get Google token if available
    const storedGoogleToken = localStorage.getItem('googleToken');
    if (storedGoogleToken) {
      setGoogleToken(storedGoogleToken);
    }
    
    fetchAllAssets();
  }, [navigate]);

  const fetchAllAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detectedRes, staticRes, missingRes] = await Promise.all([
        getDetectedAssets(),
        getStaticAssets(),
        getMissingAssets()
      ]);
      
      setDetectedAssets(detectedRes.data || []);
      setStaticAssets(staticRes.data || []);
      setMissingAssets(missingRes.data || []);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError("Failed to load your assets. Please check if you're logged in.");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanComplete(false);
    setError(null);
    try {
      await scanDocuments(googleToken || undefined);
      await fetchAllAssets();
      setScanComplete(true);
      // Reset scan complete indicator after 3 seconds
      setTimeout(() => setScanComplete(false), 3000);
    } catch (err) {
      console.error("Scan failed:", err);
      setError("Failed to scan documents. Make sure you've granted Google Drive access.");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveMissingAsset = async (asset: Asset) => {
    try {
      await saveMissingAsset(asset, googleToken || undefined);
      await fetchAllAssets();
    } catch (err) {
      console.error("Failed to save asset:", err);
      setError("Failed to save asset. Please try again.");
    }
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getAssetIcon = (type: string) => {
    switch(type) {
      case 'bank_account':
        return '🏦';
      case 'insurance':
        return '🛡️';
      case 'vehicle':
        return '🚗';
      case 'property':
        return '🏠';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading your assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Asset Dashboard</h1>
          <div className="flex items-center gap-3">
            {scanComplete && (
              <span className="text-green-600 px-3 py-1 bg-green-50 rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Scan complete!
              </span>
            )}
            {error && (
              <span className="text-red-600 px-3 py-1 bg-red-50 rounded-lg">
                {error}
              </span>
            )}
            <button
              onClick={handleScan}
              disabled={scanning}
              className={`px-4 py-2 rounded-lg flex items-center ${scanning ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              {scanning ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scan Google Drive
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Detected Assets</h3>
              <p className="text-2xl font-bold text-gray-800">{detectedAssets.length}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Static Assets</h3>
              <p className="text-2xl font-bold text-gray-800">{staticAssets.length}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Missing Assets</h3>
              <p className="text-2xl font-bold text-gray-800">{missingAssets.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Detected Assets Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">Detected Assets</h2>
              <p className="text-blue-100 text-sm">Assets found in your documents</p>
            </div>
            <div className="p-6">
              {detectedAssets.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No detected assets found.</p>
                  <p className="text-gray-400 text-sm mt-2">Scan your Google Drive to find assets</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {detectedAssets.map(asset => (
                    <div key={asset._id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{getAssetIcon(asset.type)}</span>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{asset.type.replace('_', ' ')}</div>
                        </div>
                      </div>
                      
                      {asset.type === 'bank_account' && (
                        <div className="mt-2 text-sm bg-blue-50 p-2 rounded">
                          <div className="flex justify-between">
                            <span>Balance:</span>
                            <span className="font-medium">{formatAmount(asset.balanceAmount)}</span>
                          </div>
                          {asset.accountNumber && (
                            <div className="flex justify-between mt-1">
                              <span>Account #:</span>
                              <span className="font-medium">{asset.accountNumber}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {(asset.type === 'insurance' || asset.type === 'vehicle') && (
                        <div className="mt-2 text-sm bg-blue-50 p-2 rounded">
                          <div className="flex justify-between">
                            <span>Insured Amount:</span>
                            <span className="font-medium">{formatAmount(asset.insuredAmount)}</span>
                          </div>
                          {asset.renewalDate && (
                            <div className="flex justify-between mt-1">
                              <span>Renewal:</span>
                              <span className="font-medium">{formatDate(asset.renewalDate)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Static Assets Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">Static Assets</h2>
              <p className="text-green-100 text-sm">Your tracked financial assets</p>
            </div>
            <div className="p-6">
              {staticAssets.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <p className="text-gray-500">No static assets found.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {staticAssets.map(asset => (
                    <div key={asset._id} className="border border-gray-200 rounded-lg p-3 hover:border-green-300 transition-colors">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{getAssetIcon(asset.type)}</span>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{asset.type.replace('_', ' ')}</div>
                        </div>
                      </div>
                      
                      {asset.type === 'bank_account' && asset.accountNumber && (
                        <div className="mt-2 text-sm bg-green-50 p-2 rounded">
                          <div className="flex justify-between">
                            <span>Account #:</span>
                            <span className="font-medium">{asset.accountNumber}</span>
                          </div>
                        </div>
                      )}
                      {(asset.type === 'insurance' || asset.type === 'vehicle') && asset.policyNumber && (
                        <div className="mt-2 text-sm bg-green-50 p-2 rounded">
                          <div className="flex justify-between">
                            <span>Policy #:</span>
                            <span className="font-medium">{asset.policyNumber}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Missing Assets Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-yellow-500 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">Missing Assets</h2>
              <p className="text-yellow-100 text-sm">Assets that need to be tracked</p>
            </div>
            <div className="p-6">
              {missingAssets.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">No missing assets found.</p>
                  <p className="text-gray-400 text-sm mt-2">All your assets are being tracked</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {missingAssets.map(asset => (
                    <div key={asset._id} className="border border-gray-200 rounded-lg p-3 hover:border-yellow-300 transition-colors">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{getAssetIcon(asset.type)}</span>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{asset.type.replace('_', ' ')}</div>
                        </div>
                      </div>
                      
                      {asset.type === 'bank_account' && asset.balanceAmount && (
                        <div className="mt-2 text-sm bg-yellow-50 p-2 rounded">
                          <div className="flex justify-between">
                            <span>Balance:</span>
                            <span className="font-medium">{formatAmount(asset.balanceAmount)}</span>
                          </div>
                        </div>
                      )}
                      {(asset.type === 'insurance' || asset.type === 'vehicle') && asset.renewalDate && (
                        <div className="mt-2 text-sm bg-yellow-50 p-2 rounded">
                          <div className="flex justify-between">
                            <span>Renewal:</span>
                            <span className="font-medium">{formatDate(asset.renewalDate)}</span>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleSaveMissingAsset(asset)}
                        className="w-full mt-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Database
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;