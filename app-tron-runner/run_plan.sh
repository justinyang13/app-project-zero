#!/bin/zsh
# Drives the local coder through the sub-milestones in milestones/plan.txt (id|required files). Usage: ./run_plan.sh [first_id]
cd "$(dirname "$0")"
START=${1:-}; go=0; [ -z "$START" ] && go=1
while IFS='|' read -r id req; do
  [ "$id" = "$START" ] && go=1
  [ $go -eq 0 ] && continue
  [ -f milestones/$id.done ] && continue
  chk=""; for f in ${=req}; do chk="$chk && test -s $f"; done
  # the milestone's files live under app-tron-runner/, the gate runs from there
  gate="(cd client && npm run lint && npm test && npm run build) $chk"
  echo "=== $id start $(date +%T) ===" | tee -a RUNLOG.md
  python3 ~/.claude/bin/qwen_coder_loop.py --workdir "$PWD" --task-file milestones/$id.md --context-file SPEC.md \
    --gate "$gate" --max-hours 4 --rework 3
  rc=$?
  echo "=== $id exit $rc $(date +%T) ===" | tee -a RUNLOG.md
  [ $rc -ne 0 ] && { echo "STOPPED at $id"; exit $rc; }
  touch milestones/$id.done
done < milestones/plan.txt
echo ALL_DONE | tee -a RUNLOG.md
