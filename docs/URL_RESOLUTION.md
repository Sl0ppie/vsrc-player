# URL Resolution with Redirect Handling

## Overview

VSRCPlayer now automatically resolves the `/hls/resolve` URL endpoint to handle HTTP redirects (302, 301, 303, 307, 308) and use the final destination URL as the video source.

## How It Works

1. **URL Generation**: When you create a VSRCPlayer instance with a `mediaId`, the player generates a resolve URL:
   ```
   //api.vsrc.video/hls/resolve/{mediaId}
   ```

2. **Automatic Resolution**: Before loading the video, the player makes a `fetch` request with `redirect: 'manual'` to check for redirects.

3. **Redirect Detection**: If the server responds with a redirect (status codes 301-303, 307-308), the player extracts the `Location` header and uses it as the actual video source.

4. **Fallback**: If no redirect is detected or if the resolution fails, the player uses the original URL.

## Implementation Details

### New Method: `_resolveUrl(url)`

```javascript
async _resolveUrl(url) {
  try {
    // Make request with redirect: 'manual' to check for redirects
    const response = await fetch(url, { 
      method: 'HEAD',
      redirect: 'manual'
    });

    // Check if it's a redirect response
    if (response.type === 'opaqueredirect' || 
        (response.status >= 301 && response.status <= 303) || 
        (response.status >= 307 && response.status <= 308)) {
      
      const location = response.headers.get('Location');
      if (location) {
        console.log('VSRCPlayer: Redirect detected, using Location:', location);
        return location;
      }
    }
    
    // No redirect, use the original URL
    return url;
  } catch (error) {
    console.warn('VSRCPlayer: Failed to resolve URL, using original:', error);
    return url;
  }
}
```

### New Property: `resolvedSrc`

The player now has a `resolvedSrc` property that stores the resolved URL after redirect handling. This is used for both VOD and live streaming modes.

### Updated Initialization Flow

1. The `_init()` method now calls `_resolveUrl()` before setting up the video source
2. For **VOD** mode: The resolved URL is immediately set as the source
3. For **live** mode: The resolved URL is used during the probing process

## Console Logging

The player now provides detailed console logs for URL resolution:

- `VSRCPlayer: Resolving URL: {url}` - When starting URL resolution
- `VSRCPlayer: Redirect detected, using Location: {location}` - When a redirect is found
- `VSRCPlayer: No redirect, using original URL` - When no redirect is detected
- `VSRCPlayer: Failed to resolve URL, using original: {error}` - When resolution fails

## Example Usage

No changes are required to your code! The URL resolution happens automatically:

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'vod',
    mediaId: 'my-video-123',
    onReady: (player) => {
        console.log('Player is ready!');
        // player.resolvedSrc contains the final URL after redirect handling
    }
});
```

## Benefits

1. **Transparent Redirects**: Automatically follows server-side URL redirects without requiring client-side configuration
2. **CDN Support**: Enables dynamic CDN URL selection on the server side
3. **Load Balancing**: Supports server-side load balancing via redirects
4. **Backwards Compatible**: Works seamlessly with existing code - if there's no redirect, the original URL is used

## Testing

A test file is available at `examples/test-redirect.html` to verify the redirect handling functionality.
