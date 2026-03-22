# Email-Native Crypto Remittance — Setup & Deployment

## Prerequisites

- Node.js 18+
- PostgreSQL
- Celo provider (Alchemy/Infura)
- Self Protocol API credentials
- Ampersend API credentials
- SendGrid or Mailgun (email)

## Quick Start

```bash
npm install
createdb remittance
cp .env.example .env
# edit .env with your credentials
npm start
```

## Configuration

.env:

```
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost/remittance
CELO_PROVIDER_URL=https://alfajores-forno.celo-testnet.org
SELF_API_KEY=sk_self_...
AMPERSEND_API_KEY=sk_amp_...
EMAIL_API_KEY=your_sendgrid_key
FROM_EMAIL=remittance@yourdomain.com
```

## Database Schema

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  tx_hash TEXT,
  claim_token TEXT UNIQUE
);

CREATE TABLE zk_verifications (
  id UUID PRIMARY KEY,
  claim_token TEXT UNIQUE REFERENCES transactions(claim_token),
  self_proof TEXT,
  verified_at TIMESTAMP
);
```

## API Endpoints

- `POST /api/send` - Initiate remittance
- `GET /api/claim/:token` - Claim portal
- `POST /api/claim/:token/verify` - Submit Self proof
- `GET /api/status/:tx` - Check transaction status

## Self Integration

- Use Self API to verify passport
- Store proof in `zk_verifications`
- Only release funds after verified

## Celo Integration

- Deploy stablecoin escrow contract or use existing cUSD/cREAL
- Transfer to recipient address after ZK verify
- Track tx_hash on-chain

## Ampersend for Email

- Send claim email with unique token
- Use Ampersend templates for branding
- Handle bounce and delivery tracking

## Testing

```bash
npm test
```

Integration tests use Celo Alfajores testnet and Self sandbox.

## Security

- Rate limiting on send/claim endpoints
- Encryption of sensitive data at rest
- HTTPS required in production
- Keys stored in environment variables, never logged

## Logging & Monitoring

- Structured JSON logs
- Track send/claim success rates
- Monitor ZK verification latency
- Alert on failed transactions

## Deployment

- Deploy backend to fly.io, Railway, or Render
- Configure domain and TLS
- Run migrations
- Set up cron for stuck claim cleanup

## License

MIT