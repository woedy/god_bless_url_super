# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
COPY urlshort/frontend/package.json package.json
COPY urlshort/frontend/tsconfig.json tsconfig.json
COPY urlshort/frontend/tsconfig.node.json tsconfig.node.json
COPY urlshort/frontend/tailwind.config.js tailwind.config.js
COPY urlshort/frontend/postcss.config.js postcss.config.js
COPY urlshort/frontend/vite.config.ts vite.config.ts
COPY urlshort/frontend/.eslintrc.cjs .eslintrc.cjs
COPY urlshort/frontend/prettier.config.cjs prettier.config.cjs
COPY urlshort/frontend/src src
COPY urlshort/frontend/index.html index.html
RUN npm install
RUN npm run build

FROM nginx:1.25-alpine
COPY urlshort/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
