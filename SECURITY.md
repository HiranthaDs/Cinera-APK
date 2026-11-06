# Security policy

## Supported version

Security fixes are currently applied to the latest `1.1.x` source and APK release on the `main` branch.

## Verify before installing

The repository publishes the APK SHA-256 checksum in [`releases/SHA256SUMS.txt`](releases/SHA256SUMS.txt). Compare that value with your downloaded file before sideloading. The current APK is debug-signed for testing and transparent distribution; it is not represented as a Google Play production build.

## Report a vulnerability

Please use GitHub's private vulnerability-reporting option under the repository's **Security** tab when available. If it is unavailable, contact the repository owner through their GitHub profile before disclosing exploit details publicly. Do not include API tokens, credentials, personal data or active exploit payloads in a public issue.

Useful reports include affected versions, reproducible steps, impact and a minimal proof of concept. Reports involving dependency vulnerabilities should identify the package and fixed version.

## Security boundaries

- The native shell accepts only HTTPS for its configured Cinera origin and blocks cleartext traffic.
- External HTTP(S), mail and telephone links are routed to an installed browser/app when available; an HTTPS-only WebView fallback is used when Android has no compatible handler.
- Web microphone permission is granted only to the configured trusted Cinera origin and only after Android runtime permission.
- The APK does not request broad storage, contacts, location, SMS, phone or accessibility privileges.
- Playback providers and media hosts are external trust boundaries and must be reviewed separately.
