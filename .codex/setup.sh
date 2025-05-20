#!/bin/bash
# Setup script to install dependencies for the Codex environment.
# Run using bash .codex/setup.sh

set -e

# Install Node.js dependencies without modifying package-lock
npm ci

