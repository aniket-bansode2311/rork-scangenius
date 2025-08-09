export enum ErrorType {
  OCR = 'OCR',
  IMAGE_PROCESSING = 'IMAGE_PROCESSING',
  CAMERA = 'CAMERA',
  AUTH = 'AUTH',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  originalError?: Error;
  context?: Record<string, any>;
}

export const createAppError = (
  type: ErrorType,
  severity: ErrorSeverity,
  message: string,
  userMessage: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  return {
    type,
    severity,
    message,
    userMessage,
    originalError,
    context
  };
};

// Specific error creators
export const createImageProcessingError = (
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  let userMessage = 'Image processing failed. Please try again.';
  let severity = ErrorSeverity.MEDIUM;
  
  if (originalError?.message.includes('quota')) {
    userMessage = 'OCR quota exceeded. Please try again later.';
    severity = ErrorSeverity.HIGH;
  } else if (originalError?.message.includes('memory')) {
    userMessage = 'Image is too large to process. Please try with a smaller image.';
    severity = ErrorSeverity.MEDIUM;
  } else if (originalError?.message.includes('format')) {
    userMessage = 'Unsupported image format. Please use JPG or PNG.';
    severity = ErrorSeverity.LOW;
  } else if (originalError?.message.includes('corrupt')) {
    userMessage = 'Image file is corrupted. Please take a new photo.';
    severity = ErrorSeverity.MEDIUM;
  }
  
  return createAppError(
    ErrorType.IMAGE_PROCESSING,
    severity,
    message,
    userMessage,
    originalError,
    context
  );
};

export const createCameraError = (
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  let userMessage = 'Camera error occurred. Please try again.';
  let severity = ErrorSeverity.MEDIUM;
  
  if (originalError?.message.includes('permission')) {
    userMessage = 'Camera permission is required. Please enable camera access in settings.';
    severity = ErrorSeverity.HIGH;
  } else if (originalError?.message.includes('unavailable')) {
    userMessage = 'Camera is not available on this device.';
    severity = ErrorSeverity.HIGH;
  } else if (originalError?.message.includes('busy')) {
    userMessage = 'Camera is busy. Please close other camera apps and try again.';
    severity = ErrorSeverity.MEDIUM;
  }
  
  return createAppError(
    ErrorType.CAMERA,
    severity,
    message,
    userMessage,
    originalError,
    context
  );
};

export const createAuthError = (
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  let userMessage = 'Authentication failed. Please log in again.';
  
  return createAppError(
    ErrorType.AUTH,
    ErrorSeverity.HIGH,
    message,
    userMessage,
    originalError,
    context
  );
};

export const createStorageError = (
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  let userMessage = 'Storage error occurred. Please try again.';
  let severity = ErrorSeverity.MEDIUM;
  
  if (originalError?.message.includes('space')) {
    userMessage = 'Not enough storage space. Please free up some space and try again.';
    severity = ErrorSeverity.HIGH;
  } else if (originalError?.message.includes('permission')) {
    userMessage = 'Storage permission is required. Please enable storage access in settings.';
    severity = ErrorSeverity.HIGH;
  }
  
  return createAppError(
    ErrorType.STORAGE,
    severity,
    message,
    userMessage,
    originalError,
    context
  );
};

export const createOCRError = (
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  let userMessage = 'Text extraction failed. Please try again.';
  let severity = ErrorSeverity.MEDIUM;
  
  if (originalError?.message.includes('quota')) {
    userMessage = 'OCR quota exceeded. Please try again later.';
    severity = ErrorSeverity.HIGH;
  } else if (originalError?.message.includes('api key')) {
    userMessage = 'OCR service is not configured properly.';
    severity = ErrorSeverity.HIGH;
  }
  
  return createAppError(
    ErrorType.OCR,
    severity,
    message,
    userMessage,
    originalError,
    context
  );
};

export const createNetworkError = (
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): AppError => {
  let userMessage = 'Network error. Please check your connection and try again.';
  
  return createAppError(
    ErrorType.NETWORK,
    ErrorSeverity.MEDIUM,
    message,
    userMessage,
    originalError,
    context
  );
};

export const createValidationError = (
  message: string,
  userMessage: string,
  context?: Record<string, any>
): AppError => {
  return createAppError(
    ErrorType.VALIDATION,
    ErrorSeverity.LOW,
    message,
    userMessage,
    undefined,
    context
  );
};

// Error logging utility
export const logError = (error: AppError | Error, context?: Record<string, any>) => {
  if ('type' in error) {
    // It's an AppError
    console.error(`[${error.type}] ${error.severity}: ${error.message}`, {
      userMessage: error.userMessage,
      originalError: error.originalError,
      context: { ...error.context, ...context }
    });
  } else {
    // It's a regular Error
    console.error('Unhandled error:', error.message, {
      stack: error.stack,
      context
    });
  }
};

// Error handling utility for async operations
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  errorCreator: (message: string, originalError?: Error, context?: Record<string, any>) => AppError,
  context?: Record<string, any>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const appError = errorCreator(
      error instanceof Error ? error.message : 'Unknown error',
      error instanceof Error ? error : undefined,
      context
    );
    logError(appError);
    throw appError;
  }
};

// Get user-friendly error message
export const getUserErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'userMessage' in error) {
    return (error as AppError).userMessage;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};