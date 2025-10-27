# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
ARG FRONTEND_DIR=frontend
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
COPY ${FRONTEND_DIR}/package.json package.json
COPY ${FRONTEND_DIR}/tsconfig.json tsconfig.json
COPY ${FRONTEND_DIR}/tsconfig.node.json tsconfig.node.json
COPY ${FRONTEND_DIR}/tailwind.config.js tailwind.config.js
COPY ${FRONTEND_DIR}/postcss.config.js postcss.config.js
COPY ${FRONTEND_DIR}/vite.config.ts vite.config.ts
COPY ${FRONTEND_DIR}/.eslintrc.cjs .eslintrc.cjs
COPY ${FRONTEND_DIR}/prettier.config.cjs prettier.config.cjs
COPY ${FRONTEND_DIR}/src src
COPY ${FRONTEND_DIR}/index.html index.html
RUN npm install
RUN npm run build

FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
