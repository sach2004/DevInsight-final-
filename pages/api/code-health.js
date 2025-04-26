import { getAllFiles, getFileContent } from '../../lib/github';
import { querySimilarChunks, getCollection } from '../../lib/chromadb';
import { generateEmbedding } from '../../lib/embeddings';

// Code complexity patterns to look for
const COMPLEXITY_PATTERNS = [
  { pattern: /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?(if|for|while|switch|catch)[\s\S]*?\1[\s\S]*?\1[\s\S]*?\1/g, issue: 'deep_nesting', severity: 'medium' },
  { pattern: /function\s+\w+\s*\([^)]*\)\s*{[\s\S]{3000,}?}/g, issue: 'long_function', severity: 'medium' },
  { pattern: /(if|for|while|switch|catch)[\s\S]*?\1[\s\S]*?\1[\s\S]*?\1[\s\S]*?\1/g, issue: 'excessive_nesting', severity: 'high' },
];

// Error handling patterns to look for
const ERROR_PATTERNS = [
  { pattern: /try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{\s*console\.error/g, issue: 'console_only_error', severity: 'medium' },
  { pattern: /fetch\([^)]*\)(?!\s*\.then\([^)]*\)\s*\.catch)/g, issue: 'missing_fetch_error', severity: 'high' },
];

