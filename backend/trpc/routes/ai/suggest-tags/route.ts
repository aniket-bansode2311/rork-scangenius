import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

interface TagSuggestion {
  tag: string;
  confidence: number;
  reasoning: string;
}

interface CategorySuggestion {
  category: string;
  confidence: number;
  reasoning: string;
}

interface TaggingResult {
  tags: TagSuggestion[];
  category: CategorySuggestion;
  documentType: string;
  confidence: number;
  reasoning: string;
}

const PREDEFINED_CATEGORIES = [
  'invoice',
  'receipt',
  'contract',
  'legal',
  'medical',
  'travel',
  'personal',
  'business',
  'financial',
  'insurance',
  'tax',
  'education',
  'government',
  'utility',
  'other'
] as const;

const inputSchema = z.object({
  ocrText: z.string().min(1, 'OCR text is required'),
  receiptData: z.any().optional(),
  currentTags: z.array(z.string()).optional().default([])
});

const COMMON_TAGS = [
  'urgent',
  'important',
  'archived',
  'pending',
  'completed',
  'draft',
  'signed',
  'expense',
  'income',
  'tax-deductible',
  'warranty',
  'subscription',
  'one-time',
  'recurring',
  'digital',
  'physical',
  'confidential',
  'public'
];

function analyzeDocumentContent(ocrText: string, receiptData?: any): TaggingResult {
  const text = ocrText.toLowerCase();
  const tags: TagSuggestion[] = [];
  let category: CategorySuggestion = { category: 'other', confidence: 50, reasoning: 'Default category' };
  let documentType = 'document';
  let overallConfidence = 60;
  let reasoning = 'Basic text analysis performed';

  // Receipt detection
  if (receiptData || 
      text.includes('receipt') || 
      text.includes('total') || 
      text.includes('subtotal') || 
      text.includes('tax') || 
      text.includes('amount') ||
      /\$\d+\.\d{2}/.test(text) ||
      text.includes('thank you for your purchase')) {
    
    category = { 
      category: 'receipt', 
      confidence: 85, 
      reasoning: 'Contains receipt-specific terms and monetary amounts' 
    };
    documentType = 'receipt';
    tags.push({ tag: 'expense', confidence: 90, reasoning: 'Receipt indicates an expense' });
    
    if (receiptData?.vendor) {
      tags.push({ tag: receiptData.vendor.toLowerCase().replace(/\s+/g, '-'), confidence: 95, reasoning: 'Vendor name from receipt data' });
    }
    
    if (text.includes('restaurant') || text.includes('food') || text.includes('dining')) {
      tags.push({ tag: 'food', confidence: 80, reasoning: 'Food-related receipt' });
    }
    
    if (text.includes('gas') || text.includes('fuel') || text.includes('station')) {
      tags.push({ tag: 'fuel', confidence: 85, reasoning: 'Fuel/gas station receipt' });
    }
    
    if (text.includes('grocery') || text.includes('supermarket') || text.includes('market')) {
      tags.push({ tag: 'groceries', confidence: 85, reasoning: 'Grocery store receipt' });
    }
    
    overallConfidence = 85;
    reasoning = 'Receipt detected with high confidence based on monetary patterns and keywords';
  }
  
  // Invoice detection
  else if (text.includes('invoice') || 
           text.includes('bill to') || 
           text.includes('invoice number') || 
           text.includes('due date') ||
           text.includes('payment terms')) {
    
    category = { 
      category: 'invoice', 
      confidence: 90, 
      reasoning: 'Contains invoice-specific terminology' 
    };
    documentType = 'invoice';
    tags.push({ tag: 'business', confidence: 85, reasoning: 'Invoice indicates business transaction' });
    tags.push({ tag: 'payment-required', confidence: 80, reasoning: 'Invoice requires payment' });
    
    overallConfidence = 90;
    reasoning = 'Invoice detected based on billing terminology';
  }
  
  // Contract detection
  else if (text.includes('agreement') || 
           text.includes('contract') || 
           text.includes('terms and conditions') || 
           text.includes('party of the first part') ||
           text.includes('whereas') ||
           text.includes('signature') && text.includes('date')) {
    
    category = { 
      category: 'contract', 
      confidence: 85, 
      reasoning: 'Contains legal contract terminology' 
    };
    documentType = 'contract';
    tags.push({ tag: 'legal', confidence: 90, reasoning: 'Contract is a legal document' });
    tags.push({ tag: 'important', confidence: 85, reasoning: 'Contracts are typically important documents' });
    
    if (text.includes('employment') || text.includes('job') || text.includes('salary')) {
      tags.push({ tag: 'employment', confidence: 80, reasoning: 'Employment-related contract' });
    }
    
    overallConfidence = 85;
    reasoning = 'Contract detected based on legal terminology';
  }
  
  // Medical document detection
  else if (text.includes('patient') || 
           text.includes('doctor') || 
           text.includes('medical') || 
           text.includes('prescription') ||
           text.includes('diagnosis') ||
           text.includes('treatment')) {
    
    category = { 
      category: 'medical', 
      confidence: 80, 
      reasoning: 'Contains medical terminology' 
    };
    documentType = 'medical document';
    tags.push({ tag: 'health', confidence: 85, reasoning: 'Medical document relates to health' });
    tags.push({ tag: 'confidential', confidence: 90, reasoning: 'Medical records are confidential' });
    
    overallConfidence = 80;
    reasoning = 'Medical document detected based on healthcare terminology';
  }
  
  // Travel document detection
  else if (text.includes('flight') || 
           text.includes('hotel') || 
           text.includes('booking') || 
           text.includes('reservation') ||
           text.includes('travel') ||
           text.includes('airline') ||
           text.includes('departure') ||
           text.includes('arrival')) {
    
    category = { 
      category: 'travel', 
      confidence: 75, 
      reasoning: 'Contains travel-related terminology' 
    };
    documentType = 'travel document';
    tags.push({ tag: 'travel', confidence: 90, reasoning: 'Travel-related document' });
    tags.push({ tag: 'expense', confidence: 70, reasoning: 'Travel documents often represent expenses' });
    
    overallConfidence = 75;
    reasoning = 'Travel document detected based on travel terminology';
  }
  
  // Financial document detection
  else if (text.includes('bank') || 
           text.includes('statement') || 
           text.includes('account') || 
           text.includes('balance') ||
           text.includes('transaction') ||
           text.includes('deposit') ||
           text.includes('withdrawal')) {
    
    category = { 
      category: 'financial', 
      confidence: 80, 
      reasoning: 'Contains financial terminology' 
    };
    documentType = 'financial document';
    tags.push({ tag: 'financial', confidence: 90, reasoning: 'Financial document' });
    tags.push({ tag: 'important', confidence: 75, reasoning: 'Financial documents are typically important' });
    
    overallConfidence = 80;
    reasoning = 'Financial document detected based on banking terminology';
  }
  
  // Tax document detection
  else if (text.includes('tax') || 
           text.includes('irs') || 
           text.includes('w-2') || 
           text.includes('1099') ||
           text.includes('deduction') ||
           text.includes('refund')) {
    
    category = { 
      category: 'tax', 
      confidence: 85, 
      reasoning: 'Contains tax-related terminology' 
    };
    documentType = 'tax document';
    tags.push({ tag: 'tax', confidence: 95, reasoning: 'Tax-related document' });
    tags.push({ tag: 'important', confidence: 90, reasoning: 'Tax documents are very important' });
    tags.push({ tag: 'annual', confidence: 70, reasoning: 'Tax documents are typically annual' });
    
    overallConfidence = 85;
    reasoning = 'Tax document detected based on tax terminology';
  }
  
  // Insurance document detection
  else if (text.includes('insurance') || 
           text.includes('policy') || 
           text.includes('coverage') || 
           text.includes('premium') ||
           text.includes('claim') ||
           text.includes('deductible')) {
    
    category = { 
      category: 'insurance', 
      confidence: 80, 
      reasoning: 'Contains insurance terminology' 
    };
    documentType = 'insurance document';
    tags.push({ tag: 'insurance', confidence: 90, reasoning: 'Insurance-related document' });
    tags.push({ tag: 'important', confidence: 85, reasoning: 'Insurance documents are important' });
    
    overallConfidence = 80;
    reasoning = 'Insurance document detected based on insurance terminology';
  }
  
  // Utility bill detection
  else if (text.includes('utility') || 
           text.includes('electric') || 
           text.includes('gas bill') || 
           text.includes('water bill') ||
           text.includes('internet') ||
           text.includes('phone bill') ||
           text.includes('monthly charge')) {
    
    category = { 
      category: 'utility', 
      confidence: 75, 
      reasoning: 'Contains utility bill terminology' 
    };
    documentType = 'utility bill';
    tags.push({ tag: 'utility', confidence: 85, reasoning: 'Utility bill' });
    tags.push({ tag: 'recurring', confidence: 80, reasoning: 'Utility bills are recurring' });
    tags.push({ tag: 'expense', confidence: 75, reasoning: 'Utility bills are expenses' });
    
    overallConfidence = 75;
    reasoning = 'Utility bill detected based on utility terminology';
  }
  
  // Add date-based tags
  const currentYear = new Date().getFullYear();
  const yearMatch = text.match(new RegExp(`\\b${currentYear}\\b`));
  if (yearMatch) {
    tags.push({ tag: currentYear.toString(), confidence: 70, reasoning: `Document from ${currentYear}` });
  }
  
  // Add urgency tags based on keywords
  if (text.includes('urgent') || text.includes('immediate') || text.includes('asap')) {
    tags.push({ tag: 'urgent', confidence: 85, reasoning: 'Document contains urgency indicators' });
  }
  
  if (text.includes('confidential') || text.includes('private') || text.includes('sensitive')) {
    tags.push({ tag: 'confidential', confidence: 80, reasoning: 'Document marked as confidential' });
  }
  
  // Remove duplicate tags
  const uniqueTags = tags.filter((tag, index, self) => 
    index === self.findIndex(t => t.tag === tag.tag)
  );
  
  return {
    tags: uniqueTags.slice(0, 8), // Limit to 8 tags
    category,
    documentType,
    confidence: overallConfidence,
    reasoning
  };
}

export const suggestTagsProcedure = protectedProcedure
  .input(inputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof inputSchema> }) => {
    try {
      console.log('Analyzing document for tags and categorization:', {
        textLength: input.ocrText.length,
        hasReceiptData: !!input.receiptData,
        currentTagsCount: input.currentTags.length
      });
      
      const result = analyzeDocumentContent(input.ocrText, input.receiptData);
      
      // Filter out tags that are already present
      const newTags = result.tags.filter(tag => 
        !input.currentTags.some((currentTag: string) => 
          currentTag.toLowerCase() === tag.tag.toLowerCase()
        )
      );
      
      console.log('Tag suggestion result:', {
        suggestedTags: newTags.length,
        category: result.category.category,
        confidence: result.confidence
      });
      
      return {
        success: true,
        suggestion: {
          tags: newTags,
          category: result.category,
          documentType: result.documentType,
          confidence: result.confidence,
          reasoning: result.reasoning,
          predefinedCategories: PREDEFINED_CATEGORIES,
          commonTags: COMMON_TAGS
        }
      };
    } catch (error) {
      console.error('Error in tag suggestion:', error);
      return {
        success: false,
        error: 'Failed to analyze document for tags and categorization'
      };
    }
  });