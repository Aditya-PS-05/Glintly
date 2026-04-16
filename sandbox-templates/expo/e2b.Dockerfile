# Expo SDK 54 (React Native) sandbox template for Glintly mobile projects
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git openssl ca-certificates procps \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

WORKDIR /home/user

# Scaffold the expo-router "default" template (tabs starter) with TypeScript
RUN npx --yes create-expo-app@latest . --template default

# ngrok binary required for `expo start --tunnel` on a headless sandbox
RUN npm install --save-dev @expo/ngrok@^4.1.0

# Warm the Metro cache by transforming the default entry once so cold starts
# under sandbox.create are faster (saves 15-30s on first run).
RUN npx expo export --platform web --output-dir /tmp/expo-warmup 2>/dev/null || true
RUN rm -rf /tmp/expo-warmup
