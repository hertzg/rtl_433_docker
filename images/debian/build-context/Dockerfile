ARG debianVersion=latest
FROM debian:${debianVersion} as builder

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libusb-1.0-0-dev \
    libsoapysdr-dev \
    librtlsdr-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /build

RUN git clone https://github.com/merbanan/rtl_433
WORKDIR ./rtl_433
ARG rtl433GitRevision=master
RUN git checkout ${rtl433GitRevision}
WORKDIR ./build
RUN cmake ..
RUN make -j 4
RUN cat Makefile
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
    libsoapysdr0.6 \
    soapysdr0.6-module-all \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /root
COPY --from=builder /build/root/ /

ENTRYPOINT ["/usr/local/bin/rtl_433"]
