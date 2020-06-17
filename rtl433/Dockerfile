ARG alpineVersion=latest
FROM alpine:${alpineVersion} as builder

RUN apk add --no-cache --virtual .buildDeps \
    build-base \
    libusb-dev \
    librtlsdr-dev \
    cmake \
    git

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

ARG alpineVersion=latest
FROM alpine:${alpineVersion}

ARG rtl433GitRevision=master
LABEL maintainer="georgedot@gmail.com" \
    vcs-ref="${rtl433GitRevision}"

RUN apk add --no-cache libusb librtlsdr
WORKDIR /root
COPY --from=builder /build/root/ /

ENTRYPOINT /usr/local/bin/rtl_433
