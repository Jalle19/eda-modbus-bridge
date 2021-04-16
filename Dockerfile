ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

WORKDIR /app

RUN apk add --no-cache nodejs npm python3 musl-dev make g++ linux-headers

COPY package.json package-lock.json /app/
RUN npm i

COPY config.json /app/config.json
COPY entrypoint.sh /app/entrypoint.sh
COPY app /app/app
COPY eda-modbus-bridge.mjs /app/

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
