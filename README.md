## 🐋 [rtl_433](https://github.com/merbanan/rtl_433) Docker Image

Repository containing [multiarch docker images](https://hub.docker.com/hertzg/rtl_433) definitions of [rtl_433](https://github.com/merbanan/rtl_433) utility from [merbanan](https://github.com/merbanan).

Images use `alpine` linux as base to keep the final result as slim as possible.

The table below describes the tags for each image:

| Docker Image Tag                                                          | Note                      | rlt_433 git version             | alpine version | amd64 | arm64 | arm/v6 | arm/v7 | ppc64le | 386 |
| ------------------------------------------------------------------------- | ------------------------- | ------------------------------- | -------------- | ----- | ----- | ------ | ------ | ------- | --- |
| [latest](https://hub.docker.com/r/hertzg/rtl_433/tags?page=1&name=latest) | Build of latest git tag   | latest `refs/tags/<tagname>`    | `latest`       | ☑     | ☑     | ☑      | ☑      | ☑       | ☑   |
| [master](https://hub.docker.com/r/hertzg/rtl_433/tags?page=1&name=master) | Build of master branch    | `refs/heads/master`             | `latest`       | ☑     | ☑     | ☑      | ☑      | ☑       | ☑   |
| [&lt;tagname&gt;\*](https://hub.docker.com/r/hertzg/rtl_433/tags?page=1)  | Build of each release tag | all other `refs/tags/<tagname>` | `latest`       | ☑     | ☑     | ☑      | ☑      | ☑       | ☑   |

Note: The `latest` tag is an alias for the latest git tag, Image for `master` branch is tagged as `master`

## Usage

The tool is very versatile, you can run in multiple ways. The docker image uses the `rtl_433` executable as `ENTRYPOINT` so all the command line arguments get passed to it when used together with `docker run`.

```shell script
# TODO: Write example with usb device mount
```

## Raspberry Pi

TODO: Notes for running on raspberry pi
