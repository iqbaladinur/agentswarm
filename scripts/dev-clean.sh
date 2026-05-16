#!/usr/bin/env bash
set -u

DEV_PORT=47821

port_pids="$(lsof -ti "tcp:${DEV_PORT}" 2>/dev/null || true)"
if [ -n "$port_pids" ]; then
  kill $port_pids 2>/dev/null || true
  sleep 0.5
fi

pkill -x tauri 2>/dev/null || true
pkill -x agentswarm 2>/dev/null || true

tauri dev
