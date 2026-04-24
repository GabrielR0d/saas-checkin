FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY src ./src
COPY tsconfig.json ./tsconfig.json
RUN npx prisma generate && npm run build
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push && npm run start"]
