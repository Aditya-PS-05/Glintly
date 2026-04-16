#!/bin/bash
# Boots the Expo dev server (Metro + public tunnel + react-native-web export)
# and writes the captured tunnel URL to /tmp/expo-urls.json so the Glintly
# Inngest function can pick it up after the agent finishes writing files.

set -u
cd /home/user

# Clean any stale URL file from a prior sandbox boot
rm -f /tmp/expo-urls.json /tmp/expo.log

# Background watcher: tails the Expo log and writes URLs once the tunnel prints.
(
  for i in $(seq 1 300); do
    if [ -f /tmp/expo.log ]; then
      EXP_URL=$(grep -oE 'exp(o)?://[^ )"]+' /tmp/expo.log | head -1 || true)
      if [ -n "${EXP_URL}" ]; then
        printf '{"expoUrl":"%s","webUrl":"http://localhost:19006","ready":true}\n' \
          "${EXP_URL}" > /tmp/expo-urls.json
        exit 0
      fi
    fi
    sleep 1
  done
) &

# Foreground: Metro + tunnel + web. Stays alive for the sandbox lifetime.
exec npx expo start --tunnel --web --non-interactive 2>&1 | tee /tmp/expo.log
