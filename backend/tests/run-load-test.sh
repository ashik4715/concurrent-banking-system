#!/bin/bash
# Load test setup and execution script
# Prerequisites: k6 installed (https://k6.io/docs/get-started/installation/)
#                artillery installed (npm install -g artillery)

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
TEST_TYPE="${1:-k6}"

echo "============================================"
echo "Concurrent Banking System - Load Tests"
echo "============================================"
echo "Target: $BASE_URL"
echo ""

# Health check
echo "Checking server health..."
HEALTH=$(curl -s "$BASE_URL/api/health" || echo "unreachable")
if [[ "$HEALTH" != *"ok"* ]]; then
  echo "ERROR: Server is not responding at $BASE_URL"
  echo "Make sure the backend is running: cd backend && npm run dev"
  exit 1
fi
echo "Server is healthy!"
echo ""

case "$TEST_TYPE" in
  k6)
    echo "Running k6 load test..."
    echo "This will execute 5 phases over ~2 minutes:"
    echo "  1. Create 10 test accounts"
    echo "  2. 1000 concurrent deposits (30s)"
    echo "  3. 1000 concurrent withdrawals (30s)"
    echo "  4. 1000 concurrent transfers (30s)"
    echo "  5. Verify final balances"
    echo ""
    k6 run --env BASE_URL="$BASE_URL" tests/load-test.js
    ;;
  artillery)
    echo "Running Artillery load test..."
    artillery run tests/load-test-artillery.yml
    ;;
  *)
    echo "Usage: ./run-load-test.sh [k6|artillery]"
    echo "  k6       - Run k6 load test (default)"
    echo "  artillery - Run Artillery load test"
    exit 1
    ;;
esac

echo ""
echo "============================================"
echo "Load test complete!"
echo "============================================"
