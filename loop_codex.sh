#!/bin/bash
# Usage: ./loop_codex.sh [spark] [plan] [max_iterations]
# Examples:
#   ./loop_codex.sh              # Build mode, gpt-5.3-codex, unlimited
#   ./loop_codex.sh 20           # Build mode, gpt-5.3-codex, max 20
#   ./loop_codex.sh spark        # Build mode, gpt-5.3-codex-spark, unlimited
#   ./loop_codex.sh spark 10     # Build mode, gpt-5.3-codex-spark, max 10
#   ./loop_codex.sh plan         # Plan mode, gpt-5.3-codex, unlimited
#   ./loop_codex.sh plan 5       # Plan mode, gpt-5.3-codex, max 5
#   ./loop_codex.sh spark plan   # Plan mode, gpt-5.3-codex-spark, unlimited
#   ./loop_codex.sh spark plan 5 # Plan mode, gpt-5.3-codex-spark, max 5

# Parse model shortcut
MODEL="${CODEX_MODEL:-gpt-5.3-codex}"
if [ "$1" = "spark" ]; then
    MODEL="gpt-5.3-codex-spark"
    shift
fi

# Parse mode and iterations
if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi
ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Model:  $MODEL"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

RECORDS_DIR="ralph-working-records"
mkdir -p "$RECORDS_DIR"
if [ ! -f "$RECORDS_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$RECORDS_DIR/.gitignore"
fi
RECORD_FILE="$RECORDS_DIR/$(date '+%Y-%m-%d-%H%M%S')-codex-$MODE.jsonl"
echo "Record: $RECORD_FILE"

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # Run Codex iteration with selected prompt
    # exec: Non-interactive mode (reads prompt from stdin)
    # --dangerously-bypass-approvals-and-sandbox: Auto-approve all tool calls (YOLO mode)
    # --json: Structured JSONL output for logging/monitoring
    # --model: gpt-5.3-codex by default (override with CODEX_MODEL env var)
    OUTPUT=$(cat "$PROMPT_FILE" | codex exec \
        --dangerously-bypass-approvals-and-sandbox \
        --json \
        --model "$MODEL" 2>&1)

    echo "$OUTPUT"
    echo "$OUTPUT" >> "$RECORD_FILE"

    # Check for rate limit error
    if echo "$OUTPUT" | grep -qi 'rate.limit\|429\|too many requests'; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚠️  Rate limit detected!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        FALLBACK_SCRIPT="./loop_fallback.sh"
        if [ -f "$FALLBACK_SCRIPT" ]; then
            echo "Running fallback script: $FALLBACK_SCRIPT"
            bash "$FALLBACK_SCRIPT"
        else
            echo "No fallback script found at $FALLBACK_SCRIPT"
        fi

        echo "Waiting 5 minutes before retry..."
        sleep 300
        echo "Resuming..."
        continue
    fi

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