// Documentation patterns to look for
const DOCUMENTATION_PATTERNS = [
  { pattern: /function\s+(\w+)\s*\([^)]*\)[^{]*{(?!\s*\/\*\*)/g, issue: 'missing_function_docs', severity: 'low' },
  { pattern: /export\s+(const|function|class)\s+(\w+)(?!\s*\/\*\*)/g, issue: 'missing_export_docs', severity: 'low' },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { repoId } = req.body;
  
  if (!repoId) {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  
  try {
    const [owner, repo] = repoId.split('/');
    
    // Check if we have code data for this repository
    let collection;
    try {
      collection = await getCollection(repoId);
      if (!collection.data || collection.data.length === 0) {
        return res.status(200).json({
          summary: {
            score: 0,
            issueCount: 0,
            fileCount: 0
          },
          issues: [],
          categories: [],
          fileScores: [],
          message: "No repository data available for analysis. Please process the repository first."
        });
      }
    } catch (error) {
      console.error('Error accessing vector store:', error);
      return res.status(500).json({
        error: 'Failed to access repository data',
        message: error.message,
      });
    }
    
    // Analyze code quality by retrieving code chunks
    const codeQuery = await generateEmbedding("function class complexity error handling documentation");
    
    // Get chunks related to code
    const codeChunks = await querySimilarChunks(repoId, codeQuery, 50);
    
    if (!codeChunks || codeChunks.length === 0) {
      return res.status(200).json({
        summary: {
          score: 0,
          issueCount: 0,
          fileCount: 0
        },
        issues: [],
        categories: [],
        fileScores: [],
        message: "Unable to analyze code quality in this repository."
      });
    }
    
    // Group chunks by file
    const fileChunks = {};
    codeChunks.forEach(chunk => {
      if (!chunk.metadata || !chunk.metadata.path) return;
      
      const path = chunk.metadata.path;
      if (!fileChunks[path]) {
        fileChunks[path] = [];
      }
      
      fileChunks[path].push(chunk);
    });
    
    // Store issues found
    const issues = [];
    const fileCounts = {};
    
    // Process each file's chunks
    for (const [path, chunks] of Object.entries(fileChunks)) {
      // Combine chunks for full file analysis
      const fileContent = chunks.map(chunk => chunk.content).join('\n\n');
      fileCounts[path] = { issues: 0 };
      
      // Check for complexity issues
      analyzePatterns(COMPLEXITY_PATTERNS, fileContent, path, 'Code Complexity', issues, fileCounts);
      
      // Check for error handling issues
      analyzePatterns(ERROR_PATTERNS, fileContent, path, 'Error Handling', issues, fileCounts);
      
      // Check for documentation issues
      analyzePatterns(DOCUMENTATION_PATTERNS, fileContent, path, 'Documentation', issues, fileCounts);
      
      // Check for extremely long files (potential code smell)
      if (fileContent.length > 5000) {
        issues.push({
          id: `size-${path.replace(/[^a-z0-9]/gi, '-')}`,
          title: `Large file size in ${path}`,
          description: `This file is very large (${Math.round(fileContent.length / 1000)}KB), which may indicate it has too many responsibilities.`,
          severity: 'medium',
          category: 'Code Organization',
          location: path,
          suggestion: 'Consider breaking this file into smaller, more focused modules with single responsibilities.'
        });
        
        fileCounts[path].issues++;
      }
      
      // Look for potential duplicate code patterns
      // This is a simplified approach - a real implementation would be more sophisticated
      const functionBodies = [];
      const functionBodyRegex = /function\s+(\w+)\s*\([^)]*\)\s*{([\s\S]*?)}/g;
      let match;
      
      while ((match = functionBodyRegex.exec(fileContent)) !== null) {
        const name = match[1];
        const body = match[2].trim();
        
        if (body.length > 100) {
          // Store function bodies for comparison
          functionBodies.push({ name, body, length: body.length });
        }
      }
      
      // Check for similar functions (very simple implementation)
      for (let i = 0; i < functionBodies.length; i++) {
        for (let j = i + 1; j < functionBodies.length; j++) {
          const func1 = functionBodies[i];
          const func2 = functionBodies[j];
          
          // Simple similarity check - in a real implementation, you'd use a more sophisticated approach
          if (Math.abs(func1.length - func2.length) < 100) {
            issues.push({
              id: `dup-${path.replace(/[^a-z0-9]/gi, '-')}-${i}-${j}`,
              title: `Potential code duplication in ${path}`,
              description: `The functions ${func1.name} and ${func2.name} have similar sizes and may contain duplicated logic.`,
              severity: 'medium',
              category: 'Duplication',
              location: path,
              suggestion: 'Review these functions for shared logic that could be extracted into a common utility function.'
            });
            
            fileCounts[path].issues++;
            break; // Only report once per file for this demo
          }
        }
      }
    }
    
    // Calculate file scores
    const fileScores = Object.entries(fileCounts).map(([file, data]) => {
      // Base score of 100, reduced by issues
      let score = 100;
      
      // Get file-specific issues
      const fileIssues = issues.filter(issue => issue.location === file);
      
      // Reduce score based on severity
      fileIssues.forEach(issue => {
        if (issue.severity === 'high') score -= 10;
        else if (issue.severity === 'medium') score -= 5;
        else score -= 2;
      });
      
      // Ensure score doesn't go below 0
      score = Math.max(0, score);
      
      return {
        file,
        score,
        issueCount: fileIssues.length
      };
    });
    
    // Calculate category scores
    const categories = [
      { name: 'Code Complexity', issues: issues.filter(i => i.category === 'Code Complexity') },
      { name: 'Error Handling', issues: issues.filter(i => i.category === 'Error Handling') },
      { name: 'Documentation', issues: issues.filter(i => i.category === 'Documentation') },
      { name: 'Duplication', issues: issues.filter(i => i.category === 'Duplication') },
      { name: 'Code Organization', issues: issues.filter(i => i.category === 'Code Organization') }
    ];
    
    const categoryScores = categories.map(category => {
      // Base score of 100, reduced by issues
      let score = 100;
      
      // Reduce score based on severity
      category.issues.forEach(issue => {
        if (issue.severity === 'high') score -= 8;
        else if (issue.severity === 'medium') score -= 4;
        else score -= 2;
      });
      
      // Ensure score doesn't go below 0
      score = Math.max(0, Math.min(100, score));
      
      return {
        name: category.name,
        score,
        issueCount: category.issues.length
      };
    });
    
    // Calculate overall score
    const overallScore = Math.round(
      categoryScores.reduce((sum, category) => sum + category.score, 0) / categoryScores.length
    );
    
    // Estimate test coverage based on presence of test files
    // This is a placeholder - real implementation would be more sophisticated
    let testCoverage = 65; // Default medium coverage
    const hasTests = Object.keys(fileChunks).some(path => path.includes('test') || path.includes('spec'));
    if (!hasTests) {
      testCoverage = 10; // Very low if no test files found
    }
    
    // Generate complexity metrics
    const complexity = {
      high: fileScores.filter(f => f.score < 70).length,
      medium: fileScores.filter(f => f.score >= 70 && f.score < 85).length,
      low: fileScores.filter(f => f.score >= 85).length
    };
    
    // Build response object
    const response = {
      summary: {
        score: overallScore,
        issueCount: issues.length,
        fileCount: Object.keys(fileChunks).length,
        complexity,
        testCoverage
      },
      categories: categoryScores,
      issues,
      fileScores
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error analyzing code health:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze code health',
      message: error.message,
    });
  }
}

