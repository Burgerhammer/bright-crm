#!/bin/sh
set -e

# Ensure SQLite directory exists and is writable by the app user
mkdir -p /app/data
chown -R nextjs:nodejs /app/data

# Drop privileges
exec su-exec nextjs "$@"
