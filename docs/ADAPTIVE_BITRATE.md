# Adaptive Bitrate Streaming in VSRCPlayer

## Overview

VSRCPlayer now fully supports adaptive bitrate streaming for multi-variant HLS streams through the VideoJS HTTP Streaming (VHS) plugin. This document explains how adaptive bitrate streaming works and how to configure it.

## What is Adaptive Bitrate Streaming?

Adaptive bitrate streaming automatically adjusts video quality in real-time based on:

- **Network Bandwidth**: The player measures available bandwidth during playback
- **Player Dimensions**: Prevents downloading unnecessarily high resolutions for small players
- **Device Capabilities**: Can account for high-DPI displays (Retina, etc.)
- **Network Conditions**: Automatically switches to lower quality during congestion

## How It Works

The VHS plugin automatically:

1. Measures download bandwidth for each segment
2. Filters available variants based on current bandwidth
3. Considers player dimensions (if enabled)
4. Selects the highest quality variant that meets all criteria
5. Switches variants seamlessly during playback

## Configuration Options

### limitRenditionByPlayerDimensions

**Type**: `boolean`  
**Default**: `true`

When enabled, the player considers player size when selecting variants. This prevents downloading a 4K stream for a 480p player, saving bandwidth.

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        limitRenditionByPlayerDimensions: true
    }
});
```

**Use Case**: Always enabled for efficient bandwidth usage, especially on mobile devices or small player windows.

### enableLowInitialPlaylist

**Type**: `boolean`  
**Default**: `false`

When enabled, the player starts with the lowest bitrate variant, then adapts upward. This reduces initial buffering time and provides faster start-up.

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        enableLowInitialPlaylist: true
    }
});
```

**Use Case**: Recommended for:
- Mobile networks with variable bandwidth
- Streams where fast start-up is critical
- Users on slower connections

### useDevicePixelRatio

**Type**: `boolean`  
**Default**: `false`

When enabled, the player considers the device pixel ratio for high-DPI displays. A 540p player on a 2x display (like Retina) will allow 1080p variants.

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        useDevicePixelRatio: true,
        limitRenditionByPlayerDimensions: true  // Must be true
    }
});
```

**Use Case**: Enable for high-DPI displays to ensure sharp video quality on Retina screens and similar devices.

### bandwidth

**Type**: `number`  
**Default**: Automatically detected

Sets an initial bandwidth estimate in bits per second. Useful if you know the user's connection speed ahead of time.

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        bandwidth: 5000000  // 5 Mbps initial estimate
    }
});
```

**Use Case**: 
- Set based on user's connection type (WiFi, 4G, 5G)
- Pre-seed with previous session's bandwidth
- Override automatic detection for testing

### useBandwidthFromLocalStorage

**Type**: `boolean`  
**Default**: `false`

When enabled, bandwidth estimates are persisted in localStorage and reused across sessions. This provides better initial quality selection for returning users.

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        useBandwidthFromLocalStorage: true
    }
});
```

**Use Case**: Enable for better user experience on repeat visits, especially for VOD content.

## Common Configuration Scenarios

### Scenario 1: Fast Start-Up (Mobile/Low Bandwidth)

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        enableLowInitialPlaylist: true,
        limitRenditionByPlayerDimensions: true,
        useBandwidthFromLocalStorage: true
    }
});
```

### Scenario 2: High-Quality Desktop Experience

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        limitRenditionByPlayerDimensions: false,  // Allow any quality
        bandwidth: 10000000,  // 10 Mbps initial
        useDevicePixelRatio: true
    }
});
```

### Scenario 3: Retina/High-DPI Display

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        useDevicePixelRatio: true,
        limitRenditionByPlayerDimensions: true
    }
});
```

### Scenario 4: Consistent Quality Testing

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    vhs: {
        bandwidth: 5000000,  // Fixed 5 Mbps
        limitRenditionByPlayerDimensions: false
    }
});
```

## Monitoring Quality Changes

You can monitor quality changes by accessing the VHS tech:

```javascript
const player = new VSRCPlayer('#my-player', {
    type: 'live',
    mediaId: 'my-stream',
    onReady: (playerInstance) => {
        const vjsPlayer = playerInstance.getPlayer();
        const tech = vjsPlayer.tech({ IWillNotUseThisInPlugins: true });
        
        if (tech && tech.vhs) {
            // Get current quality
            setInterval(() => {
                const currentPlaylist = tech.vhs.playlists.media();
                if (currentPlaylist) {
                    const resolution = currentPlaylist.attributes.RESOLUTION;
                    const bandwidth = currentPlaylist.attributes.BANDWIDTH;
                    
                    console.log(`Current quality: ${resolution.width}x${resolution.height} @ ${bandwidth} bps`);
                }
                
                // Get bandwidth estimate
                console.log(`Bandwidth estimate: ${tech.vhs.systemBandwidth} bps`);
            }, 5000);
        }
    }
});
```

## Troubleshooting

### Player Not Switching Variants

1. **Check player dimensions**: If `limitRenditionByPlayerDimensions` is `true`, the player won't switch to qualities higher than necessary for the player size.
2. **Verify multi-variant playlist**: Ensure your M3U8 file contains multiple variants.
3. **Check bandwidth**: Low bandwidth may prevent switching to higher qualities.

### Always Starting with Low Quality

1. Set `enableLowInitialPlaylist: false`
2. Set an initial `bandwidth` estimate
3. Enable `useBandwidthFromLocalStorage` for returning users

### Quality Too Low for Retina Display

1. Enable `useDevicePixelRatio: true`
2. Ensure `limitRenditionByPlayerDimensions: true`

## Best Practices

1. **Always enable dimension limiting** for bandwidth efficiency (default behavior)
2. **Use low initial playlist** for mobile and slower connections
3. **Enable bandwidth persistence** for returning users
4. **Consider device pixel ratio** for high-DPI displays
5. **Test with real network conditions** using browser DevTools network throttling

## Example Test Page

See `examples/adaptive-bitrate-test.html` for a comprehensive interactive example that demonstrates all VHS configuration options.

## References

- [VideoJS HTTP Streaming Documentation](https://github.com/videojs/http-streaming)
- [HLS Specification](https://datatracker.ietf.org/doc/html/rfc8216)
- [VHS Bitrate Switching Behavior](https://github.com/videojs/http-streaming/blob/main/docs/bitrate-switching.md)
