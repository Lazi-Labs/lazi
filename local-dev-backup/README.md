# LAZI CRM - Local Development Backup Package

This folder contains everything you need to migrate your LAZI CRM from production to local development.

## 📦 Package Contents

| File | Purpose |
|------|---------|
| `README.md` | This file - overview and quick start |
| `LOCAL_DEVELOPMENT_SETUP.md` | Comprehensive migration guide with detailed instructions |
| `QUICK_CHECKLIST.md` | One-page quick reference for common tasks |
| `docker-compose.local.yml` | Docker configuration for local Redis and optional services |
| `preflight-check.sh` | Pre-migration diagnostic script |
| `convert-env.sh` | Automated environment variable converter |
| `env.local.template` | Template for local environment variables |

## 🚀 Quick Start (5 Minutes)

### 1. Run Pre-Flight Check
```bash
cd local-dev-backup
chmod +x preflight-check.sh
./preflight-check.sh
```

Review the output for any critical issues before proceeding.

### 2. Convert Environment Variables
```bash
chmod +x convert-env.sh
./convert-env.sh ../.env
```

This creates `.env.local` in your project root with localhost configurations.

### 3. Start Local Services
```bash
cd ..
docker-compose -f docker-compose.local.yml up -d redis
```

### 4. Install Dependencies & Start Development
```bash
pnpm install
pnpm dev
```

### 5. Verify Everything Works
```bash
# Check web app
curl http://localhost:3000

# Check API
curl http://localhost:3001/api/health

# Check Redis
redis-cli ping
```

## 📚 Documentation Overview

### For First-Time Setup
Start with **`LOCAL_DEVELOPMENT_SETUP.md`** - it contains:
- Pre-migration checklist
- GitHub repository change options
- Detailed environment variable explanations
- ServiceTitan API considerations
- Troubleshooting for common issues
- Complete step-by-step migration commands

### For Daily Development
Use **`QUICK_CHECKLIST.md`** - it provides:
- Quick reference commands
- Environment variable change table
- Common issue quick fixes
- Testing checklist
- Daily workflow commands

## 🔧 File Descriptions

### `LOCAL_DEVELOPMENT_SETUP.md`
**Comprehensive setup guide** covering every aspect of the migration:
- What changes and what stays the same
- Architecture differences (Traefik → localhost)
- Environment variable mapping
- ServiceTitan OAuth callback updates
- Troubleshooting 8 common issues
- Success checklist

**When to use:** First-time setup, troubleshooting complex issues, understanding the architecture.

### `QUICK_CHECKLIST.md`
**One-page quick reference** for experienced developers:
- 5-minute quick start
- Command cheat sheet
- Common fixes
- Testing checklist

**When to use:** Daily development, quick reference, common issues.

### `docker-compose.local.yml`
**Local services configuration** including:
- Redis (required for BullMQ/queues)
- Redis Commander (optional, for queue visualization)
- Temporal (optional, if using workflow engine)
- PostgreSQL (optional, if not using Supabase)
- Mailhog (optional, for email testing)

**When to use:** Starting local services, adding new infrastructure components.

### `preflight-check.sh`
**Diagnostic script** that checks for:
- Hardcoded production URLs
- Environment variable usage
- Traefik configuration
- CORS settings
- Socket.io configuration
- Git status
- Port availability
- Dependencies

**When to use:** Before migration, troubleshooting, verifying setup.

### `convert-env.sh`
**Automated converter** that:
- Reads your production `.env`
- Converts URLs to localhost
- Keeps production credentials (Supabase, ServiceTitan, AWS, etc.)
- Skips Traefik/SSL variables
- Shows what changed vs. what stayed the same

**When to use:** Initial setup, updating environment variables.

### `env.local.template`
**Template file** with:
- All common environment variables
- Inline documentation
- Placeholder values
- Optional variables commented out

**When to use:** Manual environment setup, reference for required variables.

## 📋 Order of Operations

Follow this sequence for a smooth migration:

```
1. Backup current setup
   ├─ Copy .env to safe location
   ├─ Create git backup branch
   └─ Document current configuration

2. Run preflight check
   ├─ ./preflight-check.sh
   ├─ Review warnings and failures
   └─ Fix critical issues

3. Convert environment
   ├─ ./convert-env.sh ../.env
   ├─ Review generated .env.local
   └─ Add any missing variables

4. Update Git remote (choose one)
   ├─ Option A: New repository
   ├─ Option B: New branch (recommended)
   └─ Option C: Fork

5. Start local services
   ├─ docker-compose -f docker-compose.local.yml up -d
   └─ Verify Redis is running

6. Install & start development
   ├─ pnpm install
   └─ pnpm dev

7. Test & verify
   ├─ Check web app loads
   ├─ Verify API responds
   ├─ Test authentication
   ├─ Check WebSocket connection
   └─ Test ServiceTitan integration
```

