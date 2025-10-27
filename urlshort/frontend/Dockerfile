# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY tsconfig.node.json tsconfig.node.json
COPY tailwind.config.js tailwind.config.js
COPY postcss.config.js postcss.config.js
COPY vite.config.ts vite.config.ts
COPY .eslintrc.cjs .eslintrc.cjs
COPY prettier.config.cjs prettier.config.cjs
COPY src src
COPY index.html index.html
RUN npm install
RUN npm run build

FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
