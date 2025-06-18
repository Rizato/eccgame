# ECC Game

> **An interactive game demonstrating the computational impossibility of breaking Elliptic Curve Cryptography through elliptic curve operations.**

ECC Game is a browser-based game that challenges you to find private keys for real Bitcoin addresses using an ECC calculator. It's computationally impossible - and that's exactly the point.

## What Is This?

ECC Game is a gamified elliptic curve cryptography calculator that lets you experiment with elliptic curve points and operations. The game challenges you to find an algorithm to derive a private key from a public key - a task that's computationally infeasible.

The game uses real Bitcoin addresses to make it engaging, while demonstrating why these wallets remain secure.

### The Reality Check

The elliptic curve discrete logarithm problem (ECDLP) is the mathematical foundation securing Bitcoin.

**Forward computation** (private → public key):
- Takes only ~256 point operations (log₂(n) where n ≈ 2²⁵⁶)
- Computationally trivial

**Reverse computation** (public → private key):
- Brute force: ~2²⁵⁶ operations
- Best known algorithm (Pollard's rho): ~2¹²⁸ operations

**For perspective**:
- **Age of Universe**: ~4.3 × 10¹⁷ seconds
- **Atoms in Observable Universe**: ~10⁸⁰

*You'd need to check more combinations than there are atoms in the universe, multiple times over.*

## Features

### Game Modes

- **Daily Challenge**: A new impossible challenge every day - try to find the private key!
- **Practice Mode**: Learn with private keys provided (educational mode)

### ECC Calculator

Perform elliptic curve operations:

- **Multiply**: Multiply the current point by the input scalar
- **Divide**: Divide the current point by the input scalar
- **Add**: Add the public key of the input scalar to the current point
- **Subtract**: Subtract the public key of the input scalar from the current point
- **Negate**: Negate the current point (flip over the x-axis)
- **Save Points**: Bookmark interesting locations for later

### Security & Privacy

- **100% Client-Side**: All operations run in your browser
- **Zero Server Communication**: No data ever leaves your device
- **No Registration**: Play immediately, no accounts needed
- **Privacy First**: No analytics, no cookies, no tracking

### User Experience

- **Dark/Light Themes**: Comfortable viewing in any lighting
- **Mobile Responsive**: Optimized for all screen sizes
- **Fast & Lightweight**: Minimal dependencies, quick load times
- **Offline Capable**: Play without an internet connection

## Quick Start

### Play Online

Visit **[https://eccgame.com](https://eccgame.com)** and start playing immediately!

## Technology Stack

### Development Approach

This project was built using Claude Code (claude.ai/code) to explore AI-assisted development.
The tech stack was intentionally chosen in areas where my knowledge was outdated, demonstrating how AI tools can bridge skill gaps while maintaining code quality.

While AI assistance was invaluable, having foundational familiarity with the technologies proved essential for handling the inevitable edge cases, debugging issues, and making architectural decisions that AI tools struggle with in isolation.

### Frontend
- **React 19 + TypeScript**: Modern React with hooks and type safety
- **Vite**: Lightning-fast build tool and dev server
- **Vitest**: Fast unit testing with coverage
- **CSS Modules**: Scoped styling with modular CSS
- **Responsive Design**: Mobile-first approach

### Cryptography
- **secp256k1**: The same elliptic curve used by Bitcoin
- **BigInt**: JavaScript's native arbitrary-precision integers
- **Client-Side Only**: Zero server-side cryptographic operations

### Architecture
- **State Management**: React Context API for global state
- **Real-time Updates**: Reactive UI with React hooks
- **Code Organization**: Modular component structure


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

| Variable                           | Description                      | Example                                                |
|------------------------------------|----------------------------------|--------------------------------------------------------|
| `VITE_APP_URL`                     | Your domain URL for sharing      | `https://eccgame.com`                                  |
| `VITE_EXPLORER_BASE_URL`           | Bitcoin explorer URL             | `https://www.blockchain.com/explorer/addresses/BTC/`   |
| `VITE_DAILY_CHALLENGE_START_DATE`  | The date of the first challenge  | `2025-01-01`                                           |


## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm test

# Run specific test file
npm test -- src/components/ECCCalculator.test.tsx
```

## Production Build

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
