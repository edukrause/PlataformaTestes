#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
cd frontend
npm ci --prefer-offline
npm run lint
VITE_API=http GITHUB_PAGES= npm run build
cd ../backend
mvn -B -ntp clean verify
printf '%s\n' 'Executável: backend/target/plataforma-testes-0.1.0-SNAPSHOT.jar'
