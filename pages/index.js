import { useState } from 'react';
import Layout from '../components/Layout';
import RepositoryInput from '../components/RepositoryInput';
import ChatInterface from '../components/ChatInterface';
import LoadingState from '../components/LoadingState';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [repository, setRepository] = useState(null);
  const [error, setError] = useState(null);
  
  const handleProcessRepository = async (url) => {
    // Reset state
    setError(null);
    setIsProcessing(true);
    
    try {
      // Call the API to process the repository
      const response = await fetch('/api/process-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to process repository');
      }
      
      // Set repository data
      setRepository(data.repository);
    } catch (error) {
      console.error('Error processing repository:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {!repository ? (
          <RepositoryInput onSubmit={handleProcessRepository} isLoading={isProcessing} />
        ) : (
          <div>
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                {repository.owner.avatar && (
                  <img 
                    src={repository.owner.avatar} 
                    alt={repository.owner.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold">{repository.name}</h2>
                  <p className="text-gray-600">by {repository.owner.name}</p>
                </div>
                <div className="ml-auto flex items-center">
                  <span className="bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
                    {repository.language || 'Multiple Languages'}
                  </span>
                  <span className="text-gray-600 text-sm">
                    ⭐ {repository.stars}
                  </span>
                </div>
              </div>
              {repository.description && (
                <p className="text-gray-700 border-t pt-4">{repository.description}</p>
              )}
              <div className="mt-4 text-right">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setRepository(null);
                    setError(null);
                  }}
                >
                  Change Repository
                </button>
              </div>
            </div>
            
            <ChatInterface repositoryInfo={repository} />
          </div>
        )}
      </div>
    </Layout>
  );
}