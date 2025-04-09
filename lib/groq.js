import { Groq } from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Constants
const MODEL = 'llama3-8b-8192';  // Using LLaMA 3 model as specified
const MAX_TOKENS = 4096;

/**
 * Formats code chunks for context in the prompt
 * @param {Array<Object>} chunks - Code chunks with content and metadata
 * @returns {string} - Formatted context string
 */
function formatContextFromChunks(chunks) {
  let context = '';
  
  chunks.forEach((chunk, index) => {
    const { content, metadata } = chunk;
    const filePath = metadata.path;
    const chunkName = metadata.name || 'Unnamed section';
    
    context += `\n\n--- FILE: ${filePath} ---\n`;
    context += `--- SECTION: ${chunkName} ---\n`;
    context += `${content}\n`;
  });
  
  return context;
}

/**
 * Generates a system prompt for the LLM
 * @param {Object} repoInfo - Repository information
 * @returns {string} - System prompt
 */
function generateSystemPrompt(repoInfo) {
  return `You are a helpful and knowledgeable code assistant specialized in analyzing codebases. You're currently looking at a GitHub repository called '${repoInfo.name}' by ${repoInfo.owner.name}. The repository is written primarily in ${repoInfo.language || 'multiple languages'}.

Repository description: ${repoInfo.description || 'No description provided'}

Your goal is to help the user understand this codebase. You must follow these rules:
1. Only explain the code that is provided to you - don't make assumptions about other parts of the codebase.
2. Do NOT modify the codebase or suggest direct code edits.
3. Do NOT auto-apply or change anything - you're in read-only mode.
4. Only provide explanations, answer questions, and recommend what the user should do manually.
5. When referencing files or functions, be specific about their location and purpose.
6. If you don't know something, say so rather than guessing.

When explaining code:
- Focus on the high-level purpose first, then dive into details if needed
- Highlight important patterns, architectural choices, and design decisions
- Explain how different components interact
- Use clear and concise language

The user will ask you questions, and I'll provide relevant code from the repository to help you answer them.`;
}

/**
 * Queries the Groq LLM with the user's question and relevant code chunks
 * @param {string} question - User's question
 * @param {Array<Object>} relevantChunks - Code chunks relevant to the question
 * @param {Object} repoInfo - Repository information
 * @returns {Promise<string>} - LLM's response
 */
export async function queryGroq(question, relevantChunks, repoInfo) {
  try {
    // Format code chunks into context
    const context = formatContextFromChunks(relevantChunks);
    
    // Generate system prompt
    const systemPrompt = generateSystemPrompt(repoInfo);
    
    // Generate user prompt with question and context
    const userPrompt = `Here is my question about the codebase: "${question}"

Below are the most relevant parts of the codebase to answer this question:
${context}

Please help me understand this code by answering my question thoroughly.`;
    
    // Call Groq API
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,  // Lower temperature for more factual responses
      max_tokens: MAX_TOKENS,
      top_p: 0.95,
    });
    
    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error querying Groq:', error);
    throw new Error(`Failed to get a response from Groq: ${error.message}`);
  }
}