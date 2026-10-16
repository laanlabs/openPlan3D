# Build stage
FROM node:lts AS build

WORKDIR /app

COPY \
    .npmrc \
    package.json \
    package-lock.json \
    /app/

RUN npm ci

COPY docs/ ./docs
COPY ops/ ./ops
COPY src/ ./src
COPY static/ ./static
COPY tooling/ ./tooling
COPY tests/ ./tests

COPY \
    *.png \
    tsconfig.json \
    vite.config.ts \
    vitest.config.ts \
    svelte.config.js \
    ./

RUN npm install

RUN npm run build

# Production stage
FROM node:lts-alpine AS production

WORKDIR /app

COPY \
    .npmrc \
    package.json \
    package-lock.json \
    ./

RUN npm ci --omit=dev

COPY --from=build /app/build ./build

EXPOSE 3000

CMD ["node", "build"]
