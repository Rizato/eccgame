# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack cryptocurrency guessing game called "ECC Crypto Playground" with a Django REST API backend and React
TypeScript frontend.

### Backend Structure

- `backend/` - Django project root
    - `project/` - Django project configuration
    - `game/` - Main Django app containing game logic
    - `manage.py` - Django management script

### Frontend Structure

- `frontend/` - React TypeScript application
    - `src/` - Source code
        - `components/` - React components
        - `pages/` - Page components
        - `services/` - API service layer
        - `types/` - TypeScript type definitions
        - `utils/` - Utility functions
    - `public/` - Static assets
    - `package.json` - NPM dependencies and scripts

## Architecture Overview

### Core Models

- **Challenge**: Represents daily cryptocurrency challenges with p2pkh addresses, public keys, and metadata
- **Guess**: User submissions for challenges, includes public key guesses and cryptographic signatures
- **ChallengeSentinel**: Ensures thread-safe daily challenge selection
- **Metadata**: Tags/metadata that can be applied to challenges

### Key Features

- Daily challenge rotation system with atomic challenge selection
- Cryptographic validation using ECDSA (secp256k1 curve)
- Rate limiting (24 requests/day for anonymous users)
- Session-based guess tracking (max 6 guesses per challenge)
- Progressive hint system based on guess count thresholds

### API Endpoints

- `/api/daily/` - Get current daily challenge
- `/api/challenges/{uuid}/` - Get specific challenge details
- `/api/challenges/{uuid}/guess/` - Submit guess for challenge
- `/api/challenges/{uuid}/guess/{guess_uuid}/` - Retrieve guess for challenge when defered verification is implemented

### Configuration

The game uses several threshold settings in `settings.py`:

- MAX_GUESSES = 6
- PUBKEY_GUESS_THRESHOLD = 1
- GRAPH_GUESS_THRESHOLD = 2
- HALF_GUESS_THRESHOLD = 3
- DOUBLE_GUESS_THRESHOLD = 4
- PLAYPEN_GUESS_THRESHOLD = 5

## Development Commands

### Backend Setup

```bash
cd backend
workon django-crypto
pip install -e .  # Install project dependencies
```

### Backend Database Operations

```bash
cd backend
python manage.py makemigrations  # Create new migrations
python manage.py migrate         # Apply migrations
python manage.py createsuperuser # Create admin user
```

### Backend Development Server

```bash
cd backend
python manage.py runserver       # Start development server on port 8000
```

### Backend Testing and Code Quality

```bash
cd backend
pytest                          # Run tests
black .                         # Format code
isort .                         # Sort imports
flake8 .                        # Lint code
```

### Frontend Setup

```bash
cd frontend
npm install                     # Install dependencies
```

### Frontend Development

```bash
cd frontend
npm run dev                     # Start development server (Vite)
npm run build                   # Build for production
npm run preview                 # Preview production build
npm run lint                    # Lint TypeScript/React code
npm run typecheck              # Run TypeScript type checking
npm test                        # Run tests with Vitest
```

### Admin Interface

Access Django admin at `http://localhost:8000/admin/` after creating a superuser.

## Important Notes

### Backend

- All Django work should be done in the `backend/` directory
- The project uses SQLite for development (db.sqlite3)
- Cryptographic operations use the `ecdsa` library with secp256k1 curve
- API responses include rate limiting and session management
- The daily challenge system uses database-level locking for thread safety

### Frontend

- All frontend work should be done in the `frontend/` directory
- Uses React 18 with TypeScript and Vite for development
- Styling with CSS modules and vanilla CSS
- API communication through `src/services/api.ts`
- Local storage utilities in `src/utils/storage.ts`
- Theme management in `src/utils/theme.ts`
- Keep tests is .test.ts files, no mixing tests and code in the same file
- Serialize bigint values as '0x' prefixed hex strings

## Task Management Guidelines

- Always use TodoWrite tool for complex multi-step tasks
- Mark todos as `in_progress` when starting work
- Mark todos as `completed` immediately after finishing each task
- Only have one task `in_progress` at a time
- Break down large features into smaller, specific tasks
- Use descriptive task names that clearly indicate the work to be done
- When leaving a mock or fake implementation, leave a `TODO` so that it is obvious the implementation is incomplete
- Write DRY (Don't repeat yourself) code
- Follow the Zen of Python

```
Beautiful is better than ugly.
Explicit is better than implicit.
Simple is better than complex.
Complex is better than complicated.
Flat is better than nested.
Sparse is better than dense.
Readability counts.
Special cases aren't special enough to break the rules.
Although practicality beats purity.
Errors should never pass silently.
Unless explicitly silenced.
In the face of ambiguity, refuse the temptation to guess.
There should be one-- and preferably only one --obvious way to do it.
Although that way may not be obvious at first unless you're Dutch.
Now is better than never.
Although never is often better than *right* now.
If the implementation is hard to explain, it's a bad idea.
If the implementation is easy to explain, it may be a good idea.
Namespaces are one honking great idea -- let's do more of those!
```
