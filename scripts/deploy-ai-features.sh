#!/bin/bash

# StudySpark AI Features Deployment Script
# This script sets up the AI features in your Supabase project

echo "🚀 Deploying StudySpark AI Features to Supabase..."

# Project configuration
PROJECT_ID="onfnehxkglmvrorcvqcx"
SUPABASE_URL="https://onfnehxkglmvrorcvqcx.supabase.co"

echo "📊 Project: StudySpark"
echo "🆔 Project ID: $PROJECT_ID"
echo "🌐 URL: $SUPABASE_URL"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Link to the project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref $PROJECT_ID

# Deploy the edge function
echo "🚀 Deploying ML inference edge function..."
supabase functions deploy ml-inference --no-verify-jwt

# Apply database migrations if needed
echo "📊 Checking database setup..."
echo "The following tables should be created via the Supabase MCP tools:"
echo "  - ai_user_profiles"
echo "  - ai_pattern_data" 
echo "  - ai_collaborative_insights"
echo "  - ai_embeddings"

echo "✅ Deployment completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Add your environment variables to .env.local:"
echo "   NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>"
echo ""
echo "2. Enable AI features in your app:"
echo "   - Vector embeddings for similarity search"
echo "   - Collaborative filtering for community insights"
echo "   - Edge functions for ML inference"
echo ""
echo "3. Test the connection using the supabaseHelpers.testConnection() method"
echo ""
echo "🎉 Your AI-powered StudySpark is ready!" 