FROM node:22-alpine
WORKDIR /app
COPY local-server.mjs ./
COPY frontend/api ./frontend/api
EXPOSE 3001
ENV PORT=3001
CMD ["node", "local-server.mjs"]

