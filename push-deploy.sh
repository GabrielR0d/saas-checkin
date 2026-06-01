#!/bin/bash
# Run this once to push the Railway deployment setup to GitHub
# Then delete it: rm push-deploy.sh
set -e

cd "$(dirname "$0")"

echo "=== Files changed ==="
git add backend/railway.toml backend/Dockerfile backend/.env.example backend/Dockerfile \
        frontend/.env.example .gitignore README.md

git status --short

echo ""
echo "=== Committing ==="
git commit -m "chore: add Railway config, Dockerfile, env examples, README"

echo ""
echo "=== Pushing ==="
git push https://REDACTED_TOKEN@github.com/GabrielR0d/saas-checkin.git main

echo ""
echo "=== Done! Latest commit ==="
git log --oneline -1

# Self-destruct (token was in here — clean it up)
rm -- "$0"
echo "Script removed."
