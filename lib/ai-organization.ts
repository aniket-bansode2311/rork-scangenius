export interface AIOrganizationResult {
  suggestedTags: string[];
  suggestedTitle: string;
  confidence: number;
}

export interface AIAnalysisRequest {
  text: string;
  currentTitle?: string;
}

interface AIResponse {
  completion: string;
}

class AIOrganizationService {
  private baseUrl = 'https://toolkit.rork.com/text/llm/';
  private maxRetries = 3;
  private retryDelay = 1000;

  private async makeRequest(messages: any[], attempt = 1): Promise<AIResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error: ${response.status} - ${errorText}`);
      }

      const data: AIResponse = await response.json();
      return data;
    } catch (error) {
      console.error(`AI request attempt ${attempt} failed:`, error);
      
      if (attempt < this.maxRetries) {
        console.log(`Retrying AI request in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.makeRequest(messages, attempt + 1);
      }
      
      throw error;
    }
  }

  private parseAIResponse(response: string): AIOrganizationResult {
    try {
      const parsed = JSON.parse(response);
      
      return {
        suggestedTags: Array.isArray(parsed.tags) ? parsed.tags : [],
        suggestedTitle: typeof parsed.title === 'string' ? parsed.title : '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      const fallbackTags = this.extractFallbackTags(response);
      const fallbackTitle = this.extractFallbackTitle(response);
      
      return {
        suggestedTags: fallbackTags,
        suggestedTitle: fallbackTitle,
        confidence: 0.3,
      };
    }
  }

  private extractFallbackTags(text: string): string[] {
    const commonTags = [
      'receipt', 'invoice', 'contract', 'letter', 'form', 'certificate',
      'report', 'statement', 'bill', 'document', 'legal', 'financial',
      'medical', 'business', 'personal', 'tax', 'insurance', 'warranty'
    ];
    
    const lowerText = text.toLowerCase();
    return commonTags.filter(tag => lowerText.includes(tag)).slice(0, 3);
  }

  private extractFallbackTitle(text: string): string {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return 'Document';
    
    const firstLine = lines[0].trim();
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...';
    }
    
    return firstLine || 'Document';
  }

  async analyzeDocument(request: AIAnalysisRequest): Promise<AIOrganizationResult> {
    if (!request.text || request.text.trim().length === 0) {
      return {
        suggestedTags: ['document'],
        suggestedTitle: request.currentTitle || 'Document',
        confidence: 0.1,
      };
    }

    try {
      console.log('Starting AI analysis for document text:', request.text.substring(0, 100) + '...');
      
      const systemPrompt = `You are an AI assistant that analyzes document text and provides smart organization suggestions.

Your task is to:
1. Suggest relevant tags based on the document content (max 5 tags)
2. Suggest an improved title for the document
3. Provide a confidence score (0-1) for your suggestions

Common document types and their tags:
- Receipts: receipt, purchase, shopping, expense
- Invoices: invoice, bill, payment, business
- Contracts: contract, legal, agreement, terms
- Medical: medical, health, prescription, doctor
- Financial: financial, bank, statement, tax
- Legal: legal, court, law, document
- Personal: personal, letter, correspondence
- Business: business, corporate, meeting, memo
- Insurance: insurance, policy, claim, coverage
- Tax: tax, irs, return, deduction

Respond with a JSON object in this exact format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "title": "Suggested Document Title",
  "confidence": 0.85
}

Make sure tags are lowercase, relevant, and specific. The title should be concise but descriptive.`;

      const userPrompt = `Analyze this document text and provide organization suggestions:

${request.text}

${request.currentTitle ? `Current title: "${request.currentTitle}"` : ''}

Provide your response as a JSON object with tags, title, and confidence.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await this.makeRequest(messages);
      console.log('AI analysis response received');
      
      const result = this.parseAIResponse(response.completion);
      console.log('AI analysis completed:', {
        tagsCount: result.suggestedTags.length,
        titleLength: result.suggestedTitle.length,
        confidence: result.confidence,
      });
      
      return result;
    } catch (error) {
      console.error('AI analysis failed:', error);
      
      return {
        suggestedTags: this.extractFallbackTags(request.text),
        suggestedTitle: this.extractFallbackTitle(request.text),
        confidence: 0.2,
      };
    }
  }

  async generateSmartTitle(text: string, currentTitle?: string): Promise<string> {
    try {
      const result = await this.analyzeDocument({ text, currentTitle });
      return result.suggestedTitle;
    } catch (error) {
      console.error('Smart title generation failed:', error);
      return this.extractFallbackTitle(text);
    }
  }

  async generateSmartTags(text: string): Promise<string[]> {
    try {
      const result = await this.analyzeDocument({ text });
      return result.suggestedTags;
    } catch (error) {
      console.error('Smart tags generation failed:', error);
      return this.extractFallbackTags(text);
    }
  }
}

export const aiOrganizationService = new AIOrganizationService();

export const analyzeDocumentContent = async (request: AIAnalysisRequest): Promise<AIOrganizationResult> => {
  return aiOrganizationService.analyzeDocument(request);
};

export const generateSmartTitle = async (text: string, currentTitle?: string): Promise<string> => {
  return aiOrganizationService.generateSmartTitle(text, currentTitle);
};

export const generateSmartTags = async (text: string): Promise<string[]> => {
  return aiOrganizationService.generateSmartTags(text);
};