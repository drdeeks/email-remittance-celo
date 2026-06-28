# Self Protocol - Monitoring and Alerting

## What to implement
- Verification success/failure metrics
- Alerting for verification failures
- Dashboard for verification status
- Logging for audit purposes

## Files to modify
- src/utils/monitoring.ts (create)
- src/utils/alerting.ts (create)
- src/routes/metricsRoutes.ts (create)
- deploy/prometheus.yml (create)

## Acceptance criteria
- Verification metrics exposed via /metrics endpoint
- Alerts triggered for verification failures
- Dashboard shows verification status
- Audit logs for all verification attempts
- npm run typecheck passes
