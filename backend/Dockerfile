FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/
RUN npm install --workspace=backend
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/tsconfig.json
RUN cd backend && npx prisma generate && npm run build
WORKDIR /app/backend
EXPOSE 3001
CMD ["npm", "run", "start"]
