# Production stage
FROM node:lts-alpine

WORKDIR /app

# Copy configuration and package files
COPY \
    .npmrc \
    package.json \
    package-lock.json \
    ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the PRE-BUILT artifact (downloaded by GitHub Actions)
# This replaces the old COPY --from=build line
COPY ./build ./build

EXPOSE 3000

CMD ["node", "build"]
