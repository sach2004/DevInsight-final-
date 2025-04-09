import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';


export default function Documentation({ documentation }) {
  const [activeSection, setActiveSection] = useState('overview');

  
  const renderMarkdown = (content) => {
  
    const parts = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
    
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }
      
    
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2],
      });
      
      lastIndex = match.index + match[0].length;
    }
    
 
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }
    
   
    return parts.map((part, index) => {
      if (part.type === 'text') {
       
        const formattedText = part.content
          
          .replace(/# (.*?)(\n|$)/g, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
          .replace(/## (.*?)(\n|$)/g, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
          .replace(/### (.*?)(\n|$)/g, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
        
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
          
          .replace(/- (.*?)(\n|$)/g, '<li class="ml-4">$1</li>')
          
          .replace(/\n\n/g, '</p><p class="my-3">')
        
          .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-red-600">$1</code>');

        return (
          <div 
            key={index} 
            className="prose prose-blue max-w-none" 
            dangerouslySetInnerHTML={{ __html: `<p class="my-3">${formattedText}</p>` }} 
          />
        );
      } else if (part.type === 'code') {
        return (
          <div key={index} className="my-4">
            <SyntaxHighlighter
              language={part.language}
              style={vscDarkPlus}
              showLineNumbers={true}
            >
              {part.content}
            </SyntaxHighlighter>
          </div>
        );
      }
      return null;
    });
  };

  
  const tableOfContents = Object.keys(documentation.sections).map(key => ({
    id: key,
    title: documentation.sections[key].title,
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-6 ">

      <div className="lg:w-1/4 p-4 bg-[#fffdf7] rounded-lg h-fit sticky top-4 border-4 border-black shadow-[8px_8px_0px_0px_black]">
        <h3 className="font-bold text-lg mb-4">Table of Contents</h3>
        <ul className="space-y-1">
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded ${
                activeSection === 'overview' 
                  ? 'bg-[#ffc480] text-black font-medium border-2 border-black' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => setActiveSection('overview')}
            >
              Overview
            </button>
          </li>
          {tableOfContents.map((section) => (
            <li key={section.id}>
              <button
                className={`w-full text-left px-3 py-2 rounded ${
                  activeSection === section.id 
                    ? 'bg-primary-100 text-primary-800 font-medium' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      
      <div className="lg:w-3/4 overflow-auto rounded-lg border-4 border-black shadow-[8px_8px_0px_0px_black]">
        <div className="bg-[#fffdf7] p-6 rounded-lg ">
          {activeSection === 'overview' ? (
            <>
              <h1 className="text-2xl font-bold mb-4">{documentation.title}</h1>
              <div className="mb-6 text-gray-700">
                {renderMarkdown(documentation.overview)}
              </div>
              
              {documentation.meta && (
                <div className="grid grid-cols-2 gap-4 mb-6 mt-8 bg-gray-50 p-4 rounded-lg">
                  {documentation.meta.language && (
                    <div>
                      <h3 className="font-medium text-gray-700">Primary Language</h3>
                      <p>{documentation.meta.language}</p>
                    </div>
                  )}
                  {documentation.meta.framework && (
                    <div>
                      <h3 className="font-medium text-gray-700">Framework</h3>
                      <p>{documentation.meta.framework}</p>
                    </div>
                  )}
                  {documentation.meta.dependencies && (
                    <div className="col-span-2">
                      <h3 className="font-medium text-gray-700">Key Dependencies</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {documentation.meta.dependencies.map(dep => (
                          <span key={dep} className="bg-gray-200 px-2 py-1 rounded text-xs">{dep}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4">{documentation.sections[activeSection].title}</h2>
              <div>
                {renderMarkdown(documentation.sections[activeSection].content)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}