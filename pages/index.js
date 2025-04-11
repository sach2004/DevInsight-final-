import { useState } from 'react';
import Layout from '../components/Layout';
import RepositoryInput from '../components/RepositoryInput';
import ChatInterface from '../components/ChatInterface';
import FileStructure from '../components/FileStructure';
import Documentation from '../components/Documentation';
import LoadingState from '../components/LoadingState';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [repository, setRepository] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  
  const handleProcessRepository = async (url) => {
    
    setError(null);
    setIsProcessing(true);
    
    try {
      
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
      
      console.log(JSON.stringify(data.repository))
     
      setRepository(data.repository);
      console.log(JSON.stringify(repository))
    } catch (error) {
      console.error('Error processing repository:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
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
            <div className="bg-[#FFF4DA] border-4 border-black shadow-[8px_8px_0px_0px_black] rounded-lg p-6 mb-6">
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
                <button
                  className="btn btn-secondary ml-5 bg-[#FFC480] border-4 h-full border-black shadow-[8px_8px_0px_0px_black] rounded-lg"
                  onClick={() => {
                    setRepository(null);
                    setError(null);
                  }}
                >
                  Change Repository
                </button>
              </div>
              {repository.description && (
                <p className="text-gray-700 border-t pt-4">{repository.description}</p>
              )}
            </div>
            
           
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 font-medium text-sm mr-4 ${
                  activeTab === 'chat' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm mr-4 ${
                  activeTab === 'structure' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => setActiveTab('structure')}
              >
                File Structure
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'docs' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => setActiveTab('docs')}
              >
                Documentation
              </button>
            </div>
            
           
            <div>
              {activeTab === 'chat' && <ChatInterface repositoryInfo={repository} />}
              {activeTab === 'structure' && <FileStructure repositoryInfo={repository} />}
              {activeTab === 'docs' && <Documentation repositoryInfo={repository} />}
            </div>
          </div>
        )}
      </div>
      
    
      <div id="toast-container" className="fixed bottom-0 right-0 p-4 z-50"></div>
    </Layout>
  );
}