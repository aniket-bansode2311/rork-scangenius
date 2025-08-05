import { ReceiptData, ReceiptLineItem } from '@/types/supabase';

export interface ReceiptExtractionResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
  confidence_score?: number;
}

class ReceiptExtractionService {
  private aiApiUrl = 'https://toolkit.rork.com/text/llm/';

  private createExtractionPrompt(ocrText: string): string {
    return `You are an expert at extracting structured data from receipt text. Analyze the following OCR text from a receipt and extract key information in JSON format.

OCR Text:
${ocrText}

Please extract the following information and return it as a valid JSON object:
{
  "vendor_name": "Business name",
  "vendor_address": "Full address if available",
  "vendor_phone": "Phone number if available",
  "total_amount": 0.00,
  "subtotal": 0.00,
  "tax_amount": 0.00,
  "tip_amount": 0.00,
  "date": "YYYY-MM-DD format if available",
  "time": "HH:MM format if available",
  "receipt_number": "Receipt/transaction number if available",
  "payment_method": "Cash/Card/etc if available",
  "currency": "USD or other currency code",
  "line_items": [
    {
      "description": "Item description",
      "quantity": 1,
      "unit_price": 0.00,
      "total_price": 0.00
    }
  ]
}

Rules:
1. Only include fields where you can confidently extract the information
2. For amounts, use numbers (not strings)
3. For dates, use YYYY-MM-DD format
4. For times, use HH:MM format (24-hour)
5. If you can't find a field, omit it from the JSON
6. Be conservative - only include data you're confident about
7. For line items, try to extract individual products/services with their prices
8. Return ONLY the JSON object, no additional text

If the text doesn't appear to be from a receipt, return: {"error": "Not a receipt"}`;
  }

  private parseReceiptResponse(response: string): ReceiptExtractionResult {
    try {
      const cleanedResponse = response.trim();
      
      if (cleanedResponse.includes('"error": "Not a receipt"')) {
        return {
          success: false,
          error: 'The document does not appear to be a receipt'
        };
      }

      const data = JSON.parse(cleanedResponse) as ReceiptData;
      
      // Validate and clean the data
      const cleanedData: ReceiptData = {
        ...data,
        extracted_at: new Date().toISOString(),
        confidence_score: this.calculateConfidenceScore(data)
      };

      // Validate required fields for a receipt
      if (!data.vendor_name && !data.total_amount && !data.line_items?.length) {
        return {
          success: false,
          error: 'Insufficient receipt data could be extracted'
        };
      }

      return {
        success: true,
        data: cleanedData,
        confidence_score: cleanedData.confidence_score
      };
    } catch (error) {
      console.error('Error parsing receipt extraction response:', error);
      return {
        success: false,
        error: 'Failed to parse extracted receipt data'
      };
    }
  }

  private calculateConfidenceScore(data: ReceiptData): number {
    let score = 0;
    let maxScore = 0;

    // Vendor name (high importance)
    maxScore += 20;
    if (data.vendor_name) score += 20;

    // Total amount (high importance)
    maxScore += 20;
    if (data.total_amount && data.total_amount > 0) score += 20;

    // Date (medium importance)
    maxScore += 15;
    if (data.date) score += 15;

    // Line items (medium importance)
    maxScore += 15;
    if (data.line_items && data.line_items.length > 0) score += 15;

    // Subtotal and tax (medium importance)
    maxScore += 10;
    if (data.subtotal && data.subtotal > 0) score += 5;
    if (data.tax_amount && data.tax_amount > 0) score += 5;

    // Additional details (low importance)
    maxScore += 20;
    if (data.vendor_address) score += 5;
    if (data.vendor_phone) score += 5;
    if (data.time) score += 5;
    if (data.receipt_number) score += 5;

    return Math.round((score / maxScore) * 100);
  }

  async extractReceiptData(ocrText: string): Promise<ReceiptExtractionResult> {
    if (!ocrText || ocrText.trim().length === 0) {
      return {
        success: false,
        error: 'No OCR text provided for receipt extraction'
      };
    }

    try {
      console.log('Starting receipt data extraction...');
      
      const prompt = this.createExtractionPrompt(ocrText);
      
      const response = await fetch(this.aiApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.completion) {
        throw new Error('No completion received from AI API');
      }

      console.log('Receipt extraction completed, parsing response...');
      return this.parseReceiptResponse(result.completion);
      
    } catch (error) {
      console.error('Receipt extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during receipt extraction'
      };
    }
  }

  async isReceiptLikely(ocrText: string): Promise<boolean> {
    if (!ocrText || ocrText.trim().length === 0) {
      return false;
    }

    const receiptKeywords = [
      'receipt', 'total', 'subtotal', 'tax', 'amount', 'paid', 'change',
      'cash', 'card', 'visa', 'mastercard', 'thank you', 'store',
      'restaurant', 'cafe', 'shop', 'market', 'purchase', 'sale',
      'qty', 'quantity', 'price', 'item', 'product', 'service'
    ];

    const currencySymbols = ['$', '€', '£', '¥', '₹', '₽'];
    
    const text = ocrText.toLowerCase();
    
    // Check for receipt keywords
    const keywordMatches = receiptKeywords.filter(keyword => 
      text.includes(keyword)
    ).length;
    
    // Check for currency symbols
    const hasCurrency = currencySymbols.some(symbol => 
      ocrText.includes(symbol)
    );
    
    // Check for price patterns (e.g., $12.34, 12.34, etc.)
    const pricePattern = /\$?\d+\.\d{2}/g;
    const priceMatches = ocrText.match(pricePattern) || [];
    
    // Consider it a receipt if:
    // - Has at least 2 receipt keywords AND currency symbols
    // - OR has at least 3 price patterns
    // - OR has "total" keyword AND price patterns
    return (keywordMatches >= 2 && hasCurrency) ||
           priceMatches.length >= 3 ||
           (text.includes('total') && priceMatches.length >= 1);
  }
}

export const receiptExtractionService = new ReceiptExtractionService();

export const extractReceiptData = async (ocrText: string): Promise<ReceiptExtractionResult> => {
  return receiptExtractionService.extractReceiptData(ocrText);
};

export const isReceiptLikely = async (ocrText: string): Promise<boolean> => {
  return receiptExtractionService.isReceiptLikely(ocrText);
};