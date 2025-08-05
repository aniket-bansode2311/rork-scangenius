//backend/trpc/routes/receipts/check/route.ts
import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const checkReceiptProcedure = protectedProcedure
  .input(z.object({
    ocrText: z.string().min(1)
  }))
  .query(async ({ input }: { input: { ocrText: string } }) => {
    const { ocrText } = input;
    
    try {
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
      const isLikelyReceipt = (keywordMatches >= 2 && hasCurrency) ||
                             priceMatches.length >= 3 ||
                             (text.includes('total') && priceMatches.length >= 1);
      
      return {
        isLikelyReceipt,
        confidence: isLikelyReceipt ? Math.min(90, keywordMatches * 10 + priceMatches.length * 5) : 0,
        details: {
          keywordMatches,
          hasCurrency,
          priceMatches: priceMatches.length
        }
      };
    } catch (error) {
      console.error('Receipt check error:', error);
      return {
        isLikelyReceipt: false,
        confidence: 0,
        error: 'Failed to analyze text'
      };
    }
  });