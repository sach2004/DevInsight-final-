import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RepositoryInput from '../components/RepositoryInput';
import ChatInterface from '../components/ChatInterface';
import LoadingState from '../components/LoadingState';
import FileStructure from '../components/FileStructure';
import Documentation from '../components/Documentation';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [repository, setRepository] = useState(null);
  const [error, setError] = useState(null);
  const [fileStructure, setFileStructure] = useState(null);
  const [isLoadingFileStructure, setIsLoadingFileStructure] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'structure', 'docs'
  const [documentation, setDocumentation] = useState(null);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  
  const handleProcessRepository = async (url) => {
    // Reset state
    setError(null);
    setIsProcessing(true);
    setFileStructure(null);
    setDocumentation(null);
    
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
      
      // After repository is processed, fetch file structure
      fetchFileStructure(data.repository.owner.name, data.repository.name);
      
    } catch (error) {
      console.error('Error processing repository:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const fetchFileStructure = async (owner, repo) => {
    setIsLoadingFileStructure(true);
    try {
      const response = await fetch(`/api/file-structure?owner=${owner}&repo=${repo}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch file structure');
      }
      
      setFileStructure(data.fileStructure);
    } catch (error) {
      console.error('Error fetching file structure:', error);
      setError('Failed to load file structure: ' + error.message);
    } finally {
      setIsLoadingFileStructure(false);
    }
  };
  
  const generateDocumentation = async () => {
    if (!repository) return;
    
    setIsGeneratingDocs(true);
    try {
      const response = await fetch('/api/generate-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          owner: repository.owner.name, 
          repo: repository.name 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate documentation');
      }
      
      setDocumentation(data.documentation);
      setActiveTab('docs');
    } catch (error) {
      console.error('Error generating documentation:', error);
      setError('Failed to generate documentation: ' + error.message);
    } finally {
      setIsGeneratingDocs(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
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
            <div className="bg-[#FFF4DA] shadow border-4 border-black shadow-[8px_8px_0px_0px_black] rounded-lg p-6 mb-6">
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
                    setFileStructure(null);
                    setDocumentation(null);
                  }}
                >
                  Change Repository
                </button>
              </div>
              {repository.description && (
                <p className="text-gray-700 border-t pt-4">{repository.description}</p>
              )}
            </div>
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-300 mb-6">
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'chat'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('chat')}
              >
                Chat Assistant
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'structure'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('structure')}
              >
                File Structure
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'docs'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => {
                  setActiveTab('docs');
                  if (!documentation && !isGeneratingDocs) {
                    generateDocumentation();
                  }
                }}
              >
                Documentation
              </button>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'chat' && (
              <ChatInterface repositoryInfo={repository} />
            )}
            
            {activeTab === 'structure' && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Repository Structure</h2>
                  {isLoadingFileStructure && (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                      <span className="text-gray-600 text-sm">Loading structure...</span>
                    </div>
                  )}
                </div>
                
                {fileStructure ? (
                  <FileStructure structure={fileStructure} />
                ) : isLoadingFileStructure ? (
                  <LoadingState message="Fetching repository structure..." />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">File structure not loaded yet.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => fetchFileStructure(repository.owner.name, repository.name)}
                    >
                      Load File Structure
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'docs' && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Project Documentation</h2>
                  {isGeneratingDocs ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                      <span className="text-gray-600 text-sm">Generating documentation...</span>
                    </div>
                  ) : !documentation && (
                    <button
                      className="btn btn-primary"
                      onClick={generateDocumentation}
                    >
                      Generate Documentation
                    </button>
                  )}
                </div>
                
                {documentation ? (
                  <Documentation documentation={documentation} />
                ) : isGeneratingDocs ? (
                  <LoadingState message="Generating comprehensive documentation..." />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      Generate professional documentation for this repository. This will analyze the code structure, 
                      architectural patterns, and key components to create detailed documentation.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={generateDocumentation}
                    >
                      Generate Documentation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}