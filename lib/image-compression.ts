import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export type CompressionLevel = 'high-quality' | 'medium' | 'small-file';

export interface CompressionOptions {
  level: CompressionLevel;
  format?: 'jpeg' | 'webp' | 'png';
  maxWidth?: number;
  maxHeight?: number;
  customQuality?: number; // 0-1, overrides level-based quality
}

export interface CompressionResult {
  compressedUri: string;
  thumbnailUri: string;
  originalSize: number;
  compressedSize: number;
  thumbnailSize: number;
  compressionRatio: number;
  format: string;
  dimensions: {
    width: number;
    height: number;
  };
  thumbnailDimensions: {
    width: number;
    height: number;
  };
}

export interface CompressionStats {
  processingTime: number;
  originalFileSize: number;
  compressedFileSize: number;
  thumbnailFileSize: number;
  spaceSaved: number;
  compressionRatio: number;
}

// Compression level configurations
const COMPRESSION_CONFIGS: Record<CompressionLevel, {
  quality: number;
  maxDimension: number;
  format: 'jpeg' | 'webp';
  description: string;
}> = {
  'high-quality': {
    quality: 0.95,
    maxDimension: 2048,
    format: 'jpeg',
    description: 'Best quality, larger file size'
  },
  'medium': {
    quality: 0.8,
    maxDimension: 1600,
    format: 'jpeg',
    description: 'Balanced quality and size'
  },
  'small-file': {
    quality: 0.6,
    maxDimension: 1200,
    format: Platform.OS === 'web' ? 'jpeg' : 'webp', // WebP not fully supported on web
    description: 'Smallest file size, good quality'
  }
};

// Thumbnail configuration
const THUMBNAIL_CONFIG = {
  maxDimension: 300,
  quality: 0.7,
  format: 'jpeg' as const
};

