#!/bin/bash
# Setup script to install dependencies for the Codex environment.
# Run using: bash .codex/setup.sh

set -euo pipefail

echo "Installing Node.js dependencies..."
npm ci

echo "Installing Firebase CLI globally..."
npm install -g firebase-tools

echo "Setup complete"

