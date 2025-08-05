// Supabase Configuration
// Replace these with your actual Supabase project credentials
// You can find these in your Supabase dashboard under Settings > API

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Google Cloud Vision API Configuration
// Replace with your actual Google Cloud Vision API key
// You can get this from Google Cloud Console > APIs & Services > Credentials
export const GOOGLE_CLOUD_VISION_API_KEY = "your-google-cloud-vision-api-key";

// Instructions:
// 1. Go to https://supabase.com and create a new project
// 2. Navigate to Settings > API in your Supabase dashboard
// 3. Copy your Project URL and replace SUPABASE_URL above
// 4. Copy your anon/public key and replace SUPABASE_ANON_KEY above
// 5. Run the SQL schema from supabase/schema.sql in your Supabase SQL Editor
// 6. Go to Google Cloud Console and enable the Vision API
// 7. Create an API key and replace GOOGLE_CLOUD_VISION_API_KEY above

// Note: In a production app, you should use environment variables
// or a secure configuration management system to store these values