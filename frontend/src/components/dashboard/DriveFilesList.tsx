import React, { useState } from 'react';
import { DriveFile, ProcessedFileResult } from '../../types';
import Button from '../common/Button';
import { processFile } from '../../api/apiClient';

interface DriveFilesListProps {
  files: DriveFile[];
  onRefresh: () => void;
  onScanAll: () => void;
}

const DriveFilesList: React.FC<DriveFilesListProps> = ({ files, onRefresh, onScanAll }) => {
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<ProcessedFileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessFile = async (fileId: string) => {
    setProcessingFile(fileId);
    setError(null);
    setProcessedResult(null);
    
    try {
      const response = await processFile(fileId);
      setProcessedResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process file');
    } finally {
      setProcessingFile(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Google Drive Files</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onRefresh}>
            Refresh
          </Button>
          <Button onClick={onScanAll}>
            Scan All Documents
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {processedResult && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">File processed successfully!</p>
          <p>Document Type: {processedResult.documentType.replace('_', ' ')}</p>
          {processedResult.extractedData.name && (
            <p>Detected Asset: {processedResult.extractedData.name}</p>
          )}
        </div>
      )}

      {files.length === 0 ? (
        <p className="text-gray-500">No files found in your Google Drive.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{file.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{file.mimeType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="outline"
                      onClick={() => handleProcessFile(file.id)}
                      disabled={processingFile === file.id}
                    >
                      {processingFile === file.id ? 'Processing...' : 'Process'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DriveFilesList;