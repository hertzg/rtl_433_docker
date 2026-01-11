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

# Clone rtl_433 inside the Dockerfile for better layer caching
# The cache key is based on the ARG values, not file timestamps
# rtl433GitSha is used to bust cache when branch HEAD changes (e.g., master)
ARG rtl433GitVersion=master
ARG rtl433GitSha=latest
RUN git clone --depth 1 --branch ${rtl433GitVersion} https://github.com/merbanan/rtl_433 ./rtl_433 \
    && echo "Built from ${rtl433GitVersion} @ ${rtl433GitSha}"

WORKDIR ./rtl_433/build
RUN cmake -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DENABLE_OPENSSL=ON ..
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
