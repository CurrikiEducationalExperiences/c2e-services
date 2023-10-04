# Check out https://hub.docker.com/_/node to select a new base image
FROM node:18-slim

# Set to a non-root built-in user `node`
USER node

# Create app directory (with user `node`)
RUN mkdir -p /home/node/app

WORKDIR /home/node/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY --chown=node package*.json ./

RUN npm install

# Bundle app source code
COPY --chown=node . .
# COPY ./src/config-sample.ts src/config.ts

# ARG DB_HOST
# ARG DB_USER
# ARG DB_PASS
# ARG DB_DATABASE
# ENV db_host=$DB_HOST
# ENV db_user=$DB_USER
# ENV db_pass=$DB_PASS
# ENV db_database=$DB_DATABASE

# RUN sed -i "s/localhost/${DB_HOST}/g" src/config.ts
# RUN sed -i "s/c2e-provider/${DB_DATABASE}/g" src/config.ts
# RUN sed -i "s/postgres/${DB_USER}/g" src/config.ts
# RUN sed -i "s/waqar/${DB_PASS}/g" src/config.ts

RUN npm run build

# Bind to all network interfaces so that it can be mapped to the host OS
ENV HOST=0.0.0.0 PORT=3000

EXPOSE ${PORT}
CMD [ "node", "." ]
