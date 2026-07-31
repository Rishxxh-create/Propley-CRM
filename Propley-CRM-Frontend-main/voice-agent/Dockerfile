FROM node:20-slim AS build

WORKDIR /app

COPY voice-agent/package.json ./voice-agent/
RUN cd voice-agent && npm install

COPY voice-agent/tsconfig.json ./voice-agent/
COPY voice-agent/src ./voice-agent/src
COPY src ./src

RUN cd voice-agent && npm run build

FROM node:20-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app/voice-agent

COPY voice-agent/package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/voice-agent/dist ./dist

USER node

EXPOSE 8081

CMD ["node", "dist/index.js", "start"]
