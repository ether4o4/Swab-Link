import type { CapacitorConfig } from '@capacitor/cli'

// Native Android wrapper. The built web app in `dist` is bundled inside the APK,
// so the app launches and runs with no network at all.
const config: CapacitorConfig = {
  appId: 'com.swablink.app',
  appName: 'Swab-Link',
  webDir: 'dist',
  android: {
    // Allow the WebView to keep working offline.
    allowMixedContent: false,
  },
}

export default config
