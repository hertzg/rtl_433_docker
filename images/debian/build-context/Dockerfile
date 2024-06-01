ARG debianVersion=latest
FROM debian:${debianVersion} as builder

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libusb-1.0-0-dev \
    libsoapysdr-dev \
    libssl-dev \
    librtlsdr-dev \
 && rm -rf /var/lib/apt/lists/*

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

ARG debianVersion=latest
FROM debian:${debianVersion}

ARG rtl433GitRevision=master
LABEL maintainer="georgedot@gmail.com" \
    vcs-ref="${rtl433GitRevision}"

RUN apt-get update && apt-get install -y \
    libusb-1.0-0 \
    librtlsdr0 \
    '^libsoapysdr0\.[6-8]$' \
    '^libssl(1\.1|3)$' \
    '^soapysdr0\.[6-8]-module-all$' \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /root
COPY --from=builder /build/root/ /

ENTRYPOINT ["/usr/local/bin/rtl_433"]
