# URL Resolution with JSON Response

## Overview

VSRCPlayer now automatically resolves the `/hls/resolve` URL endpoint to get the actual video source URL from a JSON response.

## How It Works

1. **URL Generation**: When you create a VSRCPlayer instance with a `mediaId`, the player generates a resolve URL:
   ```
   //api.vsrc.video/hls/resolve/{mediaId}
   ```

2. **Automatic Resolution**: Before loading the video, the player makes a `fetch` request with `Content-Type: application/json` header.

3. **JSON Response**: The server responds with a JSON object containing a `ul` key with the actual video URL.

4. **Fallback**: If the JSON response is missing the `ul` key or if the resolution fails, the player uses the original URL.

## Implementation Details

### New Method: `_resolveUrl(url)`

```javascript
async _resolveUrl(url) {
  try {
    // Make GET request with JSON content type
    const response = await fetch(url, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Check if response is OK
    if (response.ok) {
      // Parse JSON response
      const data = await response.json();
      
      // Extract the 'ul' key which contains the video URL
      if (data && data.ul) {
        console.log('VSRCPlayer: Resolved URL from JSON:', data.ul);
        return data.ul;
      } else {
        console.warn('VSRCPlayer: JSON response missing "ul" key, using original URL');
        return url;
      }
    }
    
    // If response not OK, use the original URL
    return url;
  } catch (error) {
    console.warn('VSRCPlayer: Failed to resolve URL, using original:', error);
    return url;
  }
}
```

### New Property: `resolvedSrc`

The player now has a `resolvedSrc` property that stores the resolved URL from the JSON response. This is used for both VOD and live streaming modes.

### Updated Initialization Flow

1. The `_init()` method now calls `_resolveUrl()` before setting up the video source
2. For **VOD** mode: The resolved URL is immediately set as the source
3. For **live** mode: The resolved URL is used during the probing process

## Console Logging

The player now provides detailed console logs for URL resolution:

- `VSRCPlayer: Resolving URL: {url}` - When starting URL resolution
- `VSRCPlayer: Resolved URL from JSON: {url}` - When the URL is successfully resolved from JSON
- `VSRCPlayer: JSON response missing "ul" key, using original URL` - When JSON response doesn't have the `ul` key
- `VSRCPlayer: Response not OK, using original URL` - When the HTTP response is not OK
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

1. **Dynamic URL Resolution**: Automatically resolves video URLs from the API without requiring client-side configuration
2. **CDN Support**: Enables dynamic CDN URL selection on the server side via JSON response
3. **Load Balancing**: Supports server-side load balancing and URL selection
4. **Backwards Compatible**: Works seamlessly with existing code - if the JSON response fails, the original URL is used as fallback

## Testing

A test file is available at `examples/test-redirect.html` to verify the redirect handling functionality.
