#!/bin/bash
# Ralph Wrapper Script

# Change to project root
dir=$(dirname "$0")
cd "$dir/../.." || exit

# Run Ralph with tsx
npx tsx scripts/ralph/ralph.ts "$@"