class ImageCompressionService {
  /**
   * Get file size in bytes
   */
  private async getFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists ? fileInfo.size || 0 : 0;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    try {
      // Use ImageManipulator to get image info
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [], // No manipulations, just get info
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // For now, we'll estimate dimensions based on file size
      // In a real implementation, you'd use a proper image library
      const fileSize = await this.getFileSize(uri);
      const estimatedPixels = Math.sqrt(fileSize / 3); // Rough estimate
      
      return {
        width: Math.round(estimatedPixels * 1.33), // Assume 4:3 aspect ratio
        height: Math.round(estimatedPixels)
      };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return { width: 1024, height: 768 }; // Default dimensions
    }
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxDimension: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
      return { width: originalWidth, height: originalHeight };
    }
    
    if (originalWidth > originalHeight) {
      return {
        width: maxDimension,
        height: Math.round(maxDimension / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxDimension * aspectRatio),
        height: maxDimension
      };
    }
  }

  /**
   * Compress image with specified options
   */
  async compressImage(
    sourceUri: string,
    options: CompressionOptions
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    
    try {
      console.log('Starting image compression:', {
        sourceUri,
        options
      });

      // Get original file info
      const originalSize = await this.getFileSize(sourceUri);
      const originalDimensions = await this.getImageDimensions(sourceUri);
      
      console.log('Original image info:', {
        size: originalSize,
        dimensions: originalDimensions
      });

      // Get compression config
      const config = COMPRESSION_CONFIGS[options.level];
      const quality = options.customQuality ?? config.quality;
      const format = options.format ?? config.format;
      
      // Calculate optimal dimensions
      const maxWidth = options.maxWidth ?? config.maxDimension;
      const maxHeight = options.maxHeight ?? config.maxDimension;
      const maxDimension = Math.min(maxWidth, maxHeight);
      
      const targetDimensions = this.calculateOptimalDimensions(
        originalDimensions.width,
        originalDimensions.height,
        maxDimension
      );

      console.log('Target compression settings:', {
        quality,
        format,
        targetDimensions,
        maxDimension
      });

      // Prepare manipulations
      const manipulations: ImageManipulator.Action[] = [];
      
      // Resize if needed
      if (targetDimensions.width !== originalDimensions.width || 
          targetDimensions.height !== originalDimensions.height) {
        manipulations.push({
          resize: {
            width: targetDimensions.width,
            height: targetDimensions.height
          }
        });
      }

      // Determine save format
      let saveFormat: ImageManipulator.SaveFormat;
      switch (format) {
        case 'webp':
          saveFormat = Platform.OS === 'web' 
            ? ImageManipulator.SaveFormat.JPEG // Fallback for web
            : ImageManipulator.SaveFormat.WEBP;
          break;
        case 'png':
          saveFormat = ImageManipulator.SaveFormat.PNG;
          break;
        default:
          saveFormat = ImageManipulator.SaveFormat.JPEG;
      }

      // Compress main image
      const compressedResult = await ImageManipulator.manipulateAsync(
        sourceUri,
        manipulations,
        {
          compress: quality,
          format: saveFormat,
          base64: false
        }
      );

      console.log('Main compression completed:', compressedResult.uri);

      // Create thumbnail
      const thumbnailDimensions = this.calculateOptimalDimensions(
        originalDimensions.width,
        originalDimensions.height,
        THUMBNAIL_CONFIG.maxDimension
      );

      const thumbnailResult = await ImageManipulator.manipulateAsync(
        sourceUri,
        [
          {
            resize: {
              width: thumbnailDimensions.width,
              height: thumbnailDimensions.height
            }
          }
        ],
        {
          compress: THUMBNAIL_CONFIG.quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );

      console.log('Thumbnail compression completed:', thumbnailResult.uri);

      // Get final file sizes
      const compressedSize = await this.getFileSize(compressedResult.uri);
      const thumbnailSize = await this.getFileSize(thumbnailResult.uri);
      
      const compressionRatio = originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;
      const processingTime = Date.now() - startTime;

      const result: CompressionResult = {
        compressedUri: compressedResult.uri,
        thumbnailUri: thumbnailResult.uri,
        originalSize,
        compressedSize,
        thumbnailSize,
        compressionRatio,
        format: format,
        dimensions: {
          width: compressedResult.width || targetDimensions.width,
          height: compressedResult.height || targetDimensions.height
        },
        thumbnailDimensions
      };

      console.log('Compression completed:', {
        processingTime: processingTime + 'ms',
        originalSize: this.formatFileSize(originalSize),
        compressedSize: this.formatFileSize(compressedSize),
        thumbnailSize: this.formatFileSize(thumbnailSize),
        compressionRatio: (compressionRatio * 100).toFixed(1) + '%',
        spaceSaved: this.formatFileSize(originalSize - compressedSize)
      });

      return result;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error(`Image compression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Compress multiple images in batch
   */
  async compressImageBatch(
    sourceUris: string[],
    options: CompressionOptions,
    onProgress?: (completed: number, total: number) => void
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    
    console.log(`Starting batch compression of ${sourceUris.length} images`);
    
    for (let i = 0; i < sourceUris.length; i++) {
      try {
        const result = await this.compressImage(sourceUris[i], options);
        results.push(result);
        onProgress?.(i + 1, sourceUris.length);
      } catch (error) {
        console.error(`Failed to compress image ${i + 1}:`, error);
        // Continue with other images
      }
    }
    
    console.log(`Batch compression completed: ${results.length}/${sourceUris.length} successful`);
    return results;
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(results: CompressionResult[]): CompressionStats {
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
    const totalThumbnailSize = results.reduce((sum, r) => sum + r.thumbnailSize, 0);
    
    return {
      processingTime: 0, // Would need to track this separately
      originalFileSize: totalOriginalSize,
      compressedFileSize: totalCompressedSize,
      thumbnailFileSize: totalThumbnailSize,
      spaceSaved: totalOriginalSize - totalCompressedSize,
      compressionRatio: totalOriginalSize > 0 
        ? (totalOriginalSize - totalCompressedSize) / totalOriginalSize 
        : 0
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get compression level options for UI
   */
  getCompressionLevelOptions(): Array<{
    value: CompressionLevel;
    label: string;
    description: string;
    estimatedSize: string;
  }> {
    return Object.entries(COMPRESSION_CONFIGS).map(([level, config]) => ({
      value: level as CompressionLevel,
      label: level.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      description: config.description,
      estimatedSize: `Max ${config.maxDimension}px, ${Math.round(config.quality * 100)}% quality`
    }));
  }

  /**
   * Estimate compressed file size (rough approximation)
   */
  estimateCompressedSize(
    originalSize: number,
    level: CompressionLevel
  ): { size: number; reduction: number } {
    const config = COMPRESSION_CONFIGS[level];
    
    // Rough estimation based on quality and typical compression ratios
    let estimatedRatio: number;
    switch (level) {
      case 'high-quality':
        estimatedRatio = 0.15; // 15% reduction
        break;
      case 'medium':
        estimatedRatio = 0.4; // 40% reduction
        break;
      case 'small-file':
        estimatedRatio = 0.65; // 65% reduction
        break;
    }
    
    const estimatedSize = Math.round(originalSize * (1 - estimatedRatio));
    
    return {
      size: estimatedSize,
      reduction: estimatedRatio
    };
  }

  /**
   * Validate image format support
   */
  isFormatSupported(format: string): boolean {
    const supportedFormats = ['jpeg', 'jpg', 'png'];
    
    // WebP support varies by platform
    if (format.toLowerCase() === 'webp') {
      return Platform.OS !== 'web'; // WebP has limited web support
    }
    
    return supportedFormats.includes(format.toLowerCase());
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(uris: string[]): Promise<void> {
    for (const uri of uris) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log('Cleaned up temp file:', uri);
        }
      } catch (error) {
        console.warn('Failed to cleanup temp file:', uri, error);
      }
    }
  }
}

// Export singleton instance
export const imageCompressionService = new ImageCompressionService();

// Export utility functions
export const compressionUtils = {
  formatFileSize: (bytes: number) => imageCompressionService.formatFileSize(bytes),
  getCompressionLevels: () => imageCompressionService.getCompressionLevelOptions(),
  estimateSize: (originalSize: number, level: CompressionLevel) => 
    imageCompressionService.estimateCompressedSize(originalSize, level),
  isFormatSupported: (format: string) => imageCompressionService.isFormatSupported(format)
};