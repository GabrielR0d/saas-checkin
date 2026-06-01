FROM node:20-alpine

WORKDIR /app

# Copy root package files for workspaces
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install all deps
RUN npm install --workspace=backend

# Copy backend source
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json

# Generate Prisma client
RUN cd backend && npx prisma generate

# Build TypeScript
RUN cd backend && npm run build

WORKDIR /app/backend

EXPOSE 3001

CMD ["npm", "run", "start"]
