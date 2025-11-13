#!/bin/bash
# Fetch latest architecture decisions from mlehaptics embedded repo
# This ensures we always have the complete, current version locally

set -e

DOCS_DIR="docs/external"
REPO_URL="https://raw.githubusercontent.com/lemonforest/mlehaptics/main/docs/architecture_decisions.md"
OUTPUT_FILE="$DOCS_DIR/architecture_decisions.md"

echo "Fetching latest architecture decisions from mlehaptics repo..."
echo "Source: $REPO_URL"

# Create directory if it doesn't exist
mkdir -p "$DOCS_DIR"

# Fetch the file using curl (follows redirects, shows progress)
if curl -L -f -o "$OUTPUT_FILE" "$REPO_URL"; then
    echo "✓ Successfully fetched architecture_decisions.md"
    echo "✓ Saved to: $OUTPUT_FILE"

    # Show file stats
    FILE_SIZE=$(wc -c < "$OUTPUT_FILE")
    LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
    echo "  Size: $FILE_SIZE bytes"
    echo "  Lines: $LINE_COUNT"

    # Try to find the highest AD number
    HIGHEST_AD=$(grep -o 'AD[0-9]\+' "$OUTPUT_FILE" | sed 's/AD//' | sort -n | tail -1)
    if [ -n "$HIGHEST_AD" ]; then
        echo "  Highest AD found: AD$HIGHEST_AD"
    fi

    exit 0
else
    echo "✗ Failed to fetch architecture_decisions.md"
    echo "  Check network connection and repo URL"
    exit 1
fi
