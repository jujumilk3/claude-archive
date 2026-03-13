#!/bin/bash
# Loop Simple - General purpose iterative AI loop
#
# Usage:
#   ./loop_simple.sh "do something"              # Direct inline prompt
#   ./loop_simple.sh -f prompt.md                # File-based prompt
#   ./loop_simple.sh "do something" 20           # Max 20 iterations
#   ./loop_simple.sh -f prompt.md 10             # Max 10 iterations
#
# Options:
#   -f FILE     Read prompt from file
#   -m MODEL    Model to use (opus|sonnet|haiku, default: sonnet)
#   -g          Enable git auto-commit and push after each iteration
#   --help      Show this help message
#
# Examples:
#   ./loop_simple.sh "Refactor all functions to use async/await"
#   ./loop_simple.sh -f tasks.md 50
#   ./loop_simple.sh -g "Add error handling to API calls" 10

set -euo pipefail

# Default values
PROMPT=""
PROMPT_FILE=""
MAX_ITERATIONS=0
MODEL="sonnet"
GIT_ENABLED=false
ITERATION=0

# Parse arguments
show_help() {
    grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# //g' | sed 's/^#//g'
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
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
            # If it's a number, it's max iterations
            if [[ "$1" =~ ^[0-9]+$ ]]; then
                MAX_ITERATIONS=$1
            else
                # Otherwise it's the prompt
                PROMPT="$1"
            fi
            shift
            ;;
    esac
done

# Validate inputs
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

# Validate model
case $MODEL in
    opus|sonnet|haiku)
        ;;
    *)
        echo "Error: Invalid model '$MODEL'. Use opus, sonnet, or haiku"
        exit 1
        ;;
esac

# Get current branch if git is enabled
if [ "$GIT_ENABLED" = true ]; then
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "Error: Not in a git repository. Remove -g flag or initialize git."
        exit 1
    fi
    CURRENT_BRANCH=$(git branch --show-current)
fi

# Display configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Loop Simple - Ralph Loop"
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

# Setup output recording
RECORDS_DIR="ralph-working-records"
mkdir -p "$RECORDS_DIR"
if [ ! -f "$RECORDS_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$RECORDS_DIR/.gitignore"
fi
RECORD_FILE="$RECORDS_DIR/$(date '+%Y-%m-%d-%H%M%S')-simple.jsonl"
echo "Record: $RECORD_FILE"
echo ""

# Prepare Claude CLI flags
# Note: --verbose is required when using --output-format=stream-json
CLAUDE_FLAGS="-p --dangerously-skip-permissions --output-format=stream-json --model $MODEL --verbose"

# Main loop
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

    # Run Claude with prompt
    if [ -n "$PROMPT" ]; then
        OUTPUT=$(echo "$PROMPT" | claude $CLAUDE_FLAGS 2>&1)
    else
        OUTPUT=$(cat "$PROMPT_FILE" | claude $CLAUDE_FLAGS 2>&1)
    fi

    echo "$OUTPUT"
    echo "$OUTPUT" >> "$RECORD_FILE"

    # Check for rate limit error
    if echo "$OUTPUT" | grep -q '"error":"rate_limit"'; then
        echo ""
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

    # Check for completion signals in output
    # Look for common completion patterns
    if echo "$OUTPUT" | grep -qiE '(task.*complete|all.*done|nothing.*left|no.*remaining|finished.*successfully)'; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✓ Detected completion signal in output"
        echo "  Loop completed after $ITERATION iteration(s)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        break
    fi

    # Git operations if enabled
    if [ "$GIT_ENABLED" = true ]; then
        # Check if there are changes to commit
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

    # Small delay between iterations to avoid hammering
    sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Loop ended after $ITERATION iteration(s)"
echo "Record: $RECORD_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
