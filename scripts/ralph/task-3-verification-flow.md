# Self Protocol - Verification Flow

## What to implement
- Verification requirement logic
- Self Protocol QR code generation
- Verification callback handler
- Verification status tracking

## Files to modify
- src/controllers/verificationController.ts (create)
- src/routes/verificationRoutes.ts (create)
- frontend/src/components/SelfVerificationQR.tsx (create)
- frontend/src/app/claim/[token]/page.tsx

## Acceptance criteria
- Verification required for transactions >$100
- QR code displays on claim page
- Verification callback properly handled
- Verification status tracked in database
- npm run typecheck passes
- Use Chrome DevTools MCP with take_snapshot to verify QR code displays correctly
