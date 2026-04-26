FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY src ./src
COPY tsconfig.json ./tsconfig.json
RUN npx prisma generate && npm run build
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
