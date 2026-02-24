FROM node:20-alpine

# Install Java 21 (required for Firebase Realtime Database and Auth emulators)
RUN apk add --no-cache openjdk21-jre bash

# Install Firebase CLI
RUN npm install -g firebase-tools

WORKDIR /app

# Expose the ports for the emulators
# 9000: Database
# 9099: Auth
# 5005: Hosting
# 4000: Emulator UI
EXPOSE 9000 9099 5005 4000

# Start emulators bound to all interfaces so they are accessible outside the container
CMD ["firebase", "emulators:start", "--project", "guestbook-3c7eb"]
