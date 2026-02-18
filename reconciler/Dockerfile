FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Run setup then the reconciler
CMD ["sh", "-c", "npm run setup && npm run reconcile -- --head"]
