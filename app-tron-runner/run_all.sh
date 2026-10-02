#!/bin/zsh
# Drives qwen3-coder through milestones M1..M10. Usage: ./run_all.sh [first] [last]
cd "$(dirname "$0")"
FIRST=${1:-1}; LAST=${2:-10}
for i in $(seq $FIRST $LAST); do
  echo "=== M$i start $(date +%T) ===" | tee -a RUNLOG.md
  python3 ~/.claude/bin/qwen_coder_loop.py --workdir "$PWD" --task-file milestones/M$i.md --context-file SPEC.md \
    --gate "cd client && npm run lint && npm test && npm run build" --max-hours 4 --rework 3
  rc=$?
  echo "=== M$i exit $rc $(date +%T) ===" | tee -a RUNLOG.md
  [ $rc -ne 0 ] && { echo "STOPPED at M$i"; exit $rc; }
  touch milestones/M$i.done
done
echo ALL_DONE | tee -a RUNLOG.md
