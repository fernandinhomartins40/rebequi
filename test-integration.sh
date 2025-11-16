#!/bin/bash

# Script de teste de integração Backend-Frontend
# Testa todos os endpoints da API

echo "🧪 Testando Integração Backend-Frontend"
echo "========================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_code)"
        return 1
    fi
}

# URL base da API
API_URL="${API_URL:-http://localhost/api}"

echo -e "${YELLOW}Using API URL: $API_URL${NC}"
echo ""

# Contador de testes
TOTAL=0
PASSED=0

# Health Check
echo "=== Health Checks ==="
test_endpoint "Backend Health" "${API_URL%/api}/health" && ((PASSED++))
((TOTAL++))
echo ""

# Products Endpoints
echo "=== Products Endpoints ==="
test_endpoint "List all products" "$API_URL/products" && ((PASSED++))
((TOTAL++))

test_endpoint "Promotional products" "$API_URL/products/promotional" && ((PASSED++))
((TOTAL++))

test_endpoint "New products" "$API_URL/products/new" && ((PASSED++))
((TOTAL++))

test_endpoint "Products by category" "$API_URL/products/category/ferramentas" && ((PASSED++))
((TOTAL++))
echo ""

# Categories Endpoints
echo "=== Categories Endpoints ==="
test_endpoint "List all categories" "$API_URL/categories" && ((PASSED++))
((TOTAL++))
echo ""

# Test with filters
echo "=== Filters Tests ==="
test_endpoint "Products with offer filter" "$API_URL/products?isOffer=true" && ((PASSED++))
((TOTAL++))

test_endpoint "Products with new filter" "$API_URL/products?isNew=true" && ((PASSED++))
((TOTAL++))

test_endpoint "Products with pagination" "$API_URL/products?page=1&limit=5" && ((PASSED++))
((TOTAL++))
echo ""

# Summary
echo "========================================"
echo -e "Test Summary: ${GREEN}$PASSED${NC}/$TOTAL passed"
echo ""

if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed!${NC}"
    exit 1
fi
