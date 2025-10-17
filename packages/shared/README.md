# @rebequi/shared

Shared types, utilities, and constants used across all applications in the monorepo.

## Structure

```
packages/shared/
├── src/
│   ├── types/          # TypeScript types and interfaces
│   │   ├── product.ts
│   │   ├── category.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

```typescript
// In apps/frontend or apps/backend
import { Product, Category } from '@rebequi/shared/types';
```

## Adding New Shared Code

1. Add your types/utilities in the appropriate directory
2. Export them in the index file
3. Use them in any app within the monorepo
