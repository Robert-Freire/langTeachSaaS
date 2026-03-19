FROM node:24-slim

WORKDIR /e2e

COPY package.json package-lock.json ./
RUN npm ci

# Install OS-level browser dependencies as root, then install the chromium
# binary as the node user so the cache lands in /home/node/.cache (not /root).
RUN npx playwright install-deps chromium
RUN chown -R node:node /e2e
USER node
RUN npx playwright install chromium

COPY --chown=node:node . .

ENV PLAYWRIGHT_BASE_URL=http://frontend:5174

CMD ["npx", "playwright", "test"]
