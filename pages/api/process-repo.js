import { parseGitHubUrl, getRepositoryInfo, getAllFiles, getFileContent } from '../../lib/github';
import { chunkCodeFile } from '../../lib/chunker';
import { batchProcessEmbeddings } from '../../lib/embeddings';
import { deleteRepositoryData, addChunksToVectorStore } from '../../lib/chromadb';
import { getRepositoryId } from '../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }
  
  try {
    // Parse GitHub URL to get owner and repo
    const { owner, repo } = parseGitHubUrl(url);
    const repoId = getRepositoryId(owner, repo);
    
    // Get repository information
    const repoInfo = await getRepositoryInfo(owner, repo);
    
    // Delete any existing data for this repository
    await deleteRepositoryData(repoId);
    
    // Get all files in the repository
    const files = await getAllFiles(owner, repo);
    
    if (files.length === 0) {
      return res.status(400).json({ 
        error: 'No supported code files found in the repository' 
      });
    }
    
    // Process files in batches to avoid overwhelming memory
    const MAX_FILES_PER_BATCH = 20;
    let allChunks = [];
    
    // Process files in batches
    for (let i = 0; i < files.length; i += MAX_FILES_PER_BATCH) {
      const fileBatch = files.slice(i, i + MAX_FILES_PER_BATCH);
      const processedFiles = [];
      
      // Process each file in the current batch
      for (const file of fileBatch) {
        try {
          // Get file content
          const content = await getFileContent(file.downloadUrl);
          
          if (content) {
            // Chunk the file
            const chunks = chunkCodeFile(content, file.path);
            processedFiles.push(...chunks);
          }
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
          // Continue with other files
        }
      }
      
      // Generate embeddings for the chunks
      if (processedFiles.length > 0) {
        const embeddedChunks = await batchProcessEmbeddings(processedFiles);
        allChunks.push(...embeddedChunks);
      }
    }
    
    // Add all chunks to the vector store
    await addChunksToVectorStore(repoId, allChunks);
    
    // Return success response
    return res.status(200).json({
      success: true,
      repository: repoInfo,
      processedFiles: files.length,
      processedChunks: allChunks.length,
    });
  } catch (error) {
    console.error('Error processing repository:', error);
    
    return res.status(500).json({
      error: 'Failed to process repository',
      message: error.message,
    });
  }
}