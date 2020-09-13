## 🐋 [rtl_433](https://hub.docker.com/r/hertzg/rtl_433) Docker Image

Repository containing [multiarch docker images](https://hub.docker.com/r/hertzg/rtl_433) definitions of
[rtl_433](https://github.com/merbanan/rtl_433) utility from [merbanan](https://github.com/merbanan).

Images use `alpine` linux as base to keep the final result as slim as possible.

The table below describes the tags for each image:

| Docker Image Tag                                                          | Note                      | rlt_433 git version          | alpine   | amd64 | arm64 | arm/v6 | arm/v7 | ppc64le | 386 |
| ------------------------------------------------------------------------- | ------------------------- | ---------------------------- | -------- | ----- | ----- | ------ | ------ | ------- | --- |
| [latest](https://hub.docker.com/r/hertzg/rtl_433/tags?page=1&name=latest) | Build of latest git tag   | latest `refs/tags/<tagname>` | `latest` | ☑     | ☑     | ☑      | ☑      | ☑       | ☑   |
| [master](https://hub.docker.com/r/hertzg/rtl_433/tags?page=1&name=master) | Build of master branch    | `refs/heads/master`          | `latest` | ☑     | ☑     | ☑      | ☑      | ☑       | ☑   |
| [&lt;tagname&gt;\*](https://hub.docker.com/r/hertzg/rtl_433/tags?page=1)  | Build of ever release tag | all `refs/tags/<tagname>`    | `latest` | ☑     | ☑     | ☑      | ☑      | ☑       | ☑   |

Note: The `latest` tag is an alias for the latest git tag, Image for `master` branch is tagged as `master`

## Usage

The tool is very versatile, you can run in multiple ways. The docker image uses the `rtl_433` executable as `ENTRYPOINT`
so all the command line arguments get passed to it when used together with `docker run`.

First you need to find the bus and device ids for your SDR device. Here I use `lsusb` to find the bus and device ids for
my `RTL2838` receiver.

Same approach should work for other USB devices as well.

```shell script
pi@raspberry:~ $ lsusb
Bus xxx Device xxx: ID xxxx:xxxx ...
Bus xxx Device xxx: ID xxxx:xxxx ...
Bus 001 Device 003: ID 0bda:2838 Realtek Semiconductor Corp. RTL2838 DVB-T
Bus xxx Device xxx: ID xxxx:xxxx ...
Bus xxx Device xxx: ID xxxx:xxxx ...
```

Based on the output my device can be referenced on usb bus `001` as device `003`.

Next we need to start the container and share the `/dev/bus/usb/001/003` device to it using the `--device` or `-d` flag.

```shell script
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433
```

The `--device` or `-d` flag will share the host usb device to the container it will most likely be unusable by the
host or any other containers.

To use specifc version of `rtl_433` use the docker image tags described from the table above

```shell script
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433:master
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433:latest
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433:20.02
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433:18.05
```

To pass arguments to `rtl_433` executable use can use the docker commands by appending them at the end of the run command

```shell script
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 -h
rtl_433 version 20.02 branch  at 202002171252 inputs file rtl_tcp RTL-SDR
Use -h for usage help and see https://triq.org/ for documentation.
Trying conf file at "rtl_433.conf"...
Trying conf file at "/root/.config/rtl_433/rtl_433.conf"...
Trying conf file at "/usr/local/etc/rtl_433/rtl_433.conf"...
Trying conf file at "/etc/rtl_433/rtl_433.conf"...
Generic RF data receiver and decoder for ISM band devices using RTL-SDR and SoapySDR.

Usage:
		= General options =
  [-V] Output the version string and exit
  [-v] Increase verbosity (can be used multiple times).
       -v : verbose, -vv : verbose decoders, -vvv : debug decoders, -vvvv : trace decoding).
  [-c <path>] Read config options from a file
		= Tuner options =
  [-d <RTL-SDR USB device index> | :<RTL-SDR USB device serial> | <SoapySDR device query> | rtl_tcp | help]
  [-g <gain> | help] (default: auto)
  [-t <settings>] apply a list of keyword=value settings for SoapySDR devices
       e.g. -t "antenna=A,bandwidth=4.5M,rfnotch_ctrl=false"
  [-f <frequency>] Receive frequency(s) (default: 433920000 Hz)
  [-H <seconds>] Hop interval for polling of multiple frequencies (default: 600 seconds)
  [-p <ppm_error] Correct rtl-sdr tuner frequency offset error (default: 0)
  [-s <sample rate>] Set sample rate (default: 250000 Hz)
		= Demodulator options =
  [-R <device> | help] Enable only the specified device decoding protocol (can be used multiple times)
       Specify a negative number to disable a device decoding protocol (can be used multiple times)
  [-G] Enable blacklisted device decoding protocols, for testing only.
  [-X <spec> | help] Add a general purpose decoder (prepend -R 0 to disable all decoders)
  [-l <level>] Change detection level used to determine pulses (0-16384) (0=auto) (default: 0)
  [-z <value>] Override short value in data decoder
  [-x <value>] Override long value in data decoder
  [-n <value>] Specify number of samples to take (each sample is 2 bytes: 1 each of I & Q)
  [-Y auto | classic | minmax] FSK pulse detector mode.
		= Analyze/Debug options =
  [-a] Analyze mode. Print a textual description of the signal.
  [-A] Pulse Analyzer. Enable pulse analysis and decode attempt.
       Disable all decoders with -R 0 if you want analyzer output only.
  [-y <code>] Verify decoding of demodulated test data (e.g. "{25}fb2dd58") with enabled devices
		= File I/O options =
  [-S none | all | unknown | known] Signal auto save. Creates one file per signal.
       Note: Saves raw I/Q samples (uint8 pcm, 2 channel). Preferred mode for generating test files.
  [-r <filename> | help] Read data from input file instead of a receiver
  [-w <filename> | help] Save data stream to output file (a '-' dumps samples to stdout)
  [-W <filename> | help] Save data stream to output file, overwrite existing file
		= Data output options =
  [-F kv | json | csv | mqtt | influx | syslog | null | help] Produce decoded output in given format.
       Append output to file with :<filename> (e.g. -F csv:log.csv), defaults to stdout.
       Specify host/port for syslog with e.g. -F syslog:127.0.0.1:1514
  [-M time[:<options>] | protocol | level | stats | bits | help] Add various meta data to each output.
  [-K FILE | PATH | <tag>] Add an expanded token or fixed tag to every output line.
  [-C native | si | customary] Convert units in decoded output.
  [-T <seconds>] Specify number of seconds to run, also 12:34 or 1h23m45s
  [-E hop | quit] Hop/Quit after outputting successful event(s)
  [-h] Output this usage help and exit
       Use -d, -g, -R, -X, -F, -M, -r, -w, or -W without argument for more help
```

To see all the output formatters you can pass `-F` without arguments
```
$ docker run hertzg/rtl_433 -F
rtl_433 version 20.02 branch  at 202002171252 inputs file rtl_tcp RTL-SDR
Use -h for usage help and see https://triq.org/ for documentation.
/usr/local/bin/rtl_433: option requires an argument: F
Trying conf file at "rtl_433.conf"...
Trying conf file at "/root/.config/rtl_433/rtl_433.conf"...
Trying conf file at "/usr/local/etc/rtl_433/rtl_433.conf"...
Trying conf file at "/etc/rtl_433/rtl_433.conf"...
/usr/local/bin/rtl_433: option requires an argument: F
                = Output format option =
  [-F kv|json|csv|mqtt|influx|syslog|null] Produce decoded output in given format.
        Without this option the default is KV output. Use "-F null" to remove the default.
        Append output to file with :<filename> (e.g. -F csv:log.csv), defaults to stdout.
        Specify MQTT server with e.g. -F mqtt://localhost:1883
        Add MQTT options with e.g. -F "mqtt://host:1883,opt=arg"
        MQTT options are: user=foo, pass=bar, retain[=0|1], <format>[=topic]
        Supported MQTT formats: (default is all)
          events: posts JSON event data
          states: posts JSON state data
          devices: posts device and sensor info in nested topics
        The topic string will expand keys like [/model]
        E.g. -F "mqtt://localhost:1883,user=USERNAME,pass=PASSWORD,retain=0,devices=rtl_433[/id]"
        With MQTT each rtl_433 instance needs a distinct driver selection. The MQTT Client-ID is computed from the driver string.
        If you use multiple RTL-SDR, perhaps set a serial and select by that (helps not to get the wrong antenna).
        Specify InfluxDB 2.0 server with e.g. -F "influx://localhost:9999/api/v2/write?org=<org>&bucket=<bucket>,token=<authtoken>"
        Specify InfluxDB 1.x server with e.g. -F "influx://localhost:8086/write?db=<db>&p=<password>&u=<user>"
          Additional parameter -M time:unix:usec:utc for correct timestamps in InfluxDB recommended
        Specify host/port for syslog with e.g. -F syslog:127.0.0.1:1514
```

You can also use `-d`, `-g`, `-R`, `-X`, `-F`, `-M`, `-r`, `-w`, or `-W` without argument for more help on their usages as described in the help.

## Example Usages

Use rtl_433 to capture 433Mhz traffic, decode it and send to your local MQTT broker.

```shell script
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 -Fmqtt://127.0.0.1:1883
```

same as above and also send the data to influxdb

```shell script
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 -Mtime:unix:usec:utc -Fmqtt://127.0.0.1:1883 -Finflux://127.0.0.1:8086/write?db=rtl433
```

same as above but with extra information like signal, protocol information and system stats

```shell script
pi@raspberry:~ $ docker run --device /dev/bus/usb/001/003 hertzg/rtl_433 -Mtime:unix:usec:utc -Mbits -Mlevel -Mprotocol -Mstats:2:300 -Fmqtt://127.0.0.1:1883 -Finflux://127.0.0.1:8086/write?db=rtl433
```

same as above but for `docker-compose.yaml` using MQTT and InfluxDB from the same compose stack

```yaml
version: "3"
services:
  rtl433:
    image: hertzg/rtl_433:latest
    devices:
      - "/dev/bus/usb/001/003"
    command:
      - "-Mtime:unix:usec:utc"
      - "-Mbits"
      - "-Mlevel"
      - "-Mprotocol"
      - "-Mstats:2:300"
      - "-Fmqtt://mosquitto:1883,retain=1"
      - "-Finflux://influxdb:8086/write?db=rtl433"

  mosquitto: ...

  influxdb: ...
```
