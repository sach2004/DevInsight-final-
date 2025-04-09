import { generateEmbedding } from '../../lib/embeddings';
import { querySimilarChunks, getCollection } from '../../lib/chromadb';
import { queryGroq } from '../../lib/groq';
import { getRepositoryInfo } from '../../lib/github';

/**
 * API endpoint to process chat messages
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { question, repoId } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }
  
  if (!repoId) {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  
  try {
    // Extract owner and repo from repoId
    const [owner, repo] = repoId.split('/');
    
    // Check if the collection exists
    try {
      await getCollection(repoId);
    } catch (error) {
      return res.status(404).json({
        error: 'Repository not found or not processed',
        message: 'Please process the repository first',
      });
    }
    
    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);
    
    // Query for similar code chunks
    const similarChunks = await querySimilarChunks(repoId, questionEmbedding, 5);
    
    if (similarChunks.length === 0) {
      return res.status(200).json({
        answer: "I couldn't find relevant code in the repository to answer your question. Could you please rephrase or ask about another aspect of the codebase?",
      });
    }
    
    // Get repository information
    const repoInfo = await getRepositoryInfo(owner, repo);
    
    // Query the LLM with the context
    const answer = await queryGroq(question, similarChunks, repoInfo);
    
    return res.status(200).json({
      answer,
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    
    return res.status(500).json({
      error: 'Failed to process message',
      message: error.message,
    });
  }
}