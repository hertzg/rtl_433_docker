# 🐋 rtl_433 Docker Image

[![Build](https://github.com/hertzg/rtl_433_docker/actions/workflows/build.yml/badge.svg)](https://github.com/hertzg/rtl_433_docker/actions/workflows/build.yml)
[![Docker Hub](https://img.shields.io/docker/pulls/hertzg/rtl_433)](https://hub.docker.com/r/hertzg/rtl_433)

Multi-architecture Docker images for [rtl_433](https://github.com/merbanan/rtl_433) - a generic data receiver for ISM band devices using RTL-SDR and SoapySDR.

## Quick Start

```bash
# Find your USB device
lsusb | grep RTL

# Run rtl_433 (replace 001/003 with your bus/device)
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433
```

## Image Variants

| Variant | Base | Size | SDR Support |
|---------|------|------|-------------|
| `alpine` (default) | Alpine Linux | ~3 MB | RTL-SDR |
| `debian` | Debian | ~50 MB | RTL-SDR + SoapySDR |

## Image Tags

Images are available from multiple registries:

```
hertzg/rtl_433:<version>-<base>-<base_version>
hertzg/rtl433:<version>-<base>-<base_version>
ghcr.io/hertzg/rtl_433_docker:<version>-<base>-<base_version>
```

### Available Versions

Only the **last 3 releases** plus `master` are built:

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release (Alpine) |
| `master` | Latest development build |
| `25.12`, `25.02`, `24.10` | Specific releases |

### Tag Examples

```bash
docker run hertzg/rtl_433:latest
docker run hertzg/rtl_433:25.12
docker run hertzg/rtl_433:25.12-alpine
docker run hertzg/rtl_433:25.12-debian-trixie
docker run hertzg/rtl_433:master
```

## Usage

### Finding Your USB Device

```bash
$ lsusb
Bus 001 Device 003: ID 0bda:2838 Realtek Semiconductor Corp. RTL2838 DVB-T
```

The device path is `/dev/bus/usb/<bus>/<device>` → `/dev/bus/usb/001/003`

> **Note:** Device paths may change on reboot or replug. See [#14](https://github.com/hertzg/rtl_433_docker/issues/14) for details. For persistent identification, use [serial numbers](#multiple-devices).

### Basic Usage

```bash
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433
```

### Passing Arguments

Arguments are passed directly to `rtl_433`:

```bash
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 -V          # version
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 -F json     # JSON output
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 -R 40 -R 41 # specific decoders
```

### Multiple Devices

When using multiple RTL-SDR dongles, select by serial number ([#45](https://github.com/hertzg/rtl_433_docker/discussions/45), [#82](https://github.com/hertzg/rtl_433_docker/discussions/82)):

```bash
# Find serial numbers
lsusb -v 2>/dev/null | grep -A 5 "RTL2838" | grep iSerial

# Pass entire USB bus and select by serial
docker run --device /dev/bus/usb hertzg/rtl_433 -d :00000001
```

**Setting unique serial numbers:**

```bash
sudo apt install rtl-sdr
rtl_eeprom -s 00000001  # Connect one device at a time
```

### Custom Config File

Mount your config file into the container ([#108](https://github.com/hertzg/rtl_433_docker/discussions/108), [#78](https://github.com/hertzg/rtl_433_docker/discussions/78)):

```bash
docker run --device /dev/bus/usb/001/003 \
  -v /path/to/rtl_433.conf:/etc/rtl_433/rtl_433.conf:ro \
  hertzg/rtl_433
```

Or specify the path explicitly:

```bash
docker run --device /dev/bus/usb/001/003 \
  -v /path/to/my.conf:/config/my.conf:ro \
  hertzg/rtl_433 -c /config/my.conf
```

### Timezone

Set the `TZ` environment variable:

```bash
docker run --device /dev/bus/usb/001/003 \
  -e TZ=America/New_York \
  hertzg/rtl_433 -M time:tz
```

### Rootless Operation

For rootless Docker, set up udev rules on the host ([#118](https://github.com/hertzg/rtl_433_docker/issues/118)):

```bash
# Download udev rules
sudo curl -o /etc/udev/rules.d/rtl-sdr.rules \
  https://raw.githubusercontent.com/osmocom/rtl-sdr/master/rtl-sdr.rules
sudo udevadm control --reload-rules

# Find plugdev group ID
grep plugdev /etc/group

# Run with group access (replace 46 with your plugdev GID)
docker run --device /dev/bus/usb/001/003 \
  --user "$(id -u):$(id -g)" \
  --group-add 46 \
  hertzg/rtl_433
```

## Examples

### MQTT Output

```bash
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 \
  -F mqtt://192.168.1.100:1883
```

### MQTT with Authentication

```bash
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 \
  -F "mqtt://192.168.1.100:1883,user=myuser,pass=mypass"
```

### MQTT + InfluxDB

```bash
docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 \
  -M time:unix:usec:utc \
  -F mqtt://192.168.1.100:1883 \
  -F "influx://192.168.1.100:8086/write?db=rtl433"
```

### Docker Compose

```yaml
services:
  rtl433:
    image: hertzg/rtl_433:latest
    restart: unless-stopped
    devices:
      - /dev/bus/usb/001/003
    environment:
      - TZ=Europe/London
    command:
      - -M time:unix:usec:utc
      - -M protocol
      - -F mqtt://mosquitto:1883,retain=1
      - -F influx://influxdb:8086/write?db=rtl433

  mosquitto:
    image: eclipse-mosquitto:2

  influxdb:
    image: influxdb:1.8
```

**With serial number selection:**

```yaml
services:
  rtl433:
    image: hertzg/rtl_433:latest
    devices:
      - /dev/bus/usb
    command:
      - -d :00000001
      - -F mqtt://mosquitto:1883
```

## Supported Platforms

| Architecture | Alpine | Debian |
|--------------|--------|--------|
| `linux/amd64` | ✅ | ✅ |
| `linux/arm64` | ✅ | ✅ |
| `linux/arm/v7` | ✅ | ✅ |
| `linux/arm/v6` | ✅ | ❌ |
| `linux/ppc64le` | ✅ | ✅ |
| `linux/s390x` | ❌ | ✅ |

## Troubleshooting

### "usb_claim_interface error -6"

Another process is using the device ([#33](https://github.com/hertzg/rtl_433_docker/issues/33)). Unload the kernel driver:

```bash
sudo rmmod dvb_usb_rtl28xxu rtl2832
```

To prevent auto-loading, blacklist the module:

```bash
echo "blacklist dvb_usb_rtl28xxu" | sudo tee /etc/modprobe.d/blacklist-rtl.conf
```

### "PLL not locked" (RTL-SDR Blog V4)

The RTL-SDR Blog V4 requires newer drivers not included in the standard image. See [#106](https://github.com/hertzg/rtl_433_docker/discussions/106) for building a custom image.

### Device not found

```bash
# Verify device exists on host
ls -la /dev/bus/usb/001/003

# Test with privileged mode (debugging only)
docker run --privileged -v /dev/bus/usb:/dev/bus/usb hertzg/rtl_433
```

### Device path changed

Use serial number selection instead of device path ([#14](https://github.com/hertzg/rtl_433_docker/issues/14)):

```bash
docker run --device /dev/bus/usb hertzg/rtl_433 -d :YOUR_SERIAL
```

## Links

- [rtl_433 GitHub](https://github.com/merbanan/rtl_433)
- [rtl_433 Documentation](https://triq.org/)
- [Docker Hub](https://hub.docker.com/r/hertzg/rtl_433)
- [GitHub Container Registry](https://github.com/hertzg/rtl_433_docker/pkgs/container/rtl_433_docker)
