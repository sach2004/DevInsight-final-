import { HfInference } from '@huggingface/inference';

// Initialize the Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Model to use for embeddings
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generates embeddings for a given text using Hugging Face
 * @param {string} text - The text to embed
 * @returns {Promise<Array<number>>} - A vector of floating point numbers
 */
export async function generateEmbedding(text) {
  try {
    // Truncate text if it's too long (most models have limits)
    const truncatedText = text.slice(0, 8192);
    
    // Generate embedding
    const result = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: truncatedText,
    });
    
    // Return the embedding vector
    return result;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Processes a batch of text chunks and generates embeddings for each
 * @param {Array<Object>} chunks - Array of { content, metadata } objects
 * @returns {Promise<Array<Object>>} - Chunks with added embeddings
 */
export async function batchProcessEmbeddings(chunks) {
  console.log(`Processing embeddings for ${chunks.length} chunks...`);
  
  const embeddedChunks = [];
  
  // Process chunks in sequential batches to avoid rate limiting
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      const combinedContent = `File: ${chunk.metadata.path}\nSection: ${chunk.metadata.name || 'Unnamed section'}\n\n${chunk.content}`;
const embedding = await generateEmbedding(combinedContent);
      
      embeddedChunks.push({
        ...chunk,
        embedding
      });
      
      // Log progress
      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${chunks.length} embeddings`);
      }
      
      // Add a small delay between API calls to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
      // Continue with other chunks even if one fails
    }
  }
  
  return embeddedChunks;
}