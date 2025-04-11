import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDetectedAssets, getStaticAssets, getMissingAssets } from '../api/apiClient';
import AssetsList from '../components/dashboard/AssetsList';
import MissingAssetForm from '../components/dashboard/MissingAssetForm';
import { Asset } from '../types';

const AssetPage: React.FC = () => {
  const navigate = useNavigate();
  const [detectedAssets, setDetectedAssets] = useState<Asset[]>([]);
  const [staticAssets, setStaticAssets] = useState<Asset[]>([]);
  const [missingAssets, setMissingAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    
    fetchAllAssets();
  }, [navigate]);

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      const [detectedRes, staticRes, missingRes] = await Promise.all([
        getDetectedAssets(),
        getStaticAssets(),
        getMissingAssets()
      ]);
      
      setDetectedAssets(detectedRes.data);
      setStaticAssets(staticRes.data);
      setMissingAssets(missingRes.data);
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  };

  // Combine all assets
  const allAssets = [...detectedAssets, ...staticAssets, ...missingAssets];

  // Filter assets based on activeFilter and searchTerm
  const filteredAssets = allAssets.filter(asset => {
    const matchesFilter = !activeFilter || asset.type === activeFilter;
    const matchesSearch = !searchTerm || 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.accountNumber && asset.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.policyNumber && asset.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const assetTypes = Array.from(new Set(allAssets.map(asset => asset.type)));

  const goBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={goBack} 
            className="mr-4 text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-800">All Assets</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter(null)}
                className={`px-4 py-2 rounded-full text-sm ${
                  activeFilter === null 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              
              {assetTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`px-4 py-2 rounded-full text-sm capitalize ${
                    activeFilter === type 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading assets...</p>
          </div>
        ) : (
          <>
            <AssetsList assets={filteredAssets} title="Assets" />
            
            <div className="mt-8">
              <MissingAssetForm onAssetAdded={fetchAllAssets} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AssetPage;