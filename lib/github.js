import { Octokit } from 'octokit';

// Programming language extensions to filter for
const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',  // JavaScript/TypeScript
  '.py',                         // Python
  '.java',                       // Java
  '.go',                         // Go
  '.cpp', '.hpp', '.h', '.c',    // C/C++
  '.rs',                         // Rust
  '.html', '.css',               // Web
];

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Extracts owner and repo name from a GitHub URL
 * @param {string} url - GitHub repository URL
 * @returns {Object} - { owner, repo }
 */
export function parseGitHubUrl(url) {
  try {
    // Handle different GitHub URL formats
    const urlObj = new URL(url);
    
    if (urlObj.hostname !== 'github.com') {
      throw new Error('Not a valid GitHub URL');
    }
    
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathSegments.length < 2) {
      throw new Error('URL does not contain a valid repository path');
    }
    
    return {
      owner: pathSegments[0],
      repo: pathSegments[1],
    };
  } catch (error) {
    throw new Error(`Invalid GitHub URL: ${error.message}`);
  }
}

/**
 * Fetches repository information
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Object} - Repository information
 */
export async function getRepositoryInfo(owner, repo) {
  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    });
    
    return {
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      language: data.language,
      owner: {
        name: data.owner.login,
        avatar: data.owner.avatar_url,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch repository information: ${error.message}`);
  }
}

/**
 * Recursively fetches all files in a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Directory path (empty for root)
 * @returns {Array} - Array of file objects
 */
export async function getAllFiles(owner, repo, path = '') {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    
    let files = [];
    
    // If single file is returned
    if (!Array.isArray(data)) {
      if (isSupportedFile(data.name)) {
        return [{ path: data.path, type: 'file', downloadUrl: data.download_url }];
      }
      return [];
    }
    
    // Process directory contents
    for (const item of data) {
      if (item.type === 'file' && isSupportedFile(item.name)) {
        files.push({
          path: item.path,
          type: 'file',
          downloadUrl: item.download_url,
        });
      } else if (item.type === 'dir') {
        // Skip node_modules, .git, and other common directories to avoid API rate limits
        if (shouldSkipDirectory(item.name)) {
          continue;
        }
        
        // Recursively fetch files in subdirectory
        const subDirFiles = await getAllFiles(owner, repo, item.path);
        files = [...files, ...subDirFiles];
      }
    }
    
    return files;
  } catch (error) {
    console.error(`Error fetching files at path ${path}:`, error);
    return [];
  }
}

/**
 * Check if a file has a supported extension
 * @param {string} filename - File name
 * @returns {boolean} - Whether the file should be processed
 */
function isSupportedFile(filename) {
  const extension = '.' + filename.split('.').pop().toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(extension);
}

/**
 * Determines if a directory should be skipped
 * @param {string} dirName - Directory name
 * @returns {boolean} - Whether to skip the directory
 */
function shouldSkipDirectory(dirName) {
  const skipDirs = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'venv',
    '__pycache__',
    'vendor',
  ];
  
  return skipDirs.includes(dirName.toLowerCase());
}

/**
 * Fetches the content of a file
 * @param {string} url - File download URL
 * @returns {string} - File content
 */
export async function getFileContent(url) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching file content:`, error);
    return null;
  }
}