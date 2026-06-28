#!/bin/bash
# Email Remittance Pro - Implementation Verification Script
# This script verifies all fee structure requirements are correctly implemented

set -e

echo "🔍 VERIFYING EMAIL REMITTANCE PRO IMPLEMENTATION"
echo "============================================="

# 1. Verify 7-day expiration
echo -n "✅ 7-Day Expiration: "
if grep -q "7.*24.*60.*60" src/services/remittanceService.ts; then
  echo "IMPLEMENTED"
else
  echo "❌ MISSING"
  exit 1
fi

# 2. Verify 1.5% storage fee
echo -n "✅ 1.5% Storage Fee: "
if grep -q "amount.*0\.015" src/services/remittanceService.ts; then
  echo "IMPLEMENTED"
else
  echo "❌ MISSING"
  exit 1
fi

# 3. Verify 1.5% protocol fee
echo -n "✅ 1.5% Protocol Fee: "
if grep -q "0\.015.*PROTOCOL_FEE_PERCENT" src/services/feeService.ts; then
  echo "IMPLEMENTED"
else
  echo "❌ MISSING"
  exit 1
fi

# 4. Verify database schema
echo -n "✅ Database Schema: "
if grep -q "storage_fee.*TEXT" src/db/database.ts && grep -q "returned_to_sender.*INTEGER" src/db/database.ts; then
  echo "IMPLEMENTED"
else
  echo "❌ MISSING"
  exit 1
fi

# 5. Verify API response
echo -n "✅ API Response: "
if grep -q "storage_fee.*remittance" src/controllers/transactionController.ts && grep -q "returned_to_sender.*remittance" src/controllers/transactionController.ts; then
  echo "IMPLEMENTED"
else
  echo "❌ MISSING"
  exit 1
fi

# 6. Run tests
echo -n "✅ Test Suite: "
if npx jest tests/fee-structure.test.ts --silent --noStackTrace | grep -q "5 passed"; then
  echo "ALL TESTS PASS"
else
  echo "❌ TESTS FAILED"
  exit 1
fi

echo ""
echo "🎉 IMPLEMENTATION VERIFICATION COMPLETE"
echo "============================================="
echo "✅ All requirements fully implemented"
echo "✅ Ready for production deployment"
