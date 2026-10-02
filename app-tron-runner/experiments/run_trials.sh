#!/bin/zsh
# A/B/C: same starting code (snapshot_S0), same task, 30 min each. Results: experiments/<trial>.csv + .metrics.jsonl + .log
cd "$(dirname "$0")"; E=$PWD; P=$E/..
trial(){ # name model think
  echo "=== trial $1 ($2 think=$3) $(date +%T)" | tee -a $E/trials.log
  rsync -a --delete $E/snapshot_S0/src/ $P/client/src/; cp $E/snapshot_S0/STATE.md $P/STATE.md; rm -f $P/RUNLOG.md
  ollama stop qwen3-coder:30b >/dev/null 2>&1; ollama stop qwen3.8:27b >/dev/null 2>&1; sleep 3
  rm -f $E/$1.metrics.jsonl
  python3 $E/sample.py $E/$1.csv 300 1800 &
  SP=$!
  CODER_CTX=65536 CODER_THINK=$3 QWEN_CODER_MODEL=$2 CODER_METRICS=$E/$1.metrics.jsonl \
    python3 ~/.claude/bin/qwen_coder_loop.py --workdir $P --task-file $E/fix_task.md --context-file $P/SPEC.md --max-hours 0.5 --rework 0 > $E/$1.log 2>&1
  cp $P/RUNLOG.md $E/$1.runlog.md 2>/dev/null
  wait $SP
  echo "=== trial $1 done $(date +%T)" | tee -a $E/trials.log
}
trial A_coder qwen3-coder:30b ""
trial B_qwen38_nothink qwen3.8:27b 0
trial C_qwen38_think qwen3.8:27b 1
rsync -a --delete $E/snapshot_S0/src/ $P/client/src/   # leave the tree at S0 for the real run
echo TRIALS_DONE | tee -a $E/trials.log
