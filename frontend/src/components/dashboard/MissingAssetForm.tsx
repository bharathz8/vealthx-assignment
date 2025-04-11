import React, { useState } from 'react';
import { saveMissingAsset } from '../../api/apiClient';

interface SimpleMissingAssetFormProps {
  onAssetAdded: () => void;
  accessToken?: string;
}

const MissingAssetForm: React.FC<SimpleMissingAssetFormProps> = ({ onAssetAdded}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank_account',
    accountNumber: '',
    policyNumber: '',
    balanceAmount: '',
    insuredAmount: '',
    renewalDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.type) {
      setError('Name and type are required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for submission
      const dataToSubmit = {
        ...formData,
        balanceAmount: formData.balanceAmount ? parseFloat(formData.balanceAmount) : undefined,
        insuredAmount: formData.insuredAmount ? parseFloat(formData.insuredAmount) : undefined,
        renewalDate: formData.renewalDate || undefined
      };
      
      await saveMissingAsset(dataToSubmit);
      
      // Reset form
      setFormData({
        name: '',
        type: 'bank_account',
        accountNumber: '',
        policyNumber: '',
        balanceAmount: '',
        insuredAmount: '',
        renewalDate: ''
      });
      
      setShowForm(false);
      onAssetAdded();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Add Missing Asset</h2>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Add New Asset
          </button>
        )}
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Asset Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter asset name"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Asset Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="bank_account">Bank Account</option>
                <option value="insurance">Insurance</option>
                <option value="vehicle">Vehicle</option>
              </select>
            </div>
            
            {formData.type === 'bank_account' && (
              <>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    placeholder="Enter account number"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Balance Amount
                  </label>
                  <input
                    type="number"
                    name="balanceAmount"
                    value={formData.balanceAmount}
                    onChange={handleChange}
                    placeholder="Enter balance amount"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
              </>
            )}
            
            {(formData.type === 'insurance' || formData.type === 'vehicle') && (
              <>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    name="policyNumber"
                    value={formData.policyNumber}
                    onChange={handleChange}
                    placeholder="Enter policy number"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Insured Amount
                  </label>
                  <input
                    type="number"
                    name="insuredAmount"
                    value={formData.insuredAmount}
                    onChange={handleChange}
                    placeholder="Enter insured amount"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    name="renewalDate"
                    value={formData.renewalDate}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-blue-400"
            >
              {isSubmitting ? 'Adding...' : 'Add Asset'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default MissingAssetForm;