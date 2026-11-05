# Security policy

## Supported versions

Only the latest release of Smart Plants receives security fixes. Older releases don't get
backports, so update to get them. The latest release supports the Home Assistant versions
listed in [Supported versions](docs/installation.md#supported-versions).

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report them privately through GitHub's
[private vulnerability reporting](https://github.com/mikekuss/home-assistant-smart-plants/security/advisories/new).
Include the affected version, a description of the issue, and steps to reproduce.
You can expect an initial response within a few days.

Check diagnostics and logs before you share them. Smart Plants diagnostics never include
OpenPlantBook credentials, only whether they are set. The integration diagnostics contain no
plant names or entity IDs. A plant's own diagnostics from the panel contain its sensor and
automation entity IDs, and logs can contain entries from other integrations.
