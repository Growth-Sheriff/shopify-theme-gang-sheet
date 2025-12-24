#!/bin/bash
# API Test Script

# Create test JSON
cat > /tmp/api_test.json << 'EOF'
{"shop":"tester-12345678908798.myshopify.com","fingerprint":"test123","page":"/"}
EOF

echo "=== Test JSON ==="
cat /tmp/api_test.json

echo ""
echo "=== Init API Test ==="
curl -s -X POST https://gamification-engine.dev/api/proxy/init \
  -H "Content-Type: application/json" \
  -d @/tmp/api_test.json

echo ""
echo ""
echo "=== Health Check ==="
curl -s https://gamification-engine.dev/health

