# ECC Game

> **An interactive game demonstrating the computational impossibility of breaking Elliptic Curve Cryptography through Elliptic Curve Operations.**

ECC Game is a browser-based game that challenges you to find private keys for real Bitcoin addresses using an ECC calculator. It's basically impossible - and that's exactly the point.

## What Is This?

This is a gamified elliptic curve cryptography calculator.
It lets you play with elliptic curve points and operations to ostensibly try to find an algorithm to go from a public key to private key.

It uses real Bitcoin wallets to be attractive to try to play, knowing full well they are totally safe.

### The Reality Check

The elliptic curve discrete logarithm problem is the hard problem behind Bitcoin.

With a private key you can compute the public key in just log(n) steps, where n is the size of the key, which is ~2^256.
Without the private key, it would take a maximum of 2^256 steps to brute force a solution.

The best known classical algorithm can solve it in about 2^128 steps.

- **Age of Universe**: ~13.8 billion years (~13.8 ^ * 10^9)
- **Atoms in Observable Universe**: ~10^80
- **Operations Needed**: ~10^38

*You'd need to check more combinations than there are atoms in the universe, multiple times over.*

## Features

### Game Modes

- **Daily Challenge**: A new impossible challenge every day
- **Practice Mode**: Learn with private keys provided (cheating enabled!)

### ECC Calculator

Perform elliptic curve operations:

- **Multiply**: Multiply the current point by the input scalar
- **Divide**: Divide the current point by the input scalar
- **Add**: Add the current point to the public key of the input scalar
- **Subtract**: Subtract the current point to the public key of the input scalar
- **Save Points**: Bookmark interesting locations for later

### Security & Privacy

- **100% Client-Side**: No data ever leaves your browser
- **Private Keys Stay Private**: All cryptographic operations in your browser
- **No Registration**: Play immediately, no accounts needed
- **No Tracking**: No analytics, no cookies, no surveillance

### User Experience

- **Dark/Light Themes**: Easy on the eyes, day or night
- **Mobile Responsive**: Works perfectly on phones and tablets
- **Fast Loading**: Optimized for quick startup

## Quick Start

### Play Online

Visit **[https://eccgame.com](https://eccgame.com)** and start playing immediately!

## Technology Stack

### Agentic Coding

This project was built in part to learn how to use Claude Code.

I chose a tech stack where my knowledge was out of date intentionally, to see how quickly I could create a frontend with stale skills.
I'd say it worked out, as I was familiar enough to handle most of the issues that arose.

### Frontend (React + TypeScript)
- **⚛React 19**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool and dev server
- **Vitest**: Fast unit testing with coverage
- **CSS Modules**: Scoped styling
- **Responsive Design**: Mobile-friendly approach

### Cryptography
- **secp256k1**: The same elliptic curve used by Bitcoin
- **BigInt**: JavaScript's native arbitrary-precision integers
- **Client-Side Only**: Zero server-side cryptographic operations

### State Management
- **Redux Toolkit**: Predictable state container
- **Real-time Updates**: Reactive UI updates


## Local Development

```bash
# Clone the repository
git clone https://github.com/rizato/eccgame.git
cd eccgame

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Environment Setup

Create `.env.local` for local development:

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your preferred settings
VITE_APP_URL=http://localhost:5173
VITE_EXPLORER_BASE_URL=https://www.blockchain.com/explorer/addresses/BTC/
```

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_URL` | Your domain URL for sharing | `https://eccgame.com` |
| `VITE_EXPLORER_BASE_URL` | Bitcoin explorer URL | `https://www.blockchain.com/explorer/addresses/BTC/` |
| `VITE_DAILY_CHALLENGE_START_DATE` | The date of the first challenge | 2025-06-12 |


## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test ECCCalculator.test.tsx
```

## Deployment

### Build for Production

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build production bundle
npm run build:prod

# Preview production build
npm run preview
```

## Further Reading

- [Elliptic Curve Cryptography](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography)
- [Bitcoin's Use of ECC](https://bitcoin.org/bitcoin.pdf)
- [secp256k1 Specification](https://www.secg.org/sec2-v2.pdf)
- [Discrete Logarithm Problem](https://en.wikipedia.org/wiki/Discrete_logarithm)

---

**Ready to try the impossible?**

[Play Now](https://eccgame.com)
