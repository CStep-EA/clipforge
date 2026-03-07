/**
 * capacitor.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Capacitor configuration for Klip4ge native iOS + Android builds.
 *
 * To bootstrap native projects (run once after `npm install`):
 *   npx cap add ios
 *   npx cap add android
 *
 * To sync web build into native projects:
 *   npm run build && npx cap sync
 *
 * To open in Xcode / Android Studio:
 *   npx cap open ios
 *   npx cap open android
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'app.klip4ge.app',
  appName: 'Klip4ge',
  webDir:  'dist',          // Vite output directory

  // ── Server ────────────────────────────────────────────────────────────────
  server: {
    // In development, point to your local Vite dev server for live reload.
    // Comment this out for production builds.
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,

    // Production: serve from bundled assets
    hostname:         'klip4ge.app',
    androidScheme:    'https',
    iosScheme:        'https',
    allowNavigation:  [
      'https://klip4ge.app',
      'https://*.base44.com',
      'https://www.facebook.com',
      'https://m.facebook.com',
      'https://web.facebook.com',
      'https://www.instagram.com',
      'https://www.pinterest.com',
      'https://twitter.com',
      'https://x.com',
    ],
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: {

    // In-App Browser — used for the hidden background WebView scraper
    InAppBrowser: {
      // Toolbar is hidden when running in background mode (see inAppBrowser.js)
      closeButtonText:      'Close',
      toolbarColor:         '#0F1117',
      navigationButtonColor:'#00BFFF',
      showURL:              true,
      showToolbar:          true,
      allowZoom:            true,
    },

    // Push notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Local notifications (background sync completion alerts)
    LocalNotifications: {
      smallIcon:   'ic_stat_icon_config_sample',
      iconColor:   '#00BFFF',
      sound:       'beep.wav',
    },

    // Background fetch — periodic silent sync
    BackgroundFetch: {
      minimumFetchInterval: 60,           // minutes — iOS minimum is 15
      stopOnTerminate:      false,         // continue after app killed (Android)
      enableHeadless:       true,          // Android headless mode
      requiredNetworkType:  'ANY',         // NONE | ANY | UNMETERED
      requiresBatteryNotLow: false,
      requiresStorageNotLow: false,
      requiresCharging:      false,
      requiresDeviceIdle:    false,
    },

    // Share extension (receives shares from other apps)
    SplashScreen: {
      launchShowDuration:   2000,
      launchAutoHide:       true,
      backgroundColor:      '#0F1117',
      androidSplashResourceName: 'splash',
      androidScaleType:     'CENTER_CROP',
      showSpinner:          false,
      splashFullScreen:     true,
      splashImmersive:      true,
    },

    // Keyboard
    Keyboard: {
      resize:               'body',
      style:                'dark',
      resizeOnFullScreen:   true,
    },

    // Status bar
    StatusBar: {
      style:                'dark',
      backgroundColor:      '#0F1117',
    },

    // Haptics (for save confirmation feedback)
    Haptics: {},

    // Network status monitoring
    Network: {},

    // Preferences (replaces localStorage for native)
    Preferences: {
      group: 'klip4ge',
    },

    // App — deep link / URL handling
    App: {
      // iOS URL scheme for deep links: klip4ge://
      // Android intent filter configured in AndroidManifest.xml
    },
  },

  // ── iOS-specific ──────────────────────────────────────────────────────────
  ios: {
    contentInset:       'automatic',
    allowsLinkPreview:  false,
    scrollEnabled:      true,
    limitsNavigationsToAppBoundDomains: false,
    // entitlements handled in native/ios/App/App.entitlements
  },

  // ── Android-specific ─────────────────────────────────────────────────────
  android: {
    allowMixedContent:  false,
    captureInput:       true,
    webContentsDebuggingEnabled: false,   // set true for dev builds
    // buildOptions in native/android/app/build.gradle
  },
};

export default config;
