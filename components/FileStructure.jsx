import { useState } from 'react';
import { getLanguageForSyntaxHighlighting } from '../lib/utils';


export default function FileStructure({ structure }) {
  const [expandedFolders, setExpandedFolders] = useState({});
  
  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };
  
  const renderTree = (node, path = '', depth = 0) => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isFolder = node.type === 'dir';
    const isExpanded = expandedFolders[currentPath];
    
   
    if (isFolder && ['node_modules', '.git', 'dist', 'build', '.next'].includes(node.name)) {
      return null;
    }
    
    return (
      <div key={currentPath} className="mb-1">
        <div 
          className={`flex items-center ${isFolder ? 'cursor-pointer hover:bg-gray-100' : ''} py-1 px-2 rounded`}
          style={{ marginLeft: `${depth * 20}px` }}
          onClick={isFolder ? () => toggleFolder(currentPath) : undefined}
        >
          {isFolder ? (
            <span className="mr-2 text-gray-700">
              {isExpanded ? '📂' : '📁'}
            </span>
          ) : (
            <span className="mr-2 text-gray-600">📄</span>
          )}
          
          <span className={`${isFolder ? 'font-medium' : 'text-gray-800'}`}>
            {node.name}
          </span>
          
          {!isFolder && getLanguageBadge(node.name)}
        </div>
        
        {isFolder && isExpanded && node.children && (
          <div className="ml-4">
            {node.children.map(child => renderTree(child, currentPath, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const getLanguageBadge = (filename) => {
    const language = getLanguageForSyntaxHighlighting(filename);
    const colorMap = {
      javascript: 'bg-yellow-100 text-yellow-800',
      typescript: 'bg-blue-100 text-blue-800',
      jsx: 'bg-green-100 text-green-800',
      tsx: 'bg-indigo-100 text-indigo-800',
      python: 'bg-green-100 text-green-800',
      java: 'bg-red-100 text-red-800',
      go: 'bg-blue-100 text-blue-800',
      cpp: 'bg-purple-100 text-purple-800',
      c: 'bg-purple-100 text-purple-800',
      rust: 'bg-orange-100 text-orange-800',
      html: 'bg-red-100 text-red-800',
      css: 'bg-pink-100 text-pink-800',
      markdown: 'bg-gray-100 text-gray-800',
      json: 'bg-yellow-100 text-yellow-800',
      yaml: 'bg-indigo-100 text-indigo-800',
      text: 'bg-gray-100 text-gray-800',
    };
    
    return language !== 'text' ? (
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${colorMap[language] || 'bg-gray-100 text-gray-800'}`}>
        {language}
      </span>
    ) : null;
  };
  
  
  if (structure && structure.children && !expandedFolders['root']) {
    setExpandedFolders({ 'root': true });
  }
  
  return (
    <div className="bg-[#fffdf7] font-mono text-sm overflow-auto max-h-[600px] rounded-lg p-4 border-4 border-black shadow-[8px_8px_0px_0px_black]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <button 
            className="text-sm text-primary-600 hover:text-primary-800"
            onClick={() => {
              
              const newExpandedFolders = { ...expandedFolders };
              if (structure && structure.children) {
                structure.children.forEach(child => {
                  if (child.type === 'dir') {
                    newExpandedFolders[child.name] = true;
                  }
                });
              }
              setExpandedFolders(newExpandedFolders);
            }}
          >
            Expand First Level
          </button>
          <span className="mx-2">|</span>
          <button 
            className="text-sm text-primary-600 hover:text-primary-800"
            onClick={() => setExpandedFolders({})}
          >
            Collapse All
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          Click on folders to expand/collapse
        </div>
      </div>
      
      {structure ? (
        <div>
         
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 py-1 px-2 rounded"
            onClick={() => toggleFolder('root')}
          >
            <span className="mr-2 text-gray-700">
              {expandedFolders['root'] ? '📂' : '📁'}
            </span>
            <span className="font-bold">/</span>
          </div>
          
          
          {expandedFolders['root'] && structure.children && (
            <div className="ml-4">
              {structure.children.map(child => renderTree(child, '', 1))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          No file structure available
        </div>
      )}
    </div>
  );
}