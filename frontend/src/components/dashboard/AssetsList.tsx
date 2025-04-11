import React from 'react';
import { Asset } from '../../types';

interface AssetCardProps {
  title: string;
  assets: Asset[];
  onAddAsset?: (asset: Asset) => Promise<void>;
  isAddEnabled?: boolean;
}

const AssetsList: React.FC<AssetCardProps> = ({ 
  title, 
  assets, 
  onAddAsset,
  isAddEnabled = false
}) => {
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
      {assets.length === 0 ? (
        <p className="text-gray-500">No assets found.</p>
      ) : (
        <div className="space-y-3">
          {assets.map(asset => (
            <div key={asset._id} className="border border-gray-200 rounded-lg p-3">
              <div className="font-medium">{asset.name}</div>
              <div className="text-sm text-gray-500 capitalize">{asset.type.replace('_', ' ')}</div>
              
              {asset.type === 'bank_account' && (
                <>
                  {asset.accountNumber && (
                    <div className="text-sm mt-1">Account: {asset.accountNumber}</div>
                  )}
                  {asset.balanceAmount !== undefined && (
                    <div className="text-sm mt-1">Balance: {formatAmount(asset.balanceAmount)}</div>
                  )}
                </>
              )}
              
              {(asset.type === 'insurance' || asset.type === 'vehicle') && (
                <>
                  {asset.policyNumber && (
                    <div className="text-sm mt-1">Policy: {asset.policyNumber}</div>
                  )}
                  {asset.insuredAmount !== undefined && (
                    <div className="text-sm mt-1">Insured: {formatAmount(asset.insuredAmount)}</div>
                  )}
                  {asset.renewalDate && (
                    <div className="text-sm mt-1">Renewal: {formatDate(asset.renewalDate)}</div>
                  )}
                </>
              )}
              
              {isAddEnabled && onAddAsset && (
                <button
                  onClick={() => onAddAsset(asset)}
                  className="w-full mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                >
                  Add to Database
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetsList;