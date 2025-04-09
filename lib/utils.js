/**
 * Utility functions for the codebase assistant
 */

/**
 * Validates if a string is a proper GitHub repository URL
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether the URL is valid
 */
export function isValidGitHubUrl(url) {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname !== 'github.com') {
      return false;
    }
    
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    
    // A valid GitHub repo URL needs at least owner and repo name
    if (pathSegments.length < 2) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generates a unique repository ID from owner and repo
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {string} - Repository ID
 */
export function getRepositoryId(owner, repo) {
  return `${owner}/${repo}`;
}

/**
 * Formats file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size (e.g., "1.2 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Determines the appropriate language for syntax highlighting
 * @param {string} filePath - Path to the file
 * @returns {string} - Language identifier for syntax highlighting
 */
export function getLanguageForSyntaxHighlighting(filePath) {
  const extension = filePath.split('.').pop().toLowerCase();
  
  // Map file extensions to syntax highlighting language
  const languageMap = {
    // JavaScript
    'js': 'javascript',
    'jsx': 'jsx',
    
    // TypeScript
    'ts': 'typescript',
    'tsx': 'tsx',
    
    // Python
    'py': 'python',
    
    // Java
    'java': 'java',
    
    // Go
    'go': 'go',
    
    // C/C++
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    
    // Rust
    'rs': 'rust',
    
    // Web
    'html': 'html',
    'css': 'css',
    'json': 'json',
    
    // Others
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
  };
  
  return languageMap[extension] || 'text';
}

/**
 * Truncates a string if it's too long
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string
 */
export function truncateString(str, maxLength = 100) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Formats a timestamp to a readable date string
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} - Formatted date string
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}