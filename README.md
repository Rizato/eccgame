# 🧩 ECC Crypto Playground

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://cryptoplayground.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Security](https://img.shields.io/badge/security-client--side--only-green?style=for-the-badge)](docs/SECURITY.md)

> **An interactive educational game demonstrating the computational impossibility of breaking Elliptic Curve Cryptography through brute force.**

ECC Crypto Playground is a browser-based game that challenges you to find private keys for real Bitcoin addresses using an unlimited ECC calculator. The twist? It's mathematically impossible - and that's exactly the point.

## 🎯 What Is This?

This is an educational demonstration of why **Bitcoin is secure**. You're given:

- 🧮 **Unlimited ECC Calculator** - Perform any elliptic curve operations
- 🎯 **Real Bitcoin Addresses** - With known public keys from the blockchain
- 🏆 **Impossible Challenge** - Find the private keys (spoiler: you won't)
- 📚 **Learn by Doing** - Understand ECC security through hands-on experience

### The Reality Check

The discrete logarithm problem on elliptic curves is what secures Bitcoin. Even with infinite time and perfect math, finding a private key from a public key requires checking approximately **2^128 possibilities**. To put this in perspective:

- **Age of Universe**: ~13.8 billion years
- **Atoms in Observable Universe**: ~10^80
- **Operations Needed**: ~10^38

*You'd need to check more combinations than there are atoms in the universe, multiple times over.*

## 🚀 Features

### 🎮 Game Modes

- **📅 Daily Challenge**: A new impossible challenge every day
- **🏋️ Practice Mode**: Learn with private keys provided (cheating enabled!)

### 🧮 ECC Calculator

Perform unlimited elliptic curve operations:
- **Multiply**: Scale points by any number (×2, ×1000, ×2^256)
- **Divide**: Reverse multiplication (÷2, ÷7, ÷1000000)
- **Add**: Combine two points on the curve
- **Subtract**: Find the difference between points
- **Save Points**: Bookmark interesting locations for later

### 🛡️ Security & Privacy

- **🔒 100% Client-Side**: No data ever leaves your browser
- **🔑 Private Keys Stay Private**: All cryptographic operations in your browser
- **📱 No Registration**: Play immediately, no accounts needed
- **🚫 No Tracking**: No analytics, no cookies, no surveillance

### 🎨 User Experience

- **🌙 Dark/Light Themes**: Easy on the eyes, day or night
- **📱 Mobile Responsive**: Works perfectly on phones and tablets
- **🚀 Fast Loading**: Optimized for quick startup
- **♿ Accessible**: Screen reader friendly, keyboard navigation

## 🏃 Quick Start

### 🌐 Play Online

Visit **[cryptoplayground.com](https://cryptoplayground.com)** and start playing immediately!

### 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/CryptoGuesser.git
cd CryptoGuesser/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### 🔧 Environment Setup

Create `.env.local` for local development:

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your preferred settings
VITE_APP_URL=http://localhost:5173
VITE_EXPLORER_BASE_URL=https://blockstream.info/testnet/address/
```

## 🎯 How to Play

### 🏁 Getting Started

1. **🎉 Welcome**: Read the how-to-play modal (or skip if you're brave)
2. **🎯 Pick Your Challenge**: Choose Daily Challenge or Practice Mode
3. **🧮 Start Calculating**: Use the ECC calculator to explore
4. **🔍 Hunt for Private Keys**: Try to match the target public key
5. **🤯 Realize the Impossibility**: Experience the security of cryptography firsthand

### 🧠 Strategy Tips

- **🎓 Start with Practice Mode**: Learn the interface with known private keys
- **💾 Save Interesting Points**: Use the bookmark feature strategically
- **🔢 Try Different Approaches**: Multiplication, division, addition, subtraction
- **📊 Track Your Operations**: See how many steps you've taken
- **🏳️ Know When to Surrender**: The "Give Up" button exists for a reason

### 🏆 Winning (Spoiler: You Won't)

If by some miracle you find a private key:
- 🎊 Victory animation and celebration
- 📊 Statistics on your incredible luck
- 📤 Share your impossible achievement
- 🤯 Probably break mathematics

## 🛠️ Technology Stack

### Frontend (React + TypeScript)
- **⚛️ React 18**: Modern React with hooks and concurrent features
- **📘 TypeScript**: Type-safe development
- **🚀 Vite**: Lightning-fast build tool and dev server
- **🧪 Vitest**: Fast unit testing with coverage
- **🎨 CSS Modules**: Scoped styling
- **📱 Responsive Design**: Mobile-first approach

### Cryptography
- **🔐 secp256k1**: The same elliptic curve used by Bitcoin
- **🧮 BigInt**: JavaScript's native arbitrary-precision integers
- **🛡️ Client-Side Only**: Zero server-side cryptographic operations

### State Management
- **🗃️ Redux Toolkit**: Predictable state container
- **💾 Local Storage**: Persistent saves and settings
- **🔄 Real-time Updates**: Reactive UI updates

## 📁 Project Structure

```

src/
├── components/          # React components
│   ├── ECCCalculator.tsx    # Main calculator interface
│   ├── ECCGraph.tsx         # Point visualization
│   ├── VictoryModal.tsx     # Win celebration
│   └── ...
├── pages/              # Page-level components
│   ├── ECCGamePage.tsx     # Main game page
│   ├── FAQPage.tsx         # Frequently asked questions
│   └── PrivacyPage.tsx     # Privacy policy
├── store/              # Redux state management
│   ├── slices/             # State slices
│   └── index.ts            # Store configuration
├── utils/              # Utility functions
│   ├── crypto.ts           # Cryptographic utilities
│   ├── ecc.ts             # Elliptic curve math
│   └── gameUtils.ts        # Game-specific helpers
├── types/              # TypeScript type definitions
public/                 # Static assets
dist/                  # Production build output
```

## 🚀 Deployment

### 📦 Build for Production

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

### 🌍 Deploy to Hosting

#### Netlify (Recommended)
```bash
# Build settings
Build command: npm run build:prod
Publish directory: dist

# Environment variables
VITE_APP_URL=https://your-domain.com
VITE_EXPLORER_BASE_URL=https://blockstream.info/address/
```

#### Vercel
```bash
# Build settings
Framework: Vite
Build command: npm run build:prod
Output directory: dist

# Environment variables
VITE_APP_URL=https://your-domain.com
VITE_EXPLORER_BASE_URL=https://blockstream.info/address/
```

#### Static Hosting (GitHub Pages, S3, etc.)
```bash
# Build and upload the dist/ folder
npm run build:prod
# Upload dist/ contents to your hosting provider
```

### 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_URL` | Your domain URL for sharing | `https://cryptoplayground.com` |
| `VITE_EXPLORER_BASE_URL` | Bitcoin explorer URL | `https://blockstream.info/address/` |

## 🧪 Testing

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

### 📊 Coverage Goals
- **Target**: >90% test coverage
- **Current**: ~60% (and growing!)
- **Focus Areas**: Components, utilities, and user interactions

## 🤝 Contributing

We welcome contributions! Here's how to help:

### 🐛 Bug Reports
1. **🔍 Check existing issues** first
2. **📝 Create detailed bug report** with steps to reproduce
3. **🖼️ Include screenshots** if applicable
4. **🌐 Mention browser/device** where bug occurs

### ✨ Feature Requests
1. **💡 Open an issue** describing the feature
2. **🎯 Explain the use case** and benefits
3. **🎨 Include mockups** if it's a UI change
4. **📊 Consider impact** on performance and security

### 💻 Code Contributions
1. **🍴 Fork the repository**
2. **🌿 Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **✅ Write tests** for new functionality
4. **🎨 Follow code style** (run `npm run lint`)
5. **📝 Update documentation** as needed
6. **🚀 Submit a pull request**

### 📋 Development Guidelines
- **TypeScript**: Use strict typing
- **Testing**: Maintain >90% coverage
- **Security**: Never transmit private keys
- **Performance**: Keep bundle size minimal
- **Accessibility**: Support screen readers and keyboard navigation

## 📚 Educational Value

### 🎓 Learning Objectives

After playing ECC Crypto Playground, you'll understand:

- **🔐 Why Bitcoin is Secure**: Experience the math that protects cryptocurrency
- **🧮 Elliptic Curve Cryptography**: Learn through hands-on interaction
- **📊 Computational Complexity**: Feel the scale of cryptographic security
- **🔑 Public/Private Key Relationships**: See how they're mathematically connected
- **🛡️ Cryptographic Assumptions**: Understand what makes modern security possible

### 👨‍🏫 Educational Use

Perfect for:
- **🏫 Computer Science Courses**: Cryptography and security modules
- **💰 Blockchain Education**: Understanding Bitcoin's foundation
- **🔐 Security Training**: Demonstrating real-world cryptography
- **📚 Self-Learning**: Interactive exploration of advanced mathematics

### 📖 Further Reading

- [Elliptic Curve Cryptography](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography)
- [Bitcoin's Use of ECC](https://bitcoin.org/bitcoin.pdf)
- [secp256k1 Specification](https://www.secg.org/sec2-v2.pdf)
- [Discrete Logarithm Problem](https://en.wikipedia.org/wiki/Discrete_logarithm)

## 🛡️ Security

### 🔒 Security Principles

- **Client-Side Only**: All cryptographic operations happen in your browser
- **No Data Transmission**: Private keys never leave your device
- **Open Source**: All code is auditable and transparent
- **No Dependencies on External APIs**: Works completely offline after initial load

### 🔍 Security Audit

Want to verify our security claims?
1. **📖 Read the source code**: Everything is open source
2. **🌐 Check network tab**: No sensitive data ever sent
3. **🔍 Audit the crypto**: Standard, well-tested algorithms
4. **🧪 Run offline**: Disconnect internet, it still works

### 🚨 Responsible Disclosure

Found a security issue? Email us at [security@cryptoplayground.com](mailto:security@cryptoplayground.com)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🤝 Third-Party Licenses

- **React**: MIT License
- **TypeScript**: Apache-2.0 License
- **Vite**: MIT License
- **All other dependencies**: See package.json for individual licenses

## ❓ FAQ

### 🤔 Is this actually impossible?

Yes! The discrete logarithm problem on elliptic curves is what secures Bitcoin. Breaking it would mean breaking Bitcoin itself.

### 🎰 What if I actually find a private key?

You'd be the first person in history to do so through brute force. You'd also probably become very wealthy and break modern cryptography.

### 💰 Are these real Bitcoin addresses?

Yes! They're real addresses with known balances that have never moved. We use them to make the demonstration concrete rather than theoretical.

### 🔒 Is my data safe?

Completely. Everything runs in your browser. No accounts, no tracking, no data collection. You can even play offline.

### 📱 Does it work on mobile?

Absolutely! The interface is optimized for mobile devices and touch interactions.

### 🆓 Is it really free?

Yes, completely free and open source. No ads, no premium features, no hidden costs.

## 🎉 Acknowledgments

- **Satoshi Nakamoto**: For creating Bitcoin and demonstrating ECC security
- **Elliptic Curve Community**: For decades of cryptographic research
- **Bitcoin Developers**: For maintaining the protocol this demonstrates
- **Open Source Community**: For the tools that make this possible

---

<div align="center">

**🧩 Ready to try the impossible?**

[![Play Now](https://img.shields.io/badge/Play_Now-🚀_cryptoplayground.com-blue?style=for-the-badge&logo=bitcoin)](https://cryptoplayground.com)

*Made with ❤️ for education and security awareness*

</div>
