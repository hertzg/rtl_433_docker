ARG alpineVersion=latest
FROM alpine:${alpineVersion} AS builder

RUN apk add --no-cache --virtual .buildDeps \
    build-base \
    libusb-dev \
    openssl-dev \
    librtlsdr-dev \
    cmake \
    git

WORKDIR /build

ADD ./rtl_433 ./rtl_433
WORKDIR ./rtl_433
WORKDIR ./build
RUN cmake -DENABLE_OPENSSL=ON ..
RUN make
WORKDIR /build/root
WORKDIR /build/rtl_433/build
RUN make DESTDIR=/build/root/ install
RUN ls -lah /build/root

ARG alpineVersion=latest
FROM alpine:${alpineVersion}

ARG rtl433GitRevision=master
LABEL maintainer="georgedot@gmail.com" \
    vcs-ref="${rtl433GitRevision}"

RUN apk add --no-cache libusb librtlsdr tzdata openssl
WORKDIR /root
COPY --from=builder /build/root/ /

ENTRYPOINT ["/usr/local/bin/rtl_433"]
