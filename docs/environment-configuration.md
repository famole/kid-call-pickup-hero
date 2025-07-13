# Environment Configuration Guide

This project uses an environment-aware configuration system to automatically switch between different Supabase instances based on your deployment environment.

## How It Works

The system automatically detects the environment based on:
- **Domain/URL patterns** (for web deployments)
- **GitHub branch context** (for CI/CD)
- **Environment variables** (for manual override)

## Environment Detection Rules

### Production Environment
Triggers when:
- Domain contains your production domain
- Domain matches `main--your-project.lovable.app`
- `GITHUB_REF` equals `refs/heads/main`
- `NODE_ENV` equals `production`

### Development Environment  
Triggers when:
- Domain contains `preview--` (Lovable preview deployments)
- Domain contains `localhost` (local development)
- Domain contains `dev-` or `staging-`
- Any other case (default fallback)

## Setup Instructions

### 1. Update Production Credentials
The production credentials are already set in `src/config/environment.ts`. These should match your main Supabase project.

### 2. Add Development Credentials
In `src/config/environment.ts`, replace the development configuration:

```typescript
development: {
  url: 'https://your-dev-branch-ref.supabase.co',
  anonKey: 'your-development-anon-key'
}
```

### 3. Customize Domain Detection
Update the domain detection logic in `detectEnvironment()` to match your actual domains:

```typescript
// Production detection
if (hostname.includes('your-actual-domain.com') || 
    hostname.includes('main--your-project.lovable.app')) {
  return 'production';
}
```

## Getting Your Supabase Branch Credentials

1. Go to your Supabase dashboard
2. Navigate to your branch/preview environment
3. Go to Settings → API
4. Copy the Project URL and anon/public key
5. Update the development configuration in `environment.ts`

## Manual Environment Override

### For Mobile/Expo
Set environment variables in your development environment:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
```

### For Web
The web version will automatically use the configuration based on domain detection.

## Testing

You can check which environment is being used by:
1. Opening browser console
2. Looking for log messages: `[Environment] Detected: production/development`

## GitHub Actions Integration

If you're using GitHub Actions for deployment, the system will automatically:
- Use production config when deploying from `main` branch
- Use development config for feature branches and preview deployments

## Adding New Environments

To add a new environment (e.g., staging):

1. Add it to the `environments` object in `environment.ts`
2. Update the `detectEnvironment()` function to include detection logic
3. Update the return type to include the new environment name

Example:
```typescript
const environments = {
  production: { /* ... */ },
  staging: { 
    url: 'https://staging-ref.supabase.co',
    anonKey: 'staging-anon-key'
  },
  development: { /* ... */ }
} as const;
```