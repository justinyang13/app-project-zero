// Minimal service worker — exists only so the app registers as
// "installable" on browsers that still gate that on having a service
// worker present. No offline caching/precaching here by design (see the
// PWA task this came from: fullscreen/installable behavior, not offline
// play) — every request just falls through to the network untouched.
self.addEventListener("fetch", () => {
  // Intentionally not calling event.respondWith(...).
});