/**
 * Analyze code patterns and add issues found
 * @param {Array} patterns - Patterns to check for
 * @param {string} content - File content
 * @param {string} path - File path
 * @param {string} category - Issue category
 * @param {Array} issues - Issues array to add to
 * @param {Object} fileCounts - File issue counts to update
 */
function analyzePatterns(patterns, content, path, category, issues, fileCounts) {
  patterns.forEach(({ pattern, issue, severity }) => {
    const matches = content.match(pattern);
    
    if (matches && matches.length > 0) {
      // Get issue details based on type
      let title, description, suggestion;
      
      switch (issue) {
        case 'deep_nesting':
          title = `Deep nesting in ${path}`;
          description = `Multiple levels of nesting found in code, making it difficult to follow the logic flow.`;
          suggestion = `Consider extracting nested logic into separate helper functions to reduce nesting depth.`;
          break;
          
        case 'long_function':
          title = `Long function in ${path}`;
          description = `Function is excessively long, which makes it hard to understand and maintain.`;
          suggestion = `Break down this function into smaller, more focused functions with single responsibilities.`;
          break;
          
        case 'excessive_nesting':
          title = `Excessive control flow nesting in ${path}`;
          description = `Code contains deeply nested control flow structures (if/for/while), creating complexity.`;
          suggestion = `Use early returns, guard clauses, or extract methods to reduce nesting depth.`;
          break;
          
        case 'console_only_error':
          title = `Inadequate error handling in ${path}`;
          description = `Error is caught but only logged to console without proper handling or recovery.`;
          suggestion = `Implement proper error handling strategy with appropriate fallbacks or user feedback.`;
          break;
          
        case 'missing_fetch_error':
          title = `Missing error handling in fetch call in ${path}`;
          description = `Network request using fetch() doesn't have proper error handling.`;
          suggestion = `Add .catch() handler to handle network errors and provide appropriate fallback behavior.`;
          break;
          
        case 'missing_function_docs':
          title = `Missing function documentation in ${path}`;
          description = `Functions lack proper documentation comments explaining their purpose, parameters, and return values.`;
          suggestion = `Add JSDoc comments to document function purpose, parameters, and return values.`;
          break;
          
        case 'missing_export_docs':
          title = `Missing export documentation in ${path}`;
          description = `Exported functions, constants, or classes lack documentation comments.`;
          suggestion = `Add JSDoc comments to exported items to improve codebase understandability.`;
          break;
          
        default:
          title = `Code issue in ${path}`;
          description = `A potential code quality issue was detected.`;
          suggestion = `Review this section of code for potential improvements.`;
      }
      
      // Add issue
      issues.push({
        id: `${issue}-${path.replace(/[^a-z0-9]/gi, '-')}-${issues.length}`,
        title,
        description,
        severity,
        category,
        location: path,
        suggestion
      });
      
      // Update file issue count
      fileCounts[path].issues++;
    }
  });
}