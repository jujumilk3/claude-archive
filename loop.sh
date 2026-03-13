#!/bin/bash
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

# Parse arguments
if [ "$1" = "plan" ]; then
    # Plan mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    # Build mode with max iterations
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    # Build mode, unlimited (no arguments or invalid input)
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

# Setup output recording
RECORDS_DIR="ralph-working-records"
mkdir -p "$RECORDS_DIR"
if [ ! -f "$RECORDS_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$RECORDS_DIR/.gitignore"
fi
RECORD_FILE="$RECORDS_DIR/$(date '+%Y-%m-%d-%H%M%S')-$MODE.jsonl"
echo "Record: $RECORD_FILE"

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Structured output for logging/monitoring
    # --model opus: Primary agent uses Opus for complex reasoning (task selection, prioritization)
    #               Can use 'sonnet' in build mode for speed if plan is clear and tasks well-defined
    # --verbose: Detailed execution logging
    OUTPUT=$(cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose 2>&1)
    
    echo "$OUTPUT"
    echo "$OUTPUT" >> "$RECORD_FILE"

    # Check for rate limit error
    if echo "$OUTPUT" | grep -q '"error":"rate_limit"'; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚠️  Rate limit detected!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Run fallback script once if it exists
        FALLBACK_SCRIPT="./loop_fallback.sh"
        if [ -f "$FALLBACK_SCRIPT" ]; then
            echo "Running fallback script: $FALLBACK_SCRIPT"
            bash "$FALLBACK_SCRIPT"
        else
            echo "No fallback script found at $FALLBACK_SCRIPT"
        fi
        
        # Wait 5 minutes before retrying
        echo "Waiting 5 minutes before retry..."
        sleep 300
        echo "Resuming..."
        continue
    fi

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" || {
        echo "Failed to push. Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    ITERATION=$((ITERATION + 1))
    LOOP_HEADER="======================== LOOP $ITERATION ($(date '+%Y-%m-%d %H:%M:%S')) ========================"
    echo -e "\n\n$LOOP_HEADER\n"
    echo -e "\n\n$LOOP_HEADER\n" >> "$RECORD_FILE"
done

echo ""
echo "Record saved: $RECORD_FILE"