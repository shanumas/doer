FROM node:20-alpine
RUN apk add --no-cache git
WORKDIR /agent
COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
