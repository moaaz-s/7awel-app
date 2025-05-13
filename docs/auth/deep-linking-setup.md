# Deep Linking Configuration for Email Verification

## Overview

This document outlines the necessary configuration to enable deep linking for email verification in the 7awel app. Deep linking allows users to click a verification link in their email and be directed to the app, providing a seamless verification experience.

## Android Configuration

### 1. AndroidManifest.xml

When building with Capacitor for Android, add the following configuration to the `AndroidManifest.xml` file:

```xml
<!-- Inside the <application> tag -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="app.7awwl.com"
          android:pathPrefix="/verify-email"/>
</intent-filter>
```

### 2. Digital Asset Links Configuration

For App Links to work properly on Android, create a `/.well-known/assetlinks.json` file on your server with the following content:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.7awwl.app",
    "sha256_cert_fingerprints": [
      "SHA256 fingerprint of your app's signing certificate"
    ]
  }
}]
```

## iOS Configuration

### 1. Associated Domains Configuration

For iOS, enable Associated Domains in your app's capabilities:

1. In Xcode, select your app target
2. Go to "Signing & Capabilities"
3. Add the "Associated Domains" capability
4. Add an entry: `applinks:app.7awwl.com`

### 2. Apple App Site Association

On your server, create a `/.well-known/apple-app-site-association` file:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TeamID.com.7awwl.app",
        "paths": ["/verify-email*"]
      }
    ]
  }
}
```

## Capacitor Configuration

### 1. Create `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.7awwl.app',
  appName: '7awwl',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorURLScheme: {
      schemes: ['7awwl']
    }
  }
};

export default config;
```

### 2. Handle Deep Links in App Code

```typescript
import { App } from '@capacitor/app';

// Register for deep link handling
App.addListener('appUrlOpen', (event) => {
  // Example: https://app.7awwl.com/verify-email?t=TOKEN
  const slug = event.url.split('/').pop();
  
  if (event.url.includes('/verify-email')) {
    // Extract token from URL
    const urlParams = new URLSearchParams(slug.split('?')[1]);
    const token = urlParams.get('t');
    
    if (token) {
      // Navigate to verification page with token
      // The exact navigation method depends on your routing setup
      router.navigate('/verify-email', { queryParams: { t: token } });
    }
  }
});
```

## Web Implementation

For web implementation, the Next.js app already handles URL parameters in the `/verify-email` route:

```typescript
// app/verify-email/page.tsx
const params = useSearchParams();
const token = params.get("t");

// Use token for verification if present
useEffect(() => {
  if (!token) return;
  
  const verifyToken = async () => {
    const res = await verifyEmailToken(token);
    // Handle verification result
  };
  
  verifyToken();
}, [token]);
```

## Testing Deep Links

### Android

Test Android deep links using adb:

```bash
adb shell am start -a android.intent.action.VIEW -d "https://app.7awwl.com/verify-email?t=test-token" com.7awwl.app
```

### iOS

Test iOS deep links using Safari or in the Notes app by creating a link.

## Troubleshooting

### Common Issues

1. **Links not opening the app**
   - Verify domain verification is set up correctly
   - Ensure URL format exactly matches your intent filter
   - Check for certificate fingerprint mismatches

2. **App opens but doesn't navigate to correct screen**
   - Verify deep link handling code is working correctly
   - Check if the token is being properly extracted from the URL
   - Ensure navigation logic is correct

3. **Deep linking works in development but not production**
   - Confirm production domain matches your configuration
   - Verify signing certificates match between app and digital asset links

## Production Considerations

- Use a consistent domain for your app links
- Ensure all redirects preserve the token parameter
- Consider implementing universal links that work across platforms
- Add appropriate logging to track successful/failed deep link operations

## References

- [Capacitor Deep Linking Documentation](https://capacitorjs.com/docs/guides/deep-links)
- [Android App Links Documentation](https://developer.android.com/training/app-links)
- [iOS Universal Links Documentation](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
