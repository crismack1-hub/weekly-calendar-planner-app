import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'au.com.today.app',
  appName: 'Today',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For real device testing against the dev server, set this to your LAN URL:
    // url: 'http://192.168.1.10:5173',
    // cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
