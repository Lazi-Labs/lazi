#!/bin/bash
# Run LAZI Restructure Database Migrations
# Creates caching tables for ServiceTitan data

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     LAZI RESTRUCTURE - DATABASE MIGRATIONS                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set"
  echo "Migrations require database connection"
  echo ""
  echo "To run migrations:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
  echo "  ./scripts/run-lazi-migrations.sh"
  echo ""
  exit 1
fi

echo "Database: $DATABASE_URL"
echo ""

MIGRATIONS_DIR="migrations"
MIGRATIONS=(
  "001_create_raw_schema.sql"
  "002_create_st_locations.sql"
  "003_create_st_jobs.sql"
  "004_create_st_appointments.sql"
  "005_create_st_technicians.sql"
)

SUCCESS=0
FAILED=0

for migration in "${MIGRATIONS[@]}"; do
  MIGRATION_PATH="$MIGRATIONS_DIR/$migration"
  
  if [ ! -f "$MIGRATION_PATH" ]; then
    echo "⚠️  Migration not found: $migration"
    continue
  fi
  
  echo "Running: $migration"
  
  if psql "$DATABASE_URL" -f "$MIGRATION_PATH" > /dev/null 2>&1; then
    echo "✅ $migration - SUCCESS"
    ((SUCCESS++))
  else
    echo "❌ $migration - FAILED"
    ((FAILED++))
  fi
  echo ""
done

echo "═══════════════════════════════════════════════════════════════"
echo "Migration Summary"
echo "═══════════════════════════════════════════════════════════════"
echo "Success: $SUCCESS"
echo "Failed:  $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All migrations completed successfully!"
  
  # Verify tables created
  echo ""
  echo "Verifying tables..."
  psql "$DATABASE_URL" -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'raw' ORDER BY tablename;" 2>/dev/null || echo "Could not verify tables"
  
  exit 0
else
  echo "❌ Some migrations failed"
  exit 1
fi
