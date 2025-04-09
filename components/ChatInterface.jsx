import { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';


export default function ChatInterface({ repositoryInfo }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  
  useEffect(() => {
    if (repositoryInfo) {
      const initialMessage = {
        id: 'initial',
        role: 'assistant',
        content: `I'm ready to help you explore the ${repositoryInfo.name} repository. What would you like to know about the codebase?`,
      };
      setMessages([initialMessage]);
    }
  }, [repositoryInfo]);
  
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    
    
    setMessages((prev) => [...prev, userMessage]);
    

    setInput('');
    
    
    setIsLoading(true);
    
    try {
     
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      
      const assistantMessage = {
        id: Date.now().toString() + '-response',
        role: 'assistant',
        content: data.answer,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting chat response:', error);
      
     
      const errorMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        error: true,
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const renderMessage = (message) => {
    const { role, content, error } = message;
    
    
    const formattedContent = processMessageContent(content);
    
    return (
      <div 
        className={`p-4 rounded-lg mb-4 ${
          role === 'user' 
            ? 'bg-primary-100 ml-8' 
            : error 
              ? 'bg-red-100 mr-8' 
              : 'bg-gray-100 mr-8'
        }`}
      >
        <div className="flex items-center mb-2">
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              role === 'user' ? 'bg-primary-600' : error ? 'bg-red-600' : 'bg-gray-700'
            }`}
          >
            {role === 'user' ? 'U' : 'A'}
          </div>
          <span className="ml-2 font-medium">
            {role === 'user' ? 'You' : 'Assistant'}
          </span>
        </div>
        
        <div className="prose prose-sm max-w-none">
          {formattedContent.map((part, index) => {
            if (part.type === 'text') {
              return <p key={index}>{part.content}</p>;
            } else if (part.type === 'code') {
              return (
                <div key={index} className="my-4 rounded-md overflow-hidden">
                  <SyntaxHighlighter
                    language={part.language || 'javascript'}
                    style={vscDarkPlus}
                    showLineNumbers={true}
                  >
                    {part.content}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };
  
  
  const processMessageContent = (content) => {
    if (!content) return [{ type: 'text', content: '' }];
    
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
    
    
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content,
      });
    }
    
    return parts;
  };
  
  return (
    <div className="bg-[#fff4da] border-4 border-black shadow-[8px_8px_0px_0px_black] rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Ask about {repositoryInfo.name}</h2>
      
      <div className="bg-[#FFFDF8] border-4 border-black rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        {messages.map((message) => (
          <div className="bg-[]" key={message.id}>
            {renderMessage(message)}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
            <span className="text-gray-600">Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          className="input flex-grow mr-2 border-4  border-black w-[80%] shadow-[8px_8px_0px_0px_black] rounded-lg focus:outline-none focus:ring-0 focus:border-black" 
          placeholder="Ask a question about the codebase..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn btn-black ml-4 bg-[#FFC480] border-4 h-full border-black shadow-[8px_8px_0px_0px_black] rounded-lg "
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </form>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Examples: "Explain the project structure", "How does the authentication work?", "What is the purpose of the XYZ component?"</p>
      </div>
    </div>
  );
}



// import { useState, useRef, useEffect } from 'react';
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// /**
//  * Chat interface for interacting with the codebase
//  */
// export default function ChatInterface({ repositoryInfo }) {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const messagesEndRef = useRef(null);
  
//   // Initial message
//   useEffect(() => {
//     if (repositoryInfo) {
//       const initialMessage = {
//         id: 'initial',
//         role: 'assistant',
//         content: `I'm ready to help you explore the ${repositoryInfo.name} repository. What would you like to know about the codebase?`,
//       };
//       setMessages([initialMessage]);
//     }
//   }, [repositoryInfo]);
  
//   // Auto-scroll to the bottom when messages change
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);
  
//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!input.trim() || isLoading) return;
    
//     const userMessage = {
//       id: Date.now().toString(),
//       role: 'user',
//       content: input.trim(),
//     };
    
//     // Add user message to chat
//     setMessages((prev) => [...prev, userMessage]);
    
//     // Clear input
//     setInput('');
    
//     // Set loading state
//     setIsLoading(true);
    
//     try {
//       // Call the chat API to get a response
//       const response = await fetch('/api/chat', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           question: userMessage.content,
//           repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,
//         }),
//       });
      
//       if (!response.ok) {
//         throw new Error('Failed to get response');
//       }
      
//       const data = await response.json();
      
//       // Add assistant response to chat
//       const assistantMessage = {
//         id: Date.now().toString() + '-response',
//         role: 'assistant',
//         content: data.answer,
//       };
      
//       setMessages((prev) => [...prev, assistantMessage]);
//     } catch (error) {
//       console.error('Error getting chat response:', error);
      
//       // Add error message
//       const errorMessage = {
//         id: Date.now().toString() + '-error',
//         role: 'assistant',
//         content: 'Sorry, I encountered an error while processing your question. Please try again.',
//         error: true,
//       };
      
//       setMessages((prev) => [...prev, errorMessage]);
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   /**
//    * Renders a chat message with markdown support
//    */
//   const renderMessage = (message) => {
//     const { role, content, error } = message;
    
//     // Process content to handle markdown code blocks
//     const formattedContent = processMessageContent(content);
    
//     return (
//       <div 
//         className={`p-4 rounded-lg mb-4 ${
//           role === 'user' 
//             ? 'bg-primary-100 ml-8' 
//             : error 
//               ? 'bg-red-100 mr-8' 
//               : 'bg-gray-100 mr-8'
//         }`}
//       >
//         <div className="flex items-center mb-2">
//           <div 
//             className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
//               role === 'user' ? 'bg-primary-600' : error ? 'bg-red-600' : 'bg-gray-700'
//             }`}
//           >
//             {role === 'user' ? 'U' : 'A'}
//           </div>
//           <span className="ml-2 font-medium">
//             {role === 'user' ? 'You' : 'Assistant'}
//           </span>
//         </div>
        
//         <div className="prose prose-sm max-w-none">
//           {formattedContent.map((part, index) => {
//             if (part.type === 'text') {
//               return <p key={index}>{part.content}</p>;
//             } else if (part.type === 'code') {
//               return (
//                 <div key={index} className="my-4 rounded-md overflow-hidden">
//                   <SyntaxHighlighter
//                     language={part.language || 'javascript'}
//                     style={vscDarkPlus}
//                     showLineNumbers={true}
//                   >
//                     {part.content}
//                   </SyntaxHighlighter>
//                 </div>
//               );
//             }
//             return null;
//           })}
//         </div>
//       </div>
//     );
//   };
  
//   /**
//    * Process message content to handle code blocks
//    */
//   const processMessageContent = (content) => {
//     if (!content) return [{ type: 'text', content: '' }];
    
//     const parts = [];
//     const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
//     let lastIndex = 0;
//     let match;
    
//     while ((match = codeBlockRegex.exec(content)) !== null) {
//       // Add text before the code block
//       if (match.index > lastIndex) {
//         parts.push({
//           type: 'text',
//           content: content.slice(lastIndex, match.index),
//         });
//       }
      
//       // Add the code block
//       parts.push({
//         type: 'code',
//         language: match[1] || 'text',
//         content: match[2],
//       });
      
//       lastIndex = match.index + match[0].length;
//     }
    
//     // Add any remaining text
//     if (lastIndex < content.length) {
//       parts.push({
//         type: 'text',
//         content: content.slice(lastIndex),
//       });
//     }
    
//     // If no code blocks were found, return the whole content as text
//     if (parts.length === 0) {
//       parts.push({
//         type: 'text',
//         content,
//       });
//     }
    
//     return parts;
//   };
  
//   return (
//     <div className="bg-[#fff4da] border-4 border-black shadow-[8px_8px_0px_0px_black] rounded-lg p-6">
//       <h2 className="text-xl font-semibold mb-4">Ask about {repositoryInfo.name}</h2>
      
//       <div className="bg-[#FFFDF8] border-4 border-black rounded-lg p-4 mb-4 h-96 overflow-y-auto">
//         {messages.map((message) => (
//           <div key={message.id}>
//             {renderMessage(message)}
//           </div>
//         ))}
        
//         {isLoading && (
//           <div className="flex justify-center items-center py-4">
//             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
//             <span className="text-gray-600">Thinking...</span>
//           </div>
//         )}
        
//         <div ref={messagesEndRef} />
//       </div>
      
//       <form onSubmit={handleSubmit} className="flex">
//         <input
//           type="text"
//           className="input flex-grow mr-2 border-4  border-black w-[80%] shadow-[8px_8px_0px_0px_black] rounded-lg focus:outline-none focus:ring-0 focus:border-black"
//           placeholder="Ask a question about the codebase..."
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           disabled={isLoading}
//         />
//         <button
//           type="submit"
//           className="btn btn-black ml-4 bg-[#FFC480] border-4 h-full border-black shadow-[8px_8px_0px_0px_black] rounded-lg"
//           disabled={isLoading || !input.trim()}
//         >
//           Send
//         </button>
//       </form>
      
//       <div className="mt-4 text-sm text-gray-600">
//         <p>Examples: "Explain the project structure", "How does the authentication work?", "What is the purpose of the XYZ component?"</p>
//       </div>
      
//       <style jsx global>{`
//         .message-text h2, .message-text h3 {
//           margin-top: 0.75rem;
//           margin-bottom: 0.5rem;
//           font-weight: 600;
//         }
        
//         .message-text ul, .message-text ol {
//           margin: 0.5rem 0;
//           padding-left: 1.5rem;
//         }
        
//         .message-text li {
//           margin: 0.25rem 0;
//         }
        
//         .message-text code {
//           background-color: #f3f4f6;
//           padding: 0.1rem 0.2rem;
//           border-radius: 0.25rem;
//           font-family: monospace;
//           font-size: 0.875rem;
//           color: #e53e3e;
//         }
        
//         .message-text p {
//           margin: 0.5rem 0;
//         }
//       `}</style>
//     </div>
//   );;
// }