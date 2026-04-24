FROM node:20-alpine
RUN apk add --no-cache docker-cli openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
