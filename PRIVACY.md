# Cinera privacy notice

Last updated: November 6, 2026

Cinera does not require an account and does not ask for your name, email address, password, contacts, location, photos, SMS messages or phone records.

## Information stored on your device

The following information is stored locally in the app's WebView storage:

- watchlist entries;
- viewing history and playback position;
- recent searches;
- playback and data-saver preferences; and
- the temporary pairing token for the current phone-remote session.

This data is not synchronized to a Cinera account. Clearing the app's data removes it.

## Network services

Cinera uses a Cloudflare Worker to serve the application, normalize movie and television metadata, select configured playback sources and relay temporary phone-remote WebSocket messages. Cloudflare may process IP addresses, request headers and operational logs as part of providing and protecting the service.

Catalog metadata and artwork can be requested from TMDB. Playback links can open a configured direct media host or a clearly labelled external provider. Those services receive normal network request information and operate under their own privacy policies.

Cinera does not include a custom advertising SDK or a custom behavioral-analytics SDK.

## Microphone

The Android app declares microphone access only for optional voice search. Permission is requested at runtime when voice search needs it. Audio is handled by the device/browser speech-recognition implementation; Cinera does not intentionally record or store microphone audio. You may deny or revoke microphone permission without disabling catalog browsing or normal playback.

## Phone remote

A pairing token connects one screen and one phone remote through a Cloudflare Durable Object. Remote commands and current screen state are relayed over WebSockets to the paired session. The application does not use Bluetooth, contact discovery or local-network device scanning.

## Control and deletion

You can remove locally stored Cinera data through Android Settings → Apps → Cinera → Storage → Clear storage, or by clearing site data in a browser. Uninstalling the APK also removes its local application data.

For questions, open an issue in this repository without including private information.
