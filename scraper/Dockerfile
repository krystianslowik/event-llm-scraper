FROM node:latest

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
RUN npx playwright install
RUN npx playwright install-deps
COPY . .

CMD ["node", "scraper.js"]