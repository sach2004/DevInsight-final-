/**
 * Chunker utility for splitting code files into smaller, semantically meaningful chunks
 */

// Token estimate based on whitespace-split words (rough approximation)
function estimateTokens(text) {
  return text.split(/\s+/).length;
}

/**
 * Splits a code file into chunks based on functions, classes, or size
 * @param {string} content - The file content to chunk
 * @param {string} filePath - Path of the file 
 * @param {number} maxTokens - Maximum token size per chunk (default 400)
 * @returns {Array} - Array of chunks with metadata
 */
export function chunkCodeFile(content, filePath, maxTokens = 400) {
  const extension = filePath.split('.').pop().toLowerCase();
  const chunks = [];
  
  // Extract file metadata for context
  const fileMetadata = {
    path: filePath,
    language: getLanguageFromExtension(extension),
    extension: extension
  };
  
  // Perform language-specific chunking when possible
  switch(fileMetadata.language) {
    case 'javascript':
    case 'typescript':
      return chunkJSTS(content, fileMetadata, maxTokens);
    case 'python':
      return chunkPython(content, fileMetadata, maxTokens);
    case 'java':
      return chunkJava(content, fileMetadata, maxTokens);
    case 'go':
      return chunkGo(content, fileMetadata, maxTokens);
    case 'c':
    case 'cpp':
      return chunkCCpp(content, fileMetadata, maxTokens);
    case 'rust':
      return chunkRust(content, fileMetadata, maxTokens);
    default:
      // Fallback to simpler chunking for other file types
      return chunkBySize(content, fileMetadata, maxTokens);
  }
}

/**
 * Gets the programming language from file extension
 * @param {string} extension - File extension
 * @returns {string} - Language name
 */
function getLanguageFromExtension(extension) {
  const extensionMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'hpp': 'cpp',
    'rs': 'rust',
    'html': 'html',
    'css': 'css'
  };
  
  return extensionMap[extension] || 'text';
}

/**
 * Chunk JavaScript/TypeScript files
 */
