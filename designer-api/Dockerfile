FROM node:20-slim

WORKDIR /app

# Install git as it's required by simple-git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Ensure the git repo is available (mount or copy)
# For local dev, we expect the volume mount to cover this, 
# but we'll set up the ENV for the path
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]