## ⚠️ Important Notes

### What Changes
- **Redis URL**: Production → `redis://localhost:6379`
- **API URLs**: Production domains → `http://localhost:3000/3001`
- **CORS Origins**: Production domains → localhost
- **Node Environment**: `production` → `development`
- **Traefik**: Removed (direct port access)

### What Stays the Same
- **Database**: Same Supabase connection (no changes needed!)
- **ServiceTitan API**: Same credentials (server-side calls work)
- **AWS S3**: Same credentials
- **Twilio**: Same credentials
- **Resend**: Same API key
- **All other third-party services**: Same credentials

### Critical Actions Required
1. **ServiceTitan OAuth**: Update callback URLs in ServiceTitan Developer Portal
   - Add: `http://localhost:3000/api/servicetitan/oauth-callback`
   - Keep production URL as well

2. **Plaid OAuth** (if used): Update redirect URI
   - Add: `http://localhost:3000/api/plaid/oauth-redirect`

3. **S3 CORS** (if using): Add localhost to allowed origins

## 🐛 Troubleshooting

### Quick Fixes

**CORS Errors:**
```bash
# Verify CORS_ORIGINS in .env.local
grep CORS_ORIGINS .env.local
# Should be: http://localhost:3000,http://127.0.0.1:3000
```

**Redis Connection Failed:**
```bash
docker-compose -f docker-compose.local.yml up -d redis
redis-cli ping  # Should return: PONG
```

**Port Already in Use:**
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Kill it
```

**Environment Variables Not Loading:**
```bash
# Restart dev server
pkill -f "next dev"
pnpm dev
```

### Need More Help?
- Check `LOCAL_DEVELOPMENT_SETUP.md` → "Potential Issues & Solutions"
- Check `QUICK_CHECKLIST.md` → "Common Issues Quick Fixes"
- Review `preflight-report.txt` if you ran the preflight check

## ✅ Success Indicators

You're ready to develop when:
- ✅ Web app loads at http://localhost:3000
- ✅ API responds at http://localhost:3001
- ✅ No CORS errors in browser console
- ✅ WebSocket connects successfully
- ✅ Can log in and authenticate
- ✅ ServiceTitan API calls work
- ✅ Background jobs process in Redis
- ✅ No red errors in terminal

## 🎯 Next Steps After Setup

1. **Test thoroughly** - Use the app as you would in production
2. **Create a branch** - Keep local config separate: `git checkout -b local-development`
3. **Document custom changes** - Note any project-specific modifications
4. **Set up CI/CD** - Configure GitHub Actions for local testing
5. **Share with team** - Help teammates migrate using this package

## 📞 Support Resources

### Documentation
- `LOCAL_DEVELOPMENT_SETUP.md` - Full guide
- `QUICK_CHECKLIST.md` - Quick reference

### Scripts
- `preflight-check.sh` - Diagnostic tool
- `convert-env.sh` - Environment converter

### Configuration
- `docker-compose.local.yml` - Local services
- `env.local.template` - Environment template

## 🔒 Security Reminders

- ⚠️ **Never commit `.env.local` to version control**
- ⚠️ Keep production credentials secure
- ⚠️ Use sandbox/test modes for third-party services when possible
- ⚠️ Don't share environment files publicly
- ⚠️ Rotate credentials if accidentally exposed

## 📦 Downloading This Package

To download this entire folder:

```bash
# Option 1: Zip the folder
zip -r local-dev-backup.zip local-dev-backup/

# Option 2: Tar the folder
tar -czf local-dev-backup.tar.gz local-dev-backup/

# Option 3: Copy to another location
cp -r local-dev-backup ~/Desktop/lazi-local-dev-backup
```

## 🤝 Contributing

If you find issues or improvements:
1. Document the problem and solution
2. Update the relevant markdown file
3. Share with the team

## 📝 Version History

- **v1.0.0** (December 2024) - Initial release
  - Complete migration documentation
  - Automated conversion scripts
  - Pre-flight diagnostic tool
  - Docker configuration for local services

---

**Ready to migrate?** Start with the [Quick Start](#-quick-start-5-minutes) above or dive into `LOCAL_DEVELOPMENT_SETUP.md` for the full guide.

**Questions?** Check the troubleshooting sections in `LOCAL_DEVELOPMENT_SETUP.md` and `QUICK_CHECKLIST.md`.

**Good luck with your local development setup! 🚀**