function chunkJSTS(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let currentChunk = '';
  let currentChunkName = '';
  let currentImports = '';
  let inImportSection = true;
  let blockDepth = 0;
  
  // First pass to collect imports
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
      currentImports += line + '\n';
    } else if (line.trim() !== '') {
      inImportSection = false;
    }
    
    if (!inImportSection) break;
  }
  
  inImportSection = false;
  
  // Second pass for actual chunking
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines that are already in the imports section
    if (inImportSection) {
      if (line.trim().startsWith('import ') || line.trim().startsWith('export ') || line.trim() === '') {
        continue;
      }
      inImportSection = false;
    }
    
    // Function/class/component detection
    if (blockDepth === 0 && 
        (line.match(/function\s+(\w+)\s*\(/) || 
         line.match(/class\s+(\w+)/) ||
         line.match(/const\s+(\w+)\s*=\s*(\(\s*\)|function|\{)/) ||
         line.match(/export\s+(default\s+)?function\s+(\w+)/) ||
         line.match(/export\s+(default\s+)?class\s+(\w+)/))) {
      
      // If we've accumulated content, save it as a chunk
      if (currentChunk.trim()) {
        chunks.push({
          content: currentImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      // Extract function/class name for the chunk
      const functionMatch = line.match(/function\s+(\w+)\s*\(/);
      const classMatch = line.match(/class\s+(\w+)/);
      const constMatch = line.match(/const\s+(\w+)\s*=/);
      const exportFunctionMatch = line.match(/export\s+(default\s+)?function\s+(\w+)/);
      const exportClassMatch = line.match(/export\s+(default\s+)?class\s+(\w+)/);
      
      if (functionMatch) currentChunkName = functionMatch[1];
      else if (classMatch) currentChunkName = classMatch[1];
      else if (constMatch) currentChunkName = constMatch[1];
      else if (exportFunctionMatch) currentChunkName = exportFunctionMatch[2];
      else if (exportClassMatch) currentChunkName = exportClassMatch[2];
      
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
    
    // Track block depth (curly braces)
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    blockDepth += openBraces - closeBraces;
    
    // Check if current chunk exceeds token limit
    if (estimateTokens(currentChunk) > maxTokens && blockDepth === 0) {
      chunks.push({
        content: currentImports + currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: currentChunkName || 'Unnamed section'
        }
      });
      currentChunk = '';
    }
  }
  
  // Add the last chunk if there's any content left
  if (currentChunk.trim()) {
    chunks.push({
      content: currentImports + currentChunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'code',
        name: currentChunkName || 'Unnamed section'
      }
    });
  }
  
  return chunks;
}

/**
 * Chunk Python files
 */
function chunkPython(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let currentChunk = '';
  let currentChunkName = '';
  let currentImports = '';
  let inImportSection = true;
  let inFunction = false;
  let inClass = false;
  let indentLevel = 0;
  
  // First pass to collect imports
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
      currentImports += line + '\n';
    } else if (line.trim() !== '' && !line.trim().startsWith('#')) {
      inImportSection = false;
      break;
    }
  }
  
  inImportSection = false;
  
  // Second pass for chunking
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines already handled in import section
    if (inImportSection) {
      if (line.trim().startsWith('import ') || line.trim().startsWith('from ') || line.trim() === '' || line.trim().startsWith('#')) {
        continue;
      }
      inImportSection = false;
    }
    
    // Detect function or class definitions at root level (no indentation)
    if (line.trim() !== '' && !line.trim().startsWith(' ') && !line.trim().startsWith('\t')) {
      // Function detection
      if (line.trim().startsWith('def ')) {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentImports + currentChunk,
            metadata: {
              ...fileMetadata,
              chunkType: 'code',
              name: currentChunkName || 'Unnamed section'
            }
          });
        }
        
        const functionMatch = line.match(/def\s+(\w+)\s*\(/);
        currentChunkName = functionMatch ? functionMatch[1] : 'Unnamed function';
        currentChunk = line + '\n';
        inFunction = true;
        indentLevel = 1;
      }
      // Class detection
      else if (line.trim().startsWith('class ')) {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentImports + currentChunk,
            metadata: {
              ...fileMetadata,
              chunkType: 'code',
              name: currentChunkName || 'Unnamed section'
            }
          });
        }
        
        const classMatch = line.match(/class\s+(\w+)/);
        currentChunkName = classMatch ? classMatch[1] : 'Unnamed class';
        currentChunk = line + '\n';
        inClass = true;
        indentLevel = 1;
      }
      // End of function or class
      else if (inFunction || inClass) {
        inFunction = false;
        inClass = false;
        indentLevel = 0;
        
        chunks.push({
          content: currentImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName
          }
        });
        
        currentChunk = line + '\n';
        currentChunkName = '';
      }
      else {
        currentChunk += line + '\n';
      }
    } 
    // Inside a function or class, keep track of indentation
    else if (inFunction || inClass) {
      // Check if we're still in the function/class by looking at indentation
      const lineIndent = line.search(/\S|$/);
      
      if (lineIndent === 0 && line.trim() !== '') {
        // End of function or class
        inFunction = false;
        inClass = false;
        indentLevel = 0;
        
        chunks.push({
          content: currentImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName
          }
        });
        
        currentChunk = line + '\n';
        currentChunkName = '';
      } else {
        currentChunk += line + '\n';
      }
    } 
    else {
      currentChunk += line + '\n';
    }
    
    // Check if current chunk exceeds token limit
    if (estimateTokens(currentChunk) > maxTokens && !inFunction && !inClass) {
      chunks.push({
        content: currentImports + currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: currentChunkName || 'Unnamed section'
        }
      });
      currentChunk = '';
    }
  }
  
  // Add the last chunk if there's any content left
  if (currentChunk.trim()) {
    chunks.push({
      content: currentImports + currentChunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'code',
        name: currentChunkName || 'Unnamed section'
      }
    });
  }
  
  return chunks;
}

/**
 * Chunk Java files
 */
