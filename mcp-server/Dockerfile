FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json ./
COPY src ./src
COPY mcp-server ./mcp-server

ENV MCP_HTTP_HOST=0.0.0.0
ENV MCP_HTTP_PORT=3333

EXPOSE 3333

CMD ["npx", "tsx", "mcp-server/src/server.ts"]
