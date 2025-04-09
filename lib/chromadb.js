import { ChromaClient } from 'chromadb';

// Simple in-memory storage as fallback
const inMemoryStore = {
  collections: {},
  createCollection: (name, metadata) => {
    if (!inMemoryStore.collections[name]) {
      inMemoryStore.collections[name] = {
        name,
        metadata,
        data: [],
        add: (items) => {
          const { ids, embeddings, documents, metadatas } = items;
          for (let i = 0; i < ids.length; i++) {
            inMemoryStore.collections[name].data.push({
              id: ids[i],
              embedding: embeddings[i],
              document: documents[i],
              metadata: metadatas[i]
            });
          }
          return Promise.resolve();
        },
        query: (params) => {
          const { queryEmbeddings, nResults } = params;
          const results = [];
          
          // Simple cosine similarity implementation
          for (const item of inMemoryStore.collections[name].data) {
            const similarity = cosineSimilarity(queryEmbeddings[0], item.embedding);
            results.push({
              id: item.id,
              embedding: item.embedding,
              document: item.document,
              metadata: item.metadata,
              distance: 1 - similarity // Convert similarity to distance
            });
          }
          
          // Sort by similarity (lowest distance first)
          results.sort((a, b) => a.distance - b.distance);
          
          // Take top n results
          const topResults = results.slice(0, nResults);
          
          return Promise.resolve({
            ids: [topResults.map(r => r.id)],
            embeddings: [topResults.map(r => r.embedding)],
            documents: [topResults.map(r => r.document)],
            metadatas: [topResults.map(r => r.metadata)],
            distances: [topResults.map(r => r.distance)]
          });
        }
      };
    }
    return Promise.resolve(inMemoryStore.collections[name]);
  },
  getCollection: (name) => {
    if (inMemoryStore.collections[name]) {
      return Promise.resolve(inMemoryStore.collections[name]);
    }
    throw new Error(`Collection ${name} not found`);
  },
  deleteCollection: (name) => {
    if (inMemoryStore.collections[name]) {
      delete inMemoryStore.collections[name];
    }
    return Promise.resolve();
  }
};

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

// Initialize ChromaDB client or use in-memory fallback
let client;
let usingFallback = false;

try {
  client = new ChromaClient({
    path: process.env.CHROMA_HOST ? `http://${process.env.CHROMA_HOST}:${process.env.CHROMA_PORT || 8000}` : 'http://localhost:8000'
  });
  
  // Test connection
  client.heartbeat().catch(() => {
    console.warn('ChromaDB server not available, using in-memory fallback');
    client = inMemoryStore;
    usingFallback = true;
  });
} catch (error) {
  console.warn('Error initializing ChromaDB client, using in-memory fallback:', error);
  client = inMemoryStore;
  usingFallback = true;
}

let collections = {};

/**
 * Initialize or get a collection for a repository
 * @param {string} repoId - Repository identifier (owner/repo)
 * @returns {Promise<Collection>} - ChromaDB collection
 */
export async function getCollection(repoId) {
  try {
    // Use a cached collection if available
    if (collections[repoId]) {
      return collections[repoId];
    }
    
    // Create a safe collection name from the repoId
    const collectionName = `repo_${repoId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    
    // Check if collection exists
    try {
      const collection = await client.getCollection({
        name: collectionName,
      });
      
      collections[repoId] = collection;
      return collection;
    } catch (error) {
      // Collection doesn't exist, create a new one
      const collection = await client.createCollection({
        name: collectionName,
        metadata: { 
          repository: repoId,
          created: new Date().toISOString() 
        }
      });
      
      collections[repoId] = collection;
      return collection;
    }
  } catch (error) {
    console.error('Error initializing collection:', error);
    throw new Error(`Failed to initialize collection: ${error.message}`);
  }
}

/**
 * Adds code chunks to the vector store
 * @param {string} repoId - Repository identifier
 * @param {Array<Object>} chunks - Array of embedded chunks with content and metadata
 * @returns {Promise<void>}
 */
export async function addChunksToVectorStore(repoId, chunks) {
  const collection = await getCollection(repoId);
  
  console.log(`Adding ${chunks.length} chunks to vector store...`);
  
  // Process in batches to avoid memory issues
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    const ids = batch.map((_, index) => `chunk_${i + index}`);
    const embeddings = batch.map(chunk => chunk.embedding);
    const documents = batch.map(chunk => chunk.content);
    const metadataList = batch.map(chunk => chunk.metadata);
    
    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas: metadataList,
    });
    
    console.log(`Added batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}`);
  }
  
  console.log('Finished adding chunks to vector store');
  
  if (usingFallback) {
    console.log('Using in-memory vector store. Repository data will be lost when the server restarts.');
  }
}

/**
 * Performs similarity search in the vector store
 * @param {string} repoId - Repository identifier
 * @param {Array<number>} queryEmbedding - Embedding vector of the query
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array<Object>>} - Top k similar chunks
 */
export async function querySimilarChunks(repoId, queryEmbedding, topK = 5) {
  const collection = await getCollection(repoId);
  
  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ["documents", "metadatas", "distances"]
  });
  
  // Format the results into a more usable structure
  const formattedResults = [];
  
  if (results.documents && results.documents[0]) {
    for (let i = 0; i < results.documents[0].length; i++) {
      formattedResults.push({
        content: results.documents[0][i],
        metadata: results.metadatas[0][i],
        distance: results.distances[0][i]
      });
    }
  }
  
  return formattedResults;
}

/**
 * Deletes all content for a repository
 * @param {string} repoId - Repository identifier
 * @returns {Promise<void>}
 */
export async function deleteRepositoryData(repoId) {
  try {
    // Create a safe collection name from the repoId
    const collectionName = `repo_${repoId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    
    // Check if collection exists
    try {
      await client.deleteCollection({ name: collectionName });
      
      // Remove from cache
      if (collections[repoId]) {
        delete collections[repoId];
      }
      
      console.log(`Deleted collection for repository: ${repoId}`);
    } catch (error) {
      // Collection may not exist, which is fine
      console.log(`No existing collection found for repository: ${repoId}`);
    }
  } catch (error) {
    console.error('Error deleting repository data:', error);
    throw new Error(`Failed to delete repository data: ${error.message}`);
  }
}