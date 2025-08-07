import { z } from "zod";
import { publicProcedure } from "../../create-context";

const suggestTitleSchema = z.object({
  ocrText: z.string().min(1, "OCR text is required"),
  documentType: z.string().optional(),
});

type DocumentSuggestion = {
  title: string;
  tags: string[];
  confidence: number;
  reasoning: string;
};

export const suggestTitleProcedure = publicProcedure
  .input(suggestTitleSchema)
  .mutation(async ({ input }: { input: { ocrText: string; documentType?: string } }) => {
    const { ocrText, documentType } = input;

    try {
      console.log('Analyzing OCR text for title suggestion:', {
        textLength: ocrText.length,
        documentType,
        preview: ocrText.substring(0, 100)
      });

      // Prepare the AI prompt for document analysis
      const prompt = `Analyze the following OCR text from a scanned document and suggest a concise, descriptive title and relevant tags.

OCR Text:
${ocrText}

Please provide:
1. A concise title (max 50 characters) that captures the document's essence
2. 3-5 relevant tags for categorization
3. A confidence score (0-100) based on text clarity and content
4. Brief reasoning for your suggestions

For different document types, follow these patterns:
- Receipts: "[Vendor Name] Receipt [Date]" or "[Vendor] - $[Amount]"
- Contracts: "[Party A] - [Party B] Contract" or "[Contract Type] Agreement"
- Invoices: "Invoice [Number] - [Vendor]" or "[Vendor] Invoice [Date]"
- Reports: "[Report Type] - [Date/Period]"
- Letters: "Letter from [Sender]" or "[Subject] Letter"
- Forms: "[Form Type] - [Date/Reference]"

Respond in JSON format:
{
  "title": "suggested title",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 85,
  "reasoning": "explanation of suggestions"
}`;

      // Make request to AI API
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert document analyst. Analyze OCR text and suggest appropriate titles and tags for document organization. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
      }

      const aiResponse = await response.json();
      console.log('AI API response:', aiResponse);

      // Parse the AI response
      let suggestion: DocumentSuggestion;
      try {
        // Try to parse the completion as JSON
        const parsed = JSON.parse(aiResponse.completion);
        suggestion = {
          title: parsed.title || 'Untitled Document',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
          reasoning: parsed.reasoning || 'AI analysis completed'
        };
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Fallback: extract information from text response
        const completion = aiResponse.completion || '';
        suggestion = extractSuggestionFromText(completion, ocrText);
      }

      // Validate and clean the suggestion
      suggestion.title = suggestion.title.trim().substring(0, 50) || 'Untitled Document';
      suggestion.tags = suggestion.tags.filter(tag => tag && tag.trim().length > 0).slice(0, 5);
      suggestion.confidence = Math.max(0, Math.min(100, suggestion.confidence));

      console.log('Final suggestion:', suggestion);

      return {
        success: true,
        suggestion
      };

    } catch (error) {
      console.error('Error generating title suggestion:', error);
      
      // Fallback: generate basic suggestion from OCR text
      const fallbackSuggestion = generateFallbackSuggestion(ocrText);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion: fallbackSuggestion
      };
    }
  });

// Helper function to extract suggestion from text response
function extractSuggestionFromText(text: string, ocrText: string): DocumentSuggestion {
  const lines = text.split('\n').filter(line => line.trim());
  
  let title = 'Untitled Document';
  let tags: string[] = [];
  let confidence = 50;
  let reasoning = 'Extracted from AI text response';

  // Try to find title
  const titleMatch = text.match(/title["']?\s*:?\s*["']([^"'\n]+)["']?/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Try to find tags
  const tagsMatch = text.match(/tags?["']?\s*:?\s*\[([^\]]+)\]/i);
  if (tagsMatch) {
    tags = tagsMatch[1].split(',').map(tag => tag.trim().replace(/["']/g, ''));
  }

  // Try to find confidence
  const confidenceMatch = text.match(/confidence["']?\s*:?\s*(\d+)/i);
  if (confidenceMatch) {
    confidence = parseInt(confidenceMatch[1]);
  }

  return { title, tags, confidence, reasoning };
}

// Helper function to generate fallback suggestion
function generateFallbackSuggestion(ocrText: string): DocumentSuggestion {
  const text = ocrText.toLowerCase();
  const words = ocrText.split(/\s+/).filter(word => word.length > 2);
  
  let title = 'Document';
  let tags: string[] = [];
  
  // Detect document type and generate appropriate title
  if (text.includes('receipt') || text.includes('total') || text.includes('$')) {
    title = 'Receipt';
    tags.push('receipt', 'expense');
    
    // Try to find vendor name (usually at the top)
    const firstLine = ocrText.split('\n')[0]?.trim();
    if (firstLine && firstLine.length < 30) {
      title = `${firstLine} Receipt`;
    }
  } else if (text.includes('invoice') || text.includes('bill')) {
    title = 'Invoice';
    tags.push('invoice', 'billing');
  } else if (text.includes('contract') || text.includes('agreement')) {
    title = 'Contract';
    tags.push('contract', 'legal');
  } else if (text.includes('report')) {
    title = 'Report';
    tags.push('report', 'document');
  } else if (text.includes('letter')) {
    title = 'Letter';
    tags.push('letter', 'correspondence');
  } else {
    // Use first meaningful words as title
    const meaningfulWords = words.slice(0, 3).join(' ');
    if (meaningfulWords.length > 0) {
      title = meaningfulWords.substring(0, 30);
    }
    tags.push('document');
  }
  
  // Add date if found
  const dateMatch = ocrText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  if (dateMatch) {
    tags.push('dated');
  }
  
  return {
    title: title.substring(0, 50),
    tags: tags.slice(0, 5),
    confidence: 30,
    reasoning: 'Generated from basic text analysis (AI unavailable)'
  };
}