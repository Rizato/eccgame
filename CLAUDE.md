# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack cryptocurrency guessing game called "ECC GAME" with a React TypeScript frontend.


### Frontend Structure


- `src/` - Source code
    - `components/` - React components
    - `pages/` - Page components
    - `services/` - API service layer
    - `types/` - TypeScript type definitions
    - `utils/` - Utility functions
- `public/` - Static assets
- `package.json` - NPM dependencies and scripts




## Development Commands


### Frontend Setup

```bash
npm install                     # Install dependencies
```

### Frontend Development

```bash
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


### Frontend

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
- Create git commits for each task as it is completed
- This project is brand new and not yet released, don't worry about backwards compatibility yet
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