function chunkJava(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let currentChunk = '';
  let currentChunkName = '';
  let blockDepth = 0;
  let inMethod = false;
  let inClass = false;
  let packageAndImports = '';
  
  // First collect package and imports
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('package ') || line.trim().startsWith('import ')) {
      packageAndImports += line + '\n';
      i++;
    } else if (line.trim() === '') {
      packageAndImports += line + '\n';
      i++;
    } else {
      break;
    }
  }
  
  // Then process the rest of the file
  for (; i < lines.length; i++) {
    const line = lines[i];
    
    // Method detection
    if (blockDepth === 1 && 
        (line.includes('public ') || line.includes('private ') || line.includes('protected ') || line.includes('void ')) && 
        line.includes('(') && !line.includes(';')) {
      
      if (currentChunk.trim() && inMethod) {
        chunks.push({
          content: packageAndImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed method'
          }
        });
      }
      
      const methodMatch = line.match(/\s+(\w+)\s*\(/);
      currentChunkName = methodMatch ? methodMatch[1] : 'Unnamed method';
      currentChunk = line + '\n';
      inMethod = true;
    } 
    // Class detection
    else if (blockDepth === 0 && line.match(/\s*((public|private|protected)\s+)?(class|interface|enum)\s+(\w+)/)) {
      if (currentChunk.trim()) {
        chunks.push({
          content: packageAndImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      const classMatch = line.match(/\s*(?:(?:public|private|protected)\s+)?(?:class|interface|enum)\s+(\w+)/);
      currentChunkName = classMatch ? classMatch[1] : 'Unnamed class';
      currentChunk = line + '\n';
      inClass = true;
    } 
    else {
      currentChunk += line + '\n';
    }
    
    // Track block depth (curly braces)
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    blockDepth += openBraces - closeBraces;
    
    // Check if current chunk exceeds token limit
    if (inMethod && estimateTokens(currentChunk) > maxTokens && blockDepth === 1) {
      chunks.push({
        content: packageAndImports + currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: currentChunkName || 'Unnamed method'
        }
      });
      currentChunk = '';
      inMethod = false;
    }
    
    // End of method detection
    if (inMethod && blockDepth === 1 && line.trim() === '}') {
      chunks.push({
        content: packageAndImports + currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: currentChunkName || 'Unnamed method'
        }
      });
      currentChunk = '';
      inMethod = false;
    }
    
    // End of class detection
    if (inClass && blockDepth === 0 && line.trim() === '}') {
      // If we weren't in a method, save the whole class
      if (!inMethod && currentChunk.trim()) {
        chunks.push({
          content: packageAndImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed class'
          }
        });
      }
      currentChunk = '';
      inClass = false;
      currentChunkName = '';
    }
  }
  
  // Add the last chunk if there's any content left
  if (currentChunk.trim()) {
    chunks.push({
      content: packageAndImports + currentChunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'code',
        name: currentChunkName || 'Unnamed section'
      }
    });
  }
  
  return chunks;
}

/**
 * Chunk Go files
 */
