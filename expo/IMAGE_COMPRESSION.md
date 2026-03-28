# Image Compression and File Size Optimization

This document describes the intelligent image compression and file size optimization feature implemented for scanned documents.

## Overview

The image compression system automatically optimizes document images after enhancement and before storage, reducing file sizes while maintaining visual quality. Users can select from different compression levels based on their needs.

## Features

### Compression Levels

1. **High Quality** (95% quality, max 2048px)
   - Best quality, larger file size
   - Recommended for archival and professional documents
   - Minimal compression (~15% size reduction)

2. **Medium** (80% quality, max 1600px) - **Default**
   - Balanced quality and size
   - Recommended for most documents
   - Good compression (~40% size reduction)

3. **Small File** (60% quality, max 1200px)
   - Smallest file size, good quality
   - Best for sharing and storage efficiency
   - Maximum compression (~65% size reduction)

### Format Support

- **JPEG**: Primary format for all compression levels
- **WebP**: Used for "Small File" level on mobile (better compression)
- **PNG**: Supported for input, converted to JPEG for storage

### Automatic Features

- **Thumbnail Generation**: Creates optimized 300px thumbnails
- **Aspect Ratio Preservation**: Maintains original image proportions
- **Quality Estimation**: Provides size estimates before compression
- **Metadata Storage**: Saves compression statistics in document metadata

## Implementation

### Core Components

1. **ImageCompressionService** (`lib/image-compression.ts`)
   - Main compression engine using expo-image-manipulator
   - Handles different compression levels and formats
   - Generates thumbnails and calculates statistics

2. **CompressionOptionsDialog** (`components/CompressionOptionsDialog.tsx`)
   - User interface for selecting compression levels
   - Shows size estimates and space savings
   - Provides compression tips and recommendations

3. **SaveDocumentDialog** (Updated)
   - Integrated compression options into document saving
   - Shows original file size and estimated compressed size
   - Allows users to change compression level before saving

### Integration Points

1. **Photo Preview Screen**
   - Gets original file size when image loads
   - Applies compression during document saving pipeline
   - Stores compression metadata with document

2. **Document Storage**
   - Uses compressed image as primary file
   - Stores thumbnail separately
   - Saves compression statistics in metadata

## Usage

### For Users

1. **Automatic**: Medium compression is applied by default
2. **Manual**: Click "Options" in the compression section of save dialog
3. **Preview**: See estimated file sizes before applying compression
4. **Customize**: Choose level based on document importance and storage needs

### For Developers

```typescript
import { imageCompressionService, CompressionLevel } from '@/lib/image-compression';

// Compress an image
const result = await imageCompressionService.compressImage(imageUri, {
  level: 'medium',
  format: 'jpeg'
});

// Get compression statistics
const stats = imageCompressionService.getCompressionStats([result]);
console.log(`Saved ${stats.spaceSaved} bytes (${stats.compressionRatio * 100}%)`);
```

## Technical Details

### Compression Pipeline

1. **Image Analysis**: Analyze original image dimensions and file size
2. **Dimension Calculation**: Calculate optimal dimensions while preserving aspect ratio
3. **Format Selection**: Choose best format based on compression level and platform
4. **Main Compression**: Apply compression using expo-image-manipulator
5. **Thumbnail Generation**: Create optimized thumbnail (300px max dimension)
6. **Statistics**: Calculate compression ratio and space saved

### Platform Compatibility

- **Mobile**: Full WebP support for better compression
- **Web**: JPEG fallback for maximum compatibility
- **Cross-platform**: Consistent API across all platforms

### Performance Considerations

- **Batch Processing**: Support for compressing multiple images
- **Memory Management**: Efficient handling of large images
- **Error Handling**: Graceful fallbacks for compression failures
- **Cleanup**: Automatic cleanup of temporary files

## Configuration

### Default Settings

```typescript
const COMPRESSION_CONFIGS = {
  'high-quality': {
    quality: 0.95,
    maxDimension: 2048,
    format: 'jpeg'
  },
  'medium': {
    quality: 0.8,
    maxDimension: 1600,
    format: 'jpeg'
  },
  'small-file': {
    quality: 0.6,
    maxDimension: 1200,
    format: Platform.OS === 'web' ? 'jpeg' : 'webp'
  }
};
```

### Thumbnail Settings

```typescript
const THUMBNAIL_CONFIG = {
  maxDimension: 300,
  quality: 0.7,
  format: 'jpeg'
};
```

## Benefits

1. **Storage Efficiency**: Significant reduction in storage requirements
2. **Upload Speed**: Faster uploads due to smaller file sizes
3. **Bandwidth Savings**: Reduced data usage for mobile users
4. **User Control**: Flexible compression options based on needs
5. **Quality Preservation**: Maintains document readability and OCR accuracy

## Future Enhancements

1. **Progressive JPEG**: Better loading experience for large documents
2. **HEIC Support**: Modern format support for iOS devices
3. **Lossless Compression**: Option for documents requiring perfect quality
4. **Batch Optimization**: Compress multiple documents simultaneously
5. **Smart Compression**: AI-based compression level selection