# @rebequi/backend

Backend API for Rebequi e-commerce platform.

## 🚧 Status: Not Implemented

This directory is prepared for your future backend implementation.

## 📋 Next Steps

1. **Choose your backend stack:**
   - Node.js + Express/Fastify/Hono
   - Node.js + NestJS
   - Bun + Elysia
   - Python + FastAPI/Django
   - Go + Fiber/Gin
   - Your choice!

2. **Configure package.json:**
   - Update dependencies based on your stack
   - Configure dev/build/start scripts
   - Add necessary dev dependencies

3. **Structure suggestions:**
   ```
   apps/backend/
   ├── src/
   │   ├── controllers/
   │   ├── routes/
   │   ├── services/
   │   ├── middlewares/
   │   ├── models/         # or database/
   │   └── index.ts
   ├── tests/
   ├── .env.example
   ├── tsconfig.json
   └── package.json
   ```

4. **Environment variables:**
   - Create `.env` file (already in .gitignore)
   - Use `.env.example` as template

5. **Database:**
   - Choose your database (PostgreSQL, MongoDB, MySQL, etc.)
   - Set up migrations/ORM (Prisma, TypeORM, Drizzle, etc.)

## 🔗 Shared Types

Import shared types from `@rebequi/shared`:

```typescript
import { Product, Category } from '@rebequi/shared/types';
```

## 📚 API Endpoints (Planned)

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Categories
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Authentication (Optional)
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

## 🚀 Running

Once implemented, run with:

```bash
npm run dev:api
```