function chunkGo(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let currentChunk = '';
  let currentChunkName = '';
  let blockDepth = 0;
  let packageAndImports = '';
  
  // First collect package and imports
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('package ') || line.trim().startsWith('import ')) {
      packageAndImports += line + '\n';
      i++;
    } else if (line.trim() === '' || line.trim().startsWith('//')) {
      packageAndImports += line + '\n';
      i++;
    } else {
      break;
    }
  }
  
  // Then process the rest of the file
  for (; i < lines.length; i++) {
    const line = lines[i];
    
    // Function detection
    if (blockDepth === 0 && line.trim().startsWith('func ')) {
      if (currentChunk.trim()) {
        chunks.push({
          content: packageAndImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      // Match function name: func (receiver) Name(...) or func Name(...) 
      const funcMatch = line.match(/func\s+(?:\([^)]+\)\s+)?(\w+)/);
      currentChunkName = funcMatch ? funcMatch[1] : 'Unnamed function';
      currentChunk = line + '\n';
    } 
    // Struct/interface/type detection
    else if (blockDepth === 0 && line.trim().startsWith('type ') && line.includes('struct')) {
      if (currentChunk.trim()) {
        chunks.push({
          content: packageAndImports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      const structMatch = line.match(/type\s+(\w+)/);
      currentChunkName = structMatch ? structMatch[1] : 'Unnamed struct';
      currentChunk = line + '\n';
    } 
    else {
      currentChunk += line + '\n';
    }
    
    // Track block depth (curly braces)
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    blockDepth += openBraces - closeBraces;
    
    // End of function/struct detection and token limit check
    if (blockDepth === 0 && currentChunk.trim() && (line.trim() === '}' || estimateTokens(currentChunk) > maxTokens)) {
      chunks.push({
        content: packageAndImports + currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: currentChunkName || 'Unnamed section'
        }
      });
      currentChunk = '';
      currentChunkName = '';
    }
  }
  
  // Add the last chunk if there's any content left
  if (currentChunk.trim()) {
    chunks.push({
      content: packageAndImports + currentChunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'code',
        name: currentChunkName || 'Unnamed section'
      }
    });
  }
  
  return chunks;
}

/**
 * Chunk C/C++ files
 */
function chunkCCpp(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let currentChunk = '';
  let currentChunkName = '';
  let blockDepth = 0;
  let includes = '';
  
  // First collect includes and defines
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('#include') || line.trim().startsWith('#define') || line.trim().startsWith('#pragma')) {
      includes += line + '\n';
      i++;
    } else if (line.trim() === '' || line.trim().startsWith('//')) {
      includes += line + '\n';
      i++;
    } else {
      break;
    }
  }
  
  // Then process the rest of the file
  for (; i < lines.length; i++) {
    const line = lines[i];
    
    // Function detection - looks for "return_type name(" pattern not followed by ";"
    if (blockDepth === 0 && 
        line.match(/^\s*\w+(?:[\s*]+\w+)*\s+\w+\s*\(/) && 
        !line.includes(';')) {
      
      if (currentChunk.trim()) {
        chunks.push({
          content: includes + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      // Try to extract function name
      const funcMatch = line.match(/\s(\w+)\s*\(/);
      currentChunkName = funcMatch ? funcMatch[1] : 'Unnamed function';
      currentChunk = line + '\n';
    } 
    // Class/struct/enum detection
    else if (blockDepth === 0 && 
             (line.match(/^\s*(?:class|struct|enum|union)\s+\w+/) || 
              line.match(/^\s*typedef\s+(?:struct|enum|union)\s+\w+/))) {
      
      if (currentChunk.trim()) {
        chunks.push({
          content: includes + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      const typeMatch = line.match(/(?:class|struct|enum|union|typedef)\s+(?:struct|enum|union)?\s*(\w+)/);
      currentChunkName = typeMatch ? typeMatch[1] : 'Unnamed type';
      currentChunk = line + '\n';
    } 
    else {
      currentChunk += line + '\n';
    }
    
    // Track block depth (curly braces)
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    blockDepth += openBraces - closeBraces;
    
    // End of function/struct detection and token limit check
    if (blockDepth === 0 && currentChunk.trim() && 
        (line.includes('}') || estimateTokens(currentChunk) > maxTokens)) {
      chunks.push({
        content: includes + currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: currentChunkName || 'Unnamed section'
        }
      });
      currentChunk = '';
      currentChunkName = '';
    }
  }
  
  // Add the last chunk if there's any content left
  if (currentChunk.trim()) {
    chunks.push({
      content: includes + currentChunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'code',
        name: currentChunkName || 'Unnamed section'
      }
    });
  }
  
  return chunks;
}

/**
 * Chunk Rust files
 */
function chunkRust(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let currentChunk = '';
  let currentChunkName = '';
  let blockDepth = 0;
  let imports = '';
  
  // First collect use statements (imports)
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('use ') || line.trim().startsWith('extern crate')) {
      imports += line + '\n';
      i++;
    } else if (line.trim() === '' || line.trim().startsWith('//')) {
      imports += line + '\n';
      i++;
    } else {
      break;
    }
  }
  
  // Then process the rest of the file
  for (; i < lines.length; i++) {
    const line = lines[i];
    
    // Function detection
    if (blockDepth === 0 && line.match(/\s*(?:pub\s+)?fn\s+\w+/)) {
      if (currentChunk.trim()) {
        chunks.push({
          content: imports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      const funcMatch = line.match(/fn\s+(\w+)/);
      currentChunkName = funcMatch ? funcMatch[1] : 'Unnamed function';
      currentChunk = line + '\n';
    } 
    // Struct/enum/trait/impl detection
    else if (blockDepth === 0 && 
             line.match(/\s*(?:pub\s+)?(?:struct|enum|trait|impl|type|mod)\s+\w+/)) {
      
      if (currentChunk.trim()) {
        chunks.push({
          content: imports + currentChunk,
          metadata: {
            ...fileMetadata,
            chunkType: 'code',
            name: currentChunkName || 'Unnamed section'
          }
        });
      }
      
      const typeMatch = line.match(/(?:struct|enum|trait|impl|type|mod)\s+(\w+)/);
      currentChunkName = typeMatch ? typeMatch[1] : 'Unnamed type';
      currentChunk = line + '\n';
    } 
    else {
      currentChunk += line + '\n';
    }
    
    // Track block depth (curly braces)
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    blockDepth += openBraces - closeBraces;
    
    // End of function/struct detection and token limit check
    if (blockDepth === 0 && currentChunk.trim() && 
        (line.trim() === '}' || estimateTokens(currentChunk) > maxTokens)) {
      chunks.push({
        content: imports + currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: currentChunkName || 'Unnamed section'
        }
      });
      currentChunk = '';
      currentChunkName = '';
    }
  }
  
  // Add the last chunk if there's any content left
  if (currentChunk.trim()) {
    chunks.push({
      content: imports + currentChunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'code',
        name: currentChunkName || 'Unnamed section'
      }
    });
  }
  
  return chunks;
}

/**
 * Simple chunking for files that don't have language-specific parsing
 */
function chunkBySize(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let currentChunk = '';
  let chunkNumber = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentChunk += line + '\n';
    
    // Check if current chunk exceeds token limit
    if (estimateTokens(currentChunk) > maxTokens) {
      chunks.push({
        content: currentChunk,
        metadata: {
          ...fileMetadata,
          chunkType: 'code',
          name: `Chunk ${chunkNumber}`
        }
      });
      currentChunk = '';
      chunkNumber++;
    }
  }
  
  // Add the last chunk if there's any content left
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'code',
        name: `Chunk ${chunkNumber}`
      }
    });
  }
  
  return chunks;
}