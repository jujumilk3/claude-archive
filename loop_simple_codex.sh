#!/bin/bash
# Loop Simple Codex - General purpose iterative AI loop using OpenAI Codex CLI
#
# Usage:
#   ./loop_simple_codex.sh "do something"              # Direct inline prompt
#   ./loop_simple_codex.sh -f prompt.md                # File-based prompt
#   ./loop_simple_codex.sh "do something" 20           # Max 20 iterations
#   ./loop_simple_codex.sh -f prompt.md 10             # Max 10 iterations
#
# Options:
#   -f FILE     Read prompt from file
#   -m MODEL    Model to use (default: gpt-5.3-codex)
#   -g          Enable git auto-commit and push after each iteration
#   --spark     Use gpt-5.3-codex-spark model
#   --help      Show this help message
#
# Examples:
#   ./loop_simple_codex.sh "Refactor all functions to use async/await"
#   ./loop_simple_codex.sh -f tasks.md 50
#   ./loop_simple_codex.sh -g "Add error handling to API calls" 10
#   ./loop_simple_codex.sh --spark "Quick lint fixes"

set -euo pipefail

PROMPT=""
PROMPT_FILE=""
MAX_ITERATIONS=0
MODEL="${CODEX_MODEL:-gpt-5.3-codex}"
GIT_ENABLED=false
ITERATION=0

show_help() {
    grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //g' | sed 's/^#//g'
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            ;;
        --spark)
            MODEL="gpt-5.3-codex-spark"
            shift
            ;;
        -f)
            PROMPT_FILE="$2"
            shift 2
            ;;
        -m)
            MODEL="$2"
            shift 2
            ;;
        -g)
            GIT_ENABLED=true
            shift
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            if [[ "$1" =~ ^[0-9]+$ ]]; then
                MAX_ITERATIONS=$1
            else
                PROMPT="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$PROMPT" ] && [ -z "$PROMPT_FILE" ]; then
    echo "Error: Either provide a prompt or use -f to specify a prompt file"
    echo "Use --help for usage information"
    exit 1
fi

if [ -n "$PROMPT_FILE" ] && [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: Prompt file not found: $PROMPT_FILE"
    exit 1
fi

if [ -n "$PROMPT" ] && [ -n "$PROMPT_FILE" ]; then
    echo "Error: Cannot use both inline prompt and file-based prompt"
    exit 1
fi

if [ "$GIT_ENABLED" = true ]; then
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "Error: Not in a git repository. Remove -g flag or initialize git."
        exit 1
    fi
    CURRENT_BRANCH=$(git branch --show-current)
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Loop Simple Codex - Ralph Loop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$PROMPT" ]; then
    echo "Prompt: \"${PROMPT:0:60}$([ ${#PROMPT} -gt 60 ] && echo '...')\""
else
    echo "File:   $PROMPT_FILE"
fi
echo "Model:  $MODEL"
[ "$GIT_ENABLED" = true ] && echo "Git:    Enabled (branch: $CURRENT_BRANCH)"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RECORDS_DIR="ralph-working-records"
mkdir -p "$RECORDS_DIR"
if [ ! -f "$RECORDS_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$RECORDS_DIR/.gitignore"
fi
RECORD_FILE="$RECORDS_DIR/$(date '+%Y-%m-%d-%H%M%S')-codex-simple.jsonl"
echo "Record: $RECORD_FILE"
echo ""

CODEX_FLAGS="--dangerously-bypass-approvals-and-sandbox --json --model $MODEL"

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Reached max iterations: $MAX_ITERATIONS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        break
    fi

    ITERATION=$((ITERATION + 1))
    echo ""
    ITER_HEADER="▶ Iteration $ITERATION - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "$ITER_HEADER"
    echo "$ITER_HEADER" >> "$RECORD_FILE"
    echo ""

    if [ -n "$PROMPT" ]; then
        OUTPUT=$(echo "$PROMPT" | codex exec $CODEX_FLAGS 2>&1)
    else
        OUTPUT=$(cat "$PROMPT_FILE" | codex exec $CODEX_FLAGS 2>&1)
    fi

    echo "$OUTPUT"
    echo "$OUTPUT" >> "$RECORD_FILE"

    if echo "$OUTPUT" | grep -qi 'rate.limit\|429\|too many requests'; then
        echo ""
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

    if echo "$OUTPUT" | grep -qiE '(task.*complete|all.*done|nothing.*left|no.*remaining|finished.*successfully)'; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✓ Detected completion signal in output"
        echo "  Loop completed after $ITERATION iteration(s)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        break
    fi

    if [ "$GIT_ENABLED" = true ]; then
        if ! git diff-index --quiet HEAD 2>/dev/null; then
            echo ""
            echo "→ Committing changes..."
            git add -A
            git commit -m "Loop iteration $ITERATION: $(date '+%Y-%m-%d %H:%M:%S')" || true

            echo "→ Pushing to remote..."
            git push origin "$CURRENT_BRANCH" || {
                echo "→ Creating remote branch..."
                git push -u origin "$CURRENT_BRANCH"
            }
        else
            echo ""
            echo "→ No changes to commit"
        fi
    fi

    sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Loop ended after $ITERATION iteration(s)"
echo "Record: $RECORD_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
