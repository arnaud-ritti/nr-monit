<p align="center">
  <img width="240" src="https://cdn.cdnlogo.com/logos/n/59/new-relic.svg" />
</p>
<h1 align="center">New Relic - Monitoring as Code</h1>
<div align="center">
A GitHub actions to create New Relic synthetic monitoring.
</div>

![](https://img.shields.io/github/workflow/status/arnaud-ritti/nr-monit/CI?style=flat-square)
[![](https://img.shields.io/badge/marketplace-new--relic--monitoring--as--code-blueviolet?style=flat-square)](https://github.com/marketplace/actions/new-relic-monitoring-as-code)
[![](https://img.shields.io/github/v/release/arnaud-ritti/nr-monit?style=flat-square&color=orange)](https://github.com/arnaud-ritti/nr-monit/releases)

## 🚀 How to use?

Create a workflow file in `.github/workflows`

```yaml
name: New Relic Monitor

on: [push, pull_request]

jobs:
  new_relic:
    name: New Relic Monitor
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@main

      - name: Create monitors
        uses: arnaud-ritti/nr-monit@main
        with:
          config: "_monitors.yml" # (Required) Your configuration file, default : _monitors.yml
          api_key: # (Required) Your New Relic API Key
          eu_server: # (Optional) If you use the EU servers
```

Create configuration file `_monitors.yml` at project root.


```yaml
monitors:
  example:
    policy_id: '123456' # string (Optional) Policy Id to attach your synthetic monitoring only location failure conditions will be updated
    name: "example" # string (Required) Name of the check
    type: "SIMPLE" # string (Required) Check type must be one of (SIMPLE, BROWSER, SCRIPT_API, SCRIPT_BROWSER)
    frequency: 10 # integer (Required) Check frequency in minutes must be one of (1, 5, 10, 15, 30, 60, 360, 720, or 1440)
    uri: https://example.com # string (Required for SIMPLE and BROWSER type) URI to check
    locations: 2 # integer or array (Required) If a interger is setted we will use random locations but if your use an array you must add New Relic's server, please check https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api/#list-locations
    status: "ENABLED" # string (Required) Check status must be one of (ENABLED, MUTED, DISABLED)
    slaThreshold: 7.0 # double (Optional)
    options:
      validationString: "Example Domain" # string (Optional) only valid for SIMPLE and BROWSER types
      verifySSL: true # boolean (Optional) only valid for SIMPLE and BROWSER types
      bypassHEADRequest: false # boolean (Optional) only valid for SIMPLE types
      treatRedirectAsFailure: false # boolean (Optional) only valid for SIMPLE types
      scriptfile: "./script.js" # string (Optional) only valid for SCRIPT_API and SCRIPT_BROWSER types
```


## 🤖 How to contribute

| Name | Desc |
| -- | -- |
| package | action build for release |
| format | prettier write |
| format-check | prettier check |
| test | run test |

## ⚡ Feedback

You are very welcome to try it out and put forward your comments. You can use the following methods:

- Report bugs or consult with [Issue](https://github.com/arnaud-ritti/nr-monit/issues)
- Submit [Pull Request](https://github.com/arnaud-ritti/nr-monit/pulls) to improve the code of `nr-monit`

## Changelog

[CHANGELOG](./CHANGELOG.md)

## LICENSE

[MIT](./LICENSE)
