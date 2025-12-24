#!/bin/bash
# Comprehensive API Test Script

SHOP="tester-12345678908798.myshopify.com"
BASE_URL="https://gamification-engine.dev/api/proxy"

# Get session token first
echo "=== 1. Init Session ==="
INIT_RESPONSE=$(curl -s -X POST "$BASE_URL/init" \
  -H "Content-Type: application/json" \
  -d "{\"shop\":\"$SHOP\",\"fingerprint\":\"test_fp_$(date +%s)\",\"page\":\"/\"}")
echo "$INIT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INIT_RESPONSE"

SESSION_TOKEN=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('sessionToken',''))" 2>/dev/null)
GAME_ID=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('activeGame',{}).get('id',''))" 2>/dev/null)

echo ""
echo "Session Token: $SESSION_TOKEN"
echo "Game ID: $GAME_ID"

# Test Cart Update
echo ""
echo "=== 2. Cart Update ==="
curl -s -X POST "$BASE_URL/cart/update" \
  -H "Content-Type: application/json" \
  -d "{\"shop\":\"$SHOP\",\"sessionToken\":\"$SESSION_TOKEN\",\"cartValue\":150,\"cartItems\":3}" | python3 -m json.tool 2>/dev/null || echo "Error"

# Test Cart Value
echo ""
echo "=== 3. Cart Value ==="
curl -s -X POST "$BASE_URL/cart/value" \
  -H "Content-Type: application/json" \
  -d "{\"shop\":\"$SHOP\",\"sessionToken\":\"$SESSION_TOKEN\"}" | python3 -m json.tool 2>/dev/null || echo "Error"

# Test Social Proof Config
echo ""
echo "=== 4. Social Proof Config ==="
curl -s -X POST "$BASE_URL/social-proof/config" \
  -H "Content-Type: application/json" \
  -d "{\"shop\":\"$SHOP\"}" | python3 -m json.tool 2>/dev/null || echo "Error"

# Test Social Proof Feed
echo ""
echo "=== 5. Social Proof Feed ==="
curl -s -X POST "$BASE_URL/social-proof/feed" \
  -H "Content-Type: application/json" \
  -d "{\"shop\":\"$SHOP\"}" | python3 -m json.tool 2>/dev/null || echo "Error"

# Test Daily Spin Status
echo ""
echo "=== 6. Daily Spin Status ==="
curl -s -X POST "$BASE_URL/daily-spin/status" \
  -H "Content-Type: application/json" \
  -d "{\"shop\":\"$SHOP\",\"sessionToken\":\"$SESSION_TOKEN\"}" | python3 -m json.tool 2>/dev/null || echo "Error"

# Test Loyalty Status
echo ""
echo "=== 7. Loyalty Status ==="
curl -s -X POST "$BASE_URL/loyalty/status" \
  -H "Content-Type: application/json" \
  -d "{\"shop\":\"$SHOP\",\"sessionToken\":\"$SESSION_TOKEN\"}" | python3 -m json.tool 2>/dev/null || echo "Error"

echo ""
echo "=== Tests Complete ==="

