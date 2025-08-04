# OCR Integration with Google Cloud Vision API

This document describes the OCR (Optical Character Recognition) integration implemented in ScanGenius using Google Cloud Vision API.

## Features

- **Automatic OCR Processing**: When a document is saved, OCR processing happens automatically in the background
- **Text Search**: Search through document titles and extracted OCR text content
- **OCR Text Display**: View extracted text in the document detail screen
- **Reprocess OCR**: Manually reprocess OCR for better results
- **Copy OCR Text**: Copy extracted text to clipboard
- **Error Handling**: Robust error handling with retry logic and fallbacks

## Setup Instructions

### 1. Google Cloud Vision API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Vision API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### 2. Configure API Key

1. Open `constants/config.ts`
2. Replace `your-google-cloud-vision-api-key` with your actual API key:
   ```typescript
   export const GOOGLE_CLOUD_VISION_API_KEY = "your-actual-api-key-here";
   ```

### 3. Database Schema Update

Run the updated SQL schema in your Supabase SQL Editor to add OCR support:

```sql
-- Add OCR columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_processed BOOLEAN DEFAULT FALSE;

-- Add indexes for OCR text search
CREATE INDEX IF NOT EXISTS documents_ocr_text_idx ON public.documents USING gin(to_tsvector('english', ocr_text));
CREATE INDEX IF NOT EXISTS documents_ocr_processed_idx ON public.documents(ocr_processed);
```

## How It Works

### 1. Document Saving Flow

1. User captures and saves a document
2. Document metadata is saved to Supabase immediately
3. OCR processing starts in the background (non-blocking)
4. Google Cloud Vision API extracts text from the image
5. Extracted text is saved to the `ocr_text` column
6. `ocr_processed` flag is set to `true`

### 2. Search Functionality

- **Database Search**: Uses Supabase's full-text search on both title and OCR text
- **Local Fallback**: If server search fails, falls back to local filtering
- **Debounced Input**: 300ms debounce to avoid excessive API calls

### 3. OCR Text Display

- **Collapsible Section**: OCR text is shown in an expandable section
- **Scrollable Content**: Long text content is scrollable with max height
- **Copy Functionality**: Users can copy extracted text to clipboard
- **Reprocess Option**: Users can manually reprocess OCR if needed

## API Usage and Rate Limiting

### Google Cloud Vision API

- **Endpoint**: `https://vision.googleapis.com/v1/images:annotate`
- **Method**: POST
- **Authentication**: API Key
- **Rate Limits**: Check Google Cloud Console for your project limits
- **Pricing**: Pay-per-use model (check Google Cloud pricing)

### Error Handling

- **Retry Logic**: Up to 3 retries with exponential backoff
- **Graceful Degradation**: App continues to work even if OCR fails
- **User Feedback**: Clear error messages for users
- **Logging**: Comprehensive logging for debugging

## Security Considerations

### API Key Security

⚠️ **Important**: The current implementation stores the API key in the client code, which is not secure for production use.

**Recommended Production Approach**:
1. Use Supabase Edge Functions to proxy OCR requests
2. Store API keys securely on the server side
3. Implement proper authentication and rate limiting

### Example Edge Function

```typescript
// supabase/functions/ocr-process/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { image_base64 } = await req.json()
  
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: image_base64 },
        features: [{ type: 'TEXT_DETECTION', maxResults: 50 }]
      }]
    })
  })
  
  return new Response(JSON.stringify(await response.json()))
})
```

## Performance Optimization

### Image Processing

- **Base64 Conversion**: Efficient conversion for both web and mobile
- **File Size Limits**: Consider implementing file size limits
- **Image Compression**: Compress images before sending to API

### Caching

- **Local Storage**: OCR results are cached in the database
- **Avoid Reprocessing**: Only reprocess when explicitly requested
- **Background Processing**: OCR doesn't block the UI

## Testing

### Manual Testing

1. **Save a Document**: Capture and save a document with text
2. **Check OCR Processing**: Verify OCR text appears in document detail
3. **Search Functionality**: Search for text that appears in the document
4. **Error Handling**: Test with invalid API key to verify error handling

### Test Cases

- Documents with clear text
- Documents with handwritten text
- Documents with poor image quality
- Documents with no text
- Network connectivity issues
- API rate limiting scenarios

## Troubleshooting

### Common Issues

1. **OCR Not Working**
   - Check API key configuration
   - Verify Google Cloud Vision API is enabled
   - Check network connectivity
   - Review console logs for errors

2. **Search Not Finding Results**
   - Verify OCR processing completed (`ocr_processed = true`)
   - Check database indexes are created
   - Test with exact text matches first

3. **Performance Issues**
   - Monitor API usage and costs
   - Implement image compression
   - Consider batch processing for multiple documents

### Debug Logging

The implementation includes comprehensive logging:
- OCR processing start/completion
- API request/response details
- Error conditions and retries
- Search query performance

Check the browser console or React Native debugger for detailed logs.

## Future Enhancements

### Potential Improvements

1. **Multi-language Support**: Configure language hints based on user preference
2. **OCR Confidence Scoring**: Display confidence levels and highlight uncertain text
3. **Text Formatting**: Preserve text formatting and layout information
4. **Batch Processing**: Process multiple documents simultaneously
5. **Offline OCR**: Implement on-device OCR for offline functionality
6. **Text Editing**: Allow users to edit and correct OCR results

### Alternative OCR Services

Consider these alternatives to Google Cloud Vision:
- **AWS Textract**: Amazon's OCR service
- **Azure Computer Vision**: Microsoft's OCR service
- **Tesseract.js**: Client-side OCR (for offline functionality)
- **Apple Vision Framework**: iOS-specific OCR

## Cost Considerations

### Google Cloud Vision Pricing

- **Free Tier**: 1,000 requests per month
- **Paid Tier**: $1.50 per 1,000 requests (as of 2024)
- **Bulk Discounts**: Available for high-volume usage

### Cost Optimization

1. **Image Optimization**: Compress images to reduce processing time
2. **Selective Processing**: Only process documents that likely contain text
3. **Caching**: Avoid reprocessing the same document
4. **Monitoring**: Set up billing alerts and usage monitoring

## Support

For issues related to:
- **Google Cloud Vision API**: Check Google Cloud documentation
- **Supabase Integration**: Refer to Supabase documentation
- **React Native Implementation**: Check React Native and Expo documentation

Remember to keep your API keys secure and monitor your usage to avoid unexpected costs.