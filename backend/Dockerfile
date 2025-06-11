###################
# BUILD FOR LOCAL DEVELOPMENT
###################
FROM node:21.2.0-slim AS development

# Set the working directory
WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure copying both package.json AND yarn.lock (when available).
COPY --chown=node:node package*.json ./

# Install app dependencies using the `yarn install`
RUN yarn install

# Bundle app source
COPY --chown=node:node . .

# Use the node user from the image (instead of the root user)
USER node

###################
# BUILD FOR PRODUCTION
###################

FROM node:21.2.0-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# 빌드 시점의 ARG를 선언하여 docker-compose에서 전달받음
ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV}

COPY --chown=node:node package*.json ./

# In order to run `yarn build`, we need access to the Nest CLI which is a dev dependency.
# Copy over the node_modules directory from the development image
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

# Run the build command which creates the production bundle
RUN yarn build

# Running `yarn install --production` ensures that only the production dependencies are installed.
# This ensures that the node_modules directory is as optimized as possible
RUN yarn install --production && yarn cache clean --all

USER node

###################
# PRODUCTION
###################

FROM node:21.2.0-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-nanum \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV}
ARG N8N_WEBHOOK_URL
ENV N8N_WEBHOOK_URL ${N8N_WEBHOOK_URL}

# Copy the bundled code and the optimized node_modules from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 3000

# Start the server using the production build
CMD [ "node", "dist/apps/main.js" ]
