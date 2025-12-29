# Docker Compose Configurations

This directory contains all Docker Compose configuration files for the LAZI platform.

## Files

### Main Configurations
- **docker-compose.yml** - Development environment configuration
- **docker-compose.production.yml** - Production environment configuration
- **docker-compose.traefik.yml** - Traefik reverse proxy configuration

## Usage

### Development
```bash
# From project root
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

### Production
```bash
# From project root
docker-compose -f infrastructure/docker/docker-compose.production.yml up -d
```

### With Traefik
```bash
# From project root
docker-compose -f infrastructure/docker/docker-compose.traefik.yml up -d
```

## Services Included

### Development (docker-compose.yml)
- PostgreSQL (Supabase)
- Redis
- Temporal
- Grafana
- Prometheus
- Metabase

### Production (docker-compose.production.yml)
- All development services
- Production-optimized configurations
- Environment-specific settings

### Traefik (docker-compose.traefik.yml)
- Traefik reverse proxy
- SSL/TLS termination
- Load balancing
- Automatic service discovery

## Environment Variables

Ensure you have the appropriate `.env` file in the project root:
- `.env` for development
- `.env.production` for production

See `.env.example` in the project root for required variables.

## Related Documentation

- [Deployment Guides](../../docs/deployment/)
- [Setup Documentation](../../docs/setup/)
- [Infrastructure Documentation](../../docs/infrastructure/)
