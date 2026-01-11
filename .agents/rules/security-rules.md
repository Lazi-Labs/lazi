# LAZI Security Rules

## Authentication

### JWT Tokens
- Access tokens expire in 15 minutes
- Refresh tokens stored in httpOnly cookies
- Never expose tokens in URLs or logs

### Token Handling
```javascript
// Frontend - Store in memory or localStorage
localStorage.setItem('token', accessToken);

// API calls - Include in Authorization header
headers: {
    'Authorization': `Bearer ${token}`
}

// Backend - Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### Password Rules
- Minimum 8 characters
- Hash with bcrypt (cost factor 12)
- Never log or store plaintext passwords

---

## Authorization

### Role-Based Access
```javascript
// Middleware
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

// Usage
router.delete('/:id', authenticate, requireRole('admin'), handler);
```

### Tenant Isolation
```javascript
// Always filter by tenant
const tenantId = getTenantId(req);
const result = await pool.query(
    'SELECT * FROM master.pricebook_materials WHERE tenant_id = $1',
    [tenantId]
);

// Never trust client-provided tenant ID for sensitive operations
```

---

## Input Validation

### SQL Injection Prevention
```javascript
// ALWAYS use parameterized queries
const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
);

// NEVER use string interpolation
// BAD: `SELECT * FROM users WHERE email = '${email}'`
```

### XSS Prevention
```javascript
// React automatically escapes
<div>{userInput}</div>  // Safe

// Avoid dangerouslySetInnerHTML
// If needed, sanitize first
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

### Request Validation
```javascript
// Validate all inputs
import { z } from 'zod';

const schema = z.object({
    name: z.string().min(1).max(255),
    price: z.number().min(0),
    email: z.string().email(),
});

const validated = schema.parse(req.body);
```

---

## Secrets Management

### Environment Variables
```bash
# Required secrets (never commit)
JWT_SECRET=<32+ character random string>
DATABASE_URL=<connection string>
SERVICE_TITAN_CLIENT_SECRET=<api secret>
```

### Rules
1. **Never commit secrets** to git
2. **Use .env.example** with placeholder values
3. **Rotate secrets** periodically
4. **Use different secrets** per environment

### Checking for Leaks
```bash
# Search for potential secrets
grep -r "password\|secret\|key\|token" --include="*.js" --include="*.ts" .
```

---

## API Security

### Rate Limiting
```javascript
// Applied globally
app.use(rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100,             // 100 requests per window
}));
```

### CORS
```javascript
// Production - specific origins only
app.use(cors({
    origin: ['https://lazilabs.com', 'https://www.lazilabs.com'],
    credentials: true,
}));

// Development - allow localhost
app.use(cors({
    origin: true,
    credentials: true,
}));
```

### Headers
```javascript
// Security headers (via helmet)
app.use(helmet());

// Includes:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
```

---

## Data Protection

### Sensitive Data
- Never log passwords, tokens, or API keys
- Mask sensitive data in error messages
- Encrypt PII at rest if required

### Logging
```javascript
// WRONG - Logs sensitive data
console.log('User login:', { email, password });

// CORRECT - Redact sensitive fields
console.log('User login:', { email, password: '***' });
```

### Database
```sql
-- Use SSL in production
DATABASE_URL=postgresql://...?sslmode=require
```

---

## ServiceTitan API

### Credential Storage
```bash
# Store in environment, never in code
SERVICE_TITAN_CLIENT_ID=...
SERVICE_TITAN_CLIENT_SECRET=...
SERVICE_TITAN_APP_KEY=...
```

### Token Refresh
- Tokens expire after 1 hour
- Refresh 5 minutes before expiry
- Never expose tokens to frontend

---

## Security Checklist

### Before Deploy
- [ ] No secrets in code
- [ ] All inputs validated
- [ ] SQL queries parameterized
- [ ] Auth required on protected routes
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SSL/TLS enabled
- [ ] Security headers set

### Code Review
- [ ] Check for hardcoded secrets
- [ ] Verify input validation
- [ ] Check authorization logic
- [ ] Review SQL queries
- [ ] Check error messages don't leak info

---

## Incident Response

### If Secret Exposed
1. **Rotate immediately** - Generate new secret
2. **Revoke old secret** - Invalidate tokens
3. **Audit access** - Check for unauthorized use
4. **Update deployment** - Deploy with new secret

### If Breach Suspected
1. **Contain** - Disable affected accounts
2. **Investigate** - Check logs
3. **Notify** - Inform affected users
4. **Remediate** - Fix vulnerability

---

*Security rules - LAZI AI*
