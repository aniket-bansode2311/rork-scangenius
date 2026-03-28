# Supabase Database Setup

This directory contains the SQL schema and setup instructions for the ScanGenius app database.

## Setup Instructions

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be fully initialized

2. **Run the Schema**
   - Navigate to your Supabase dashboard
   - Go to the SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Click "Run" to execute the SQL

3. **Update Environment Variables**
   - In your Supabase dashboard, go to Settings > API
   - Copy your Project URL and anon/public key
   - Update `constants/config.ts` with your actual values:
     ```typescript
     export const SUPABASE_URL = "your-project-url";
     export const SUPABASE_ANON_KEY = "your-anon-key";
     ```

## Database Schema

### Tables

#### `profiles`
- `id` (UUID, Primary Key) - References `auth.users.id`
- `username` (TEXT, Unique) - User's chosen username
- `avatar_url` (TEXT) - URL to user's avatar image
- `created_at` (TIMESTAMP WITH TIME ZONE) - When the profile was created
- `updated_at` (TIMESTAMP WITH TIME ZONE) - When the profile was last updated

### Row Level Security (RLS) Policies

The following RLS policies are implemented:

1. **Users can view own profile** - Users can only SELECT their own profile data
2. **Users can insert own profile** - Users can only INSERT their own profile
3. **Users can update own profile** - Users can only UPDATE their own profile
4. **Users can delete own profile** - Users can only DELETE their own profile

### Triggers

1. **Auto-create profile** - Automatically creates a profile when a user signs up
2. **Auto-update timestamp** - Automatically updates the `updated_at` field when a profile is modified

## Security Features

- Row Level Security is enabled on all tables
- Users can only access their own data
- Automatic profile creation on user signup
- Secure function execution with `SECURITY DEFINER`

## Testing the Setup

After running the schema, you can test it by:

1. Creating a test user through your app's signup flow
2. Checking that a profile was automatically created in the `profiles` table
3. Verifying that RLS policies prevent users from accessing other users' data

## Troubleshooting

- If you get permission errors, ensure RLS policies are properly set up
- If profiles aren't being created automatically, check that the trigger is properly installed
- Make sure your Supabase project URL and keys are correctly configured in your app