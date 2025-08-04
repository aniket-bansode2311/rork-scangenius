import { GOOGLE_CLOUD_VISION_API_KEY } from '@/constants/config';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: TextBlock[];
}

export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GoogleVisionResponse {
  responses: {
    textAnnotations?: {
      description: string;
      score?: number;
      boundingPoly?: {
        vertices: { x: number; y: number }[];
      };
    }[];
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }[];
}

class OCRService {
  private apiKey: string;
  private baseUrl = 'https://vision.googleapis.com/v1/images:annotate';
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.apiKey = GOOGLE_CLOUD_VISION_API_KEY;
    if (!this.apiKey || this.apiKey === 'your-google-cloud-vision-api-key') {
      console.warn('Google Cloud Vision API key not configured. OCR functionality will be disabled.');
    }
  }

  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        if (imageUri.startsWith('data:')) {
          return imageUri.split(',')[1];
        }
        
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        return await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image for OCR');
    }
  }

  private async makeRequest(base64Image: string, attempt = 1): Promise<GoogleVisionResponse> {
    try {
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 50,
              },
            ],
            imageContext: {
              languageHints: ['en'],
            },
          },
        ],
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
      }

      const data: GoogleVisionResponse = await response.json();
      
      if (data.responses[0]?.error) {
        throw new Error(`Google Vision API error: ${data.responses[0].error.message}`);
      }

      return data;
    } catch (error) {
      console.error(`OCR request attempt ${attempt} failed:`, error);
      
      if (attempt < this.maxRetries) {
        console.log(`Retrying OCR request in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.makeRequest(base64Image, attempt + 1);
      }
      
      throw error;
    }
  }

  private parseGoogleVisionResponse(response: GoogleVisionResponse): OCRResult {
    const visionResponse = response.responses[0];
    
    if (!visionResponse?.textAnnotations || visionResponse.textAnnotations.length === 0) {
      return {
        text: '',
        confidence: 0,
        blocks: [],
      };
    }

    const fullText = visionResponse.fullTextAnnotation?.text || 
                    visionResponse.textAnnotations[0]?.description || '';
    
    const blocks: TextBlock[] = visionResponse.textAnnotations.slice(1).map(annotation => {
      const vertices = annotation.boundingPoly?.vertices || [];
      let boundingBox: BoundingBox = { x: 0, y: 0, width: 0, height: 0 };
      
      if (vertices.length >= 4) {
        const xs = vertices.map(v => v.x);
        const ys = vertices.map(v => v.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        boundingBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      }
      
      return {
        text: annotation.description,
        confidence: annotation.score || 0,
        boundingBox,
      };
    });

    const averageConfidence = blocks.length > 0 
      ? blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length
      : 0;

    return {
      text: fullText.trim(),
      confidence: averageConfidence,
      blocks,
    };
  }

  async extractText(imageUri: string): Promise<OCRResult> {
    if (!this.apiKey || this.apiKey === 'your-google-cloud-vision-api-key') {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      console.log('Starting OCR processing for image:', imageUri);
      
      const base64Image = await this.convertImageToBase64(imageUri);
      console.log('Image converted to base64, size:', base64Image.length);
      
      const response = await this.makeRequest(base64Image);
      console.log('Google Vision API response received');
      
      const result = this.parseGoogleVisionResponse(response);
      console.log('OCR processing completed:', {
        textLength: result.text.length,
        confidence: result.confidence,
        blocksCount: result.blocks.length,
      });
      
      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw error;
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.apiKey && this.apiKey !== 'your-google-cloud-vision-api-key');
  }
}

export const ocrService = new OCRService();

export const extractTextFromImage = async (imageUri: string): Promise<OCRResult> => {
  return ocrService.extractText(imageUri);
};

export const isOCRConfigured = async (): Promise<boolean> => {
  return ocrService.isConfigured();
};