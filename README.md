# Email-Native Crypto Remittance with ZK Identity Gate

Send money internationally using just an email address. Recipient verifies with Self ZK passport before claiming funds in Celo stablecoins.

## Overview

Combines the UX simplicity of Western Union with crypto rails and real identity verification. Targets unbanked in mobile-first regions (LATAM, Africa, SE Asia).

### How It Works

1. **Sender** initiates remittance via email address
2. **System** creates Celo transaction and sends claim link to recipient
3. **Recipient** clicks link, verifies via Self ZK passport
4. **Funds** released to recipient's Celo wallet (no wallet needed)

## Architecture

```
Web Frontend → Email Service → Celo Smart Contract → Self ZK Verification
                                ↓
                          Claim Portal (Web)
```

## Stack

- **Node.js/Express** - Backend API
- **Celo** - Blockchain for remittances
- **Self Protocol** - ZK identity verification
- **Ampersend** - Email claim flow
- **React** - Frontend interface
- **PostgreSQL** - Transaction tracking

## Features

- Email-only remittance (no wallet needed)
- ZK identity verification (no PII exposure)
- Mobile-optimized interface
- Real-time transaction tracking
- Multi-currency support (cUSD, cREAL)

## Setup

1. Install dependencies
2. Configure Celo provider
3. Set up Self API credentials
4. Configure Ampersend
5. Deploy to production

## API Keys

- Celo provider (Alchemy/Infura)
- Self Protocol API
- Ampersend API
- Email service (SendGrid/Mailgun)

## Testing

- Unit tests for business logic
- Integration tests with Celo testnet
- Email flow tests
- ZK verification tests

## Security

- No personal data stored
- ZK proofs for identity
- Encrypted email communications
- Secure key management

## Future Enhancements

- Support for more Celo stablecoins
- Multi-language support
- Mobile app
- Batch remittances

## License

MIT