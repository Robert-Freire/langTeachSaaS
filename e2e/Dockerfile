FROM node:24-slim

WORKDIR /e2e

COPY package.json package-lock.json ./
RUN npm ci

# Install Chromium and its OS dependencies matching the installed @playwright/test version
RUN npx playwright install chromium --with-deps

COPY . .

RUN chown -R node:node /e2e
USER node

ENV PLAYWRIGHT_BASE_URL=http://frontend:5174

CMD ["npx", "playwright", "test"]
