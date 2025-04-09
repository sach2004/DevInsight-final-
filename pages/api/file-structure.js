import { Octokit } from 'octokit';


const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**

 * @param {object} octokit 
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} path 
 * @returns {Promise<object>} 
 */
async function fetchDirectoryStructure(octokit, owner, repo, path = '') {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    
   
    if (!Array.isArray(data)) {
      return {
        name: data.name,
        path: data.path,
        type: 'file',
        size: data.size,
      };
    }
    
   
    const children = [];
    
   
    for (const item of data) {
     
      if (item.type === 'file' && (item.size > 500000 || isBinaryFile(item.name))) {
        children.push({
          name: item.name,
          path: item.path,
          type: 'file',
          size: item.size,
        });
        continue;
      }
      
      if (item.type === 'dir' && shouldSkipDirectory(item.name)) {
        children.push({
          name: item.name,
          path: item.path,
          type: 'dir',
        });
        continue;
      }
      
      
      if (item.type === 'dir') {
        const dirStructure = await fetchDirectoryStructure(octokit, owner, repo, item.path);
        children.push(dirStructure);
      } else {
        children.push({
          name: item.name,
          path: item.path,
          type: 'file',
          size: item.size,
        });
      }
    }
    
    
    children.sort((a, b) => {
      if (a.type === 'dir' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });
    
    return {
      name: path.split('/').pop() || 'root',
      path: path,
      type: 'dir',
      children,
    };
  } catch (error) {
    console.error(`Error fetching directory structure for ${path}:`, error);
    return {
      name: path.split('/').pop() || 'root',
      path: path,
      type: 'dir',
      error: error.message,
      children: [],
    };
  }
}

/**

 * @param {string} filename 
 * @returns {boolean} 
 */
function isBinaryFile(filename) {
  const binaryExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.ttf', '.otf', '.woff', '.woff2',
    '.mp3', '.mp4', '.avi', '.mov', '.flv',
  ];
  
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return binaryExtensions.includes(ext);
}

/**

 * @param {string} dirname 
 * @returns {boolean} 
 */
function shouldSkipDirectory(dirname) {
  const skipDirectories = [
    'node_modules', '.git', 'dist', 'build', '.next',
    'venv', '__pycache__', 'vendor', 'target',
    '.vscode', '.idea', '.gradle', 'bin', 'obj',
  ];
  
  return skipDirectories.includes(dirname.toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { owner, repo } = req.query;
  
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo parameters are required' });
  }
  
  try {
  
    const fileStructure = await fetchDirectoryStructure(octokit, owner, repo);
    
    return res.status(200).json({
      fileStructure,
    });
  } catch (error) {
    console.error('Error fetching file structure:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch file structure',
      message: error.message,
    });
  }
}