# 🚀 GitHub Actions Workflows

This directory contains comprehensive GitHub Actions workflows for automated CI/CD, testing, security, and maintenance.

## 📋 Workflow Overview

### 🧪 Continuous Integration
- **`ci.yml`** - Main CI workflow that runs on push/PR
  - Runs tests with PostgreSQL database
  - Performs linting and type checking
  - Generates test coverage reports
  - Builds the application

### 🔍 Pull Request Workflows
- **`pr-tests.yml`** - **REQUIRED** tests that must pass before merge
  - Blocks merge if any required tests fail
  - Runs comprehensive test suite
  - Generates coverage reports
  - Performs security checks
- **`pr-checks.yml`** - Additional PR validation
  - Validates PR title format
  - Checks PR size
  - Reviews dependency changes
  - Validates database schema changes

### 🚀 Deployment
- **`deploy.yml`** - Production deployment workflow
  - Builds and deploys to Vercel
  - Runs health checks
  - Supports manual deployment triggers

### 🔐 Security
- **`codeql.yml`** - CodeQL security analysis
- **`security.yml`** - Comprehensive security scanning
- **`dependency-review.yml`** - Dependency security review

### ⚡ Performance & Quality
- **`performance.yml`** - Performance testing
  - Lighthouse audits
  - Bundle size analysis
  - Load testing with K6

### 🔧 Maintenance
- **`maintenance.yml`** - Automated maintenance tasks
  - Dependency updates
  - Security patches
  - Cleanup tasks
- **`auto-merge.yml`** - Auto-merge for approved Dependabot PRs

## 🎯 Branch Protection Rules

To ensure code quality, set up these branch protection rules for `main`:

### Required Status Checks
- `Required Tests (Block Merge)` from `pr-tests.yml`
- `Type Check` from `ci.yml`
- `Analyze Code` from `codeql.yml`

### Required Settings
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Require linear history
- ✅ Include administrators

## 🔑 Required Secrets

Configure these secrets in your repository settings:

### 🚀 Deployment
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `DEPLOYMENT_URL` - Your application URL for health checks

### 📊 Monitoring & Analytics
- `CODECOV_TOKEN` - Codecov upload token
- `SNYK_TOKEN` - Snyk security scanning token

### 📢 Notifications
- `SLACK_WEBHOOK_URL` - Slack webhook for deployment notifications

## 🏷️ Labels Setup

Create these labels in your repository for proper workflow automation:

### Priority Labels
- `priority-high` (🔴 #FF0000)
- `priority-medium` (🟡 #FFFF00)
- `priority-low` (🟢 #00FF00)

### Type Labels
- `bug` (🐛 #FF0000)
- `feature` (✨ #00FF00)
- `documentation` (📚 #0000FF)
- `security` (🔐 #FF6600)

### Automation Labels
- `dependencies` (📦 #0366D6)
- `auto-merge` (🤖 #00FF00)
- `automated` (🔧 #808080)
- `maintenance` (🧹 #808080)

## 📈 Workflow Triggers

| Workflow | Push | PR | Schedule | Manual |
|----------|------|----|---------|---------| 
| CI | ✅ | ✅ | ❌ | ✅ |
| PR Tests | ❌ | ✅ | ❌ | ❌ |
| Deploy | ✅ (main) | ❌ | ❌ | ✅ |
| Security | ✅ (main) | ✅ | Weekly | ✅ |
| Performance | ✅ (main) | ✅ | Daily | ✅ |
| Maintenance | ❌ | ❌ | Weekly/Monthly | ✅ |

## 🎯 Success Criteria

### For Pull Requests
1. All tests pass (33 tests minimum)
2. Code coverage maintained
3. No security vulnerabilities
4. No linting/type errors
5. Build succeeds

### For Deployment
1. All CI checks pass
2. Health check succeeds
3. Performance metrics within bounds

## 🔧 Customization

### Environment Variables
Set these in your environment or `.env` files:

```bash
# Required for tests
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Optional providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Workflow Modifications
- Update branch names in workflows if using different naming
- Modify PostgreSQL version if needed
- Adjust test coverage thresholds
- Customize notification settings

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)