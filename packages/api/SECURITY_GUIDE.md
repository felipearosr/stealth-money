# Security Implementation Guide

This document outlines the comprehensive security features implemented in the Stealth Money API to ensure production-ready security.

## Security Features Overview

### 1. Rate Limiting
- **General Rate Limit**: 100 requests per 15 minutes per IP
- **Strict Rate Limit**: 10 requests per 15 minutes for sensitive endpoints
- **Transfer Creation Limit**: 3 transfer creations per minute per IP
- **Speed Limiter**: Progressive delays after 50 requests

### 2. Input Validation & Sanitization
- **Zod Schema Validation**: Type-safe validation for all inputs
- **Express Validator**: Additional validation layer
- **Input Sanitization**: Removes XSS attempts and malicious scripts
- **Parameter Validation**: Strict validation for all route parameters

### 3. CORS Configuration
- **Production CORS**: Configurable allowed origins
- **Development Mode**: Permissive for local development
- **Credential Support**: Secure cookie handling
- **Method Restrictions**: Only allowed HTTP methods

### 4. Request Logging & Monitoring
- **Winston Logger**: Structured logging with rotation
- **Request Tracking**: Unique request IDs for tracing
- **Security Event Logging**: Detailed security event tracking
- **Error Logging**: Comprehensive error tracking with stack traces

### 5. API Key Authentication
- **Sensitive Endpoints**: Protected with API key authentication
- **Secure Comparison**: Timing-attack resistant key comparison
- **Development Override**: Disabled in development mode
- **Environment-based**: Configurable via environment variables

### 6. Enhanced Webhook Security
- **Signature Verification**: Improved Stripe webhook signature validation
- **Request Logging**: Detailed webhook request logging
- **Rate Limiting**: Strict rate limits on webhook endpoints
- **Error Handling**: Comprehensive error handling and logging

## Configuration

### Environment Variables

```bash
# Security Configuration
NODE_ENV=production
API_KEY=your_secure_api_key_here
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
LOG_LEVEL=info

# Rate Limiting (optional - uses defaults)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
TRANSFER_RATE_LIMIT_MAX=3
```

### Generating Secure API Key
```bash
# Generate a secure API key
openssl rand -hex 32
```

## Security Middleware Applied

### Endpoint Security Matrix

| Endpoint | Rate Limit | Validation | API Key | Logging |
|----------|------------|------------|---------|---------|
| `POST /transfers` | Transfer Limit | Full | No | Yes |
| `PUT /transfers/:id/recipient` | Transfer Limit | Full | No | Yes |
| `GET /transfers/:id` | General | ID Only | No | Yes |
| `POST /test-orchestrator` | Strict | No | Yes | Yes |
| `POST /webhooks/stripe` | Strict | Signature | No | Yes |
| `GET /blockchain/*` | General | No | No | Yes |
| `GET /exchange-rate/:from/:to` | General | Params | No | Yes |

### Security Headers (Helmet)
- Content Security Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: no-referrer
- X-Download-Options: noopen
- X-DNS-Prefetch-Control: off

## Logging & Monitoring

### Log Files
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only
- Log rotation: 5MB max size, 5 files retained

### Log Levels
- **Error**: System errors, security violations
- **Warn**: Security events, unusual activity
- **Info**: Normal operations, transactions
- **Debug**: Detailed debugging information

### Security Events Logged
- Failed authentication attempts
- Rate limit violations
- Invalid webhook signatures
- Malformed requests
- Suspicious activity patterns

## Production Deployment Checklist

### Required Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `API_KEY` - Secure random string
- [ ] `ALLOWED_ORIGINS` - Your domain(s)
- [ ] `DATABASE_URL` - Production database
- [ ] `STRIPE_SECRET_KEY` - Production Stripe key
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret

### Security Hardening
- [ ] Enable HTTPS/TLS
- [ ] Configure reverse proxy (nginx/CloudFlare)
- [ ] Set up log monitoring/alerting
- [ ] Configure firewall rules
- [ ] Enable database SSL
- [ ] Set up backup systems

### Monitoring Setup
- [ ] Log aggregation (ELK stack, Splunk, etc.)
- [ ] Error tracking (Sentry, Bugsnag, etc.)
- [ ] Performance monitoring (New Relic, DataDog, etc.)
- [ ] Security monitoring (fail2ban, etc.)

## Security Best Practices

### API Key Management
- Generate strong, random API keys
- Rotate keys regularly
- Store keys securely (environment variables, secrets manager)
- Never commit keys to version control
- Use different keys for different environments

### Database Security
- Use connection pooling with limits
- Enable SSL/TLS for database connections
- Use parameterized queries (already implemented)
- Regular security updates
- Database access logging

### Network Security
- Use HTTPS everywhere
- Configure proper CORS policies
- Implement IP whitelisting for sensitive endpoints
- Use Web Application Firewall (WAF)
- Regular security scans

### Monitoring & Alerting
- Monitor failed authentication attempts
- Alert on unusual traffic patterns
- Track error rates and response times
- Monitor resource usage
- Set up security event alerts

## Testing Security Features

### Rate Limiting Test
```bash
# Test general rate limit
for i in {1..105}; do curl http://localhost:4000/health; done

# Test transfer creation limit
for i in {1..5}; do 
  curl -X POST http://localhost:4000/api/transfers \
    -H "Content-Type: application/json" \
    -d '{"amount":100,"sourceCurrency":"USD","destCurrency":"EUR"}'
done
```

### Input Validation Test
```bash
# Test invalid input
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount":"invalid","sourceCurrency":"INVALID"}'
```

### API Key Test
```bash
# Test without API key (should fail)
curl -X POST http://localhost:4000/api/test-orchestrator

# Test with API key (should succeed)
curl -X POST http://localhost:4000/api/test-orchestrator \
  -H "x-api-key: your_api_key_here"
```

## Security Incident Response

### Immediate Actions
1. Identify the scope of the incident
2. Isolate affected systems
3. Preserve logs and evidence
4. Notify stakeholders
5. Implement temporary mitigations

### Investigation Steps
1. Analyze logs for attack patterns
2. Check for data breaches
3. Assess system integrity
4. Document findings
5. Implement permanent fixes

### Recovery Process
1. Apply security patches
2. Update configurations
3. Reset compromised credentials
4. Monitor for continued threats
5. Update security procedures

## Compliance Considerations

### Data Protection
- PII encryption at rest and in transit
- Data retention policies
- Right to deletion (GDPR)
- Access logging and auditing

### Financial Regulations
- PCI DSS compliance for payment data
- Anti-money laundering (AML) checks
- Know Your Customer (KYC) requirements
- Transaction monitoring and reporting

### Security Standards
- OWASP Top 10 mitigation
- Regular security assessments
- Penetration testing
- Vulnerability management

## Support & Maintenance

### Regular Tasks
- Review and rotate API keys
- Update security dependencies
- Monitor security logs
- Test backup and recovery procedures
- Update security documentation

### Security Updates
- Monitor security advisories
- Apply patches promptly
- Test updates in staging
- Document changes
- Communicate with stakeholders

For additional security questions or incident reporting, contact the security team.