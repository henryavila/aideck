#!/bin/bash
# PostToolUse hook: validates .atomic-skills/ files after Write/Edit.
# Primary: probes running aiDeck API (~100ms).
# Fallback: runs offline tsx validator when aiDeck is not running.

set -euo pipefail

# ── Fast filter: skip files outside .atomic-skills/ ──────────────────────────
FP=""
if [ -n "${TOOL_INPUT:-}" ]; then
  FP=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)
fi
if [ -z "$FP" ]; then
  exit 0
fi
case "$FP" in
  */.atomic-skills/plans/*.md|*/.atomic-skills/initiatives/*.md) ;;
  *) exit 0 ;;
esac
case "$FP" in */archive/*) exit 0 ;; esac

# ── Determine project root ───────────────────────────────────────────────────
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
[ -d "${PROJECT_ROOT}/.atomic-skills/plans" ] || [ -d "${PROJECT_ROOT}/.atomic-skills/initiatives" ] || exit 0

PROJECT_ID=$(basename "$PROJECT_ROOT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')

# ── Primary: aiDeck API ──────────────────────────────────────────────────────
RESPONSE=$(curl -s --max-time 2 "http://127.0.0.1:7777/api/projects/${PROJECT_ID}/state/project-status" 2>/dev/null) || true

if [ -n "$RESPONSE" ]; then
  ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // empty' 2>/dev/null)
  if [ -n "$ERROR_MSG" ]; then
    ERROR_PATH=$(echo "$RESPONSE" | jq -r '.error.details.path // empty' 2>/dev/null)
    SUGGESTION=$(echo "$RESPONSE" | jq -r '.error.suggestion // empty' 2>/dev/null)
    SLUG=$(echo "$RESPONSE" | jq -r '.error.details.slug // empty' 2>/dev/null)
    echo "⚠ .atomic-skills/ VALIDATION ERROR${SLUG:+ in ${SLUG}}:"
    echo "  File: ${ERROR_PATH}"
    echo "  Error: ${ERROR_MSG}"
    [ -n "$SUGGESTION" ] && echo "  Fix: ${SUGGESTION}"
    exit 2
  fi
  # API responded with no error — valid
  exit 0
fi

# ── Fallback: offline validation ─────────────────────────────────────────────
VALIDATE_SCRIPT="${PROJECT_ROOT}/scripts/validate-state.ts"
if [ -f "$VALIDATE_SCRIPT" ]; then
  exec npx --yes tsx "$VALIDATE_SCRIPT" --file "${FP:-}" 2>&1
fi

exit 0
