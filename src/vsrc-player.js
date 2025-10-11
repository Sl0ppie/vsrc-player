import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * VSRCPlayer - A wrapper around video.js with additional features
 * Supports both VOD (Video on Demand) and live streaming
 */
class VSRCPlayer {
  /**
   * Create a new VSRCPlayer instance
   * @param {string|Element} element - The video element or selector
   * @param {Object} options - Player options
   * @param {string} options.type - 'vod' or 'live'
   * @param {string} options.src - Video source URL
   * @param {number} options.probeInterval - Interval for probing m3u8 (milliseconds, default: 5000)
   * @param {number} options.maxProbeAttempts - Maximum probe attempts (default: 12)
   * @param {Function} options.onReady - Callback when player is ready
   * @param {Function} options.onError - Callback when error occurs
   * @param {Function} options.onProbeSuccess - Callback when m3u8 probe succeeds
   * @param {Function} options.onProbeFailed - Callback when m3u8 probe fails
   * @param {Object|boolean} options.chat - Chat configuration or false to disable
   * @param {string|Element} options.chat.element - Chat container element or selector
   * @param {string} options.chat.serverUrl - WebSocket server URL
   * @param {string} options.chat.username - Username for chat
   * @param {Object} options.chat.colors - Chat color palette
   */
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    this.options = {
      type: options.type || 'vod',
      src: options.src || '',
      probeInterval: options.probeInterval || 5000,
      maxProbeAttempts: options.maxProbeAttempts || 12,
      onReady: options.onReady || (() => {}),
      onError: options.onError || (() => {}),
      onProbeSuccess: options.onProbeSuccess || (() => {}),
      onProbeFailed: options.onProbeFailed || (() => {}),
      chat: options.chat || false,
      ...options
    };

    this.player = null;
    this.chat = null;
    this.probeTimer = null;
    this.probeAttempts = 0;
    this.isProbing = false;

    this._init();
  }

  /**
   * Initialize the player
   * @private
   */
  _init() {
    // Video.js options
    const vjsOptions = {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      responsive: true,
      liveui: this.options.type === 'live',
      ...this.options.vjsOptions
    };

    // Initialize video.js
    this.player = videojs(this.element, vjsOptions, () => {
      console.log('VSRCPlayer: Player initialized');
      
      // Initialize chat if configured
      if (this.options.chat) {
        this._initChat();
      }
      
      this.options.onReady(this);
    });

    // Setup error handling
    this.player.on('error', (error) => {
      console.error('VSRCPlayer: Error occurred', error);
      this.options.onError(error);
    });

    // Handle live streaming with probing
    if (this.options.type === 'live' && this.options.src) {
      this._startProbing();
    } else if (this.options.src) {
      // For VOD, just set the source
      this.setSource(this.options.src);
    }
  }

  /**
   * Initialize chat component
   * @private
   */
  _initChat() {
    // Load VSRCChat dynamically if available
    if (typeof VSRCChat === 'undefined') {
      console.warn('VSRCPlayer: VSRCChat not loaded. Include vsrc-chat.js to enable chat.');
      return;
    }

    if (!this.options.chat.element) {
      console.error('VSRCPlayer: Chat element not specified in options.chat.element');
      return;
    }

    try {
      this.chat = new VSRCChat(this.options.chat.element, {
        serverUrl: this.options.chat.serverUrl,
        username: this.options.chat.username,
        colors: this.options.chat.colors,
        onMessage: this.options.chat.onMessage,
        onConnect: this.options.chat.onConnect,
        onDisconnect: this.options.chat.onDisconnect
      });
      console.log('VSRCPlayer: Chat initialized');
    } catch (error) {
      console.error('VSRCPlayer: Failed to initialize chat', error);
    }
  }

  /**
   * Start probing for m3u8 file
   * @private
   */
  _startProbing() {
    if (this.isProbing) {
      return;
    }

    this.isProbing = true;
    this.probeAttempts = 0;
    console.log('VSRCPlayer: Starting m3u8 probe...');

    this._probe();
  }

  /**
   * Probe for m3u8 file
   * @private
   */
  _probe() {
    this.probeAttempts++;
    console.log(`VSRCPlayer: Probe attempt ${this.probeAttempts}/${this.options.maxProbeAttempts}`);

    fetch(this.options.src, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('VSRCPlayer: Probe successful, starting playback');
          this.isProbing = false;
          this._stopProbing();
          this.options.onProbeSuccess(this);
          this.setSource(this.options.src);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      })
      .catch(error => {
        console.log(`VSRCPlayer: Probe attempt ${this.probeAttempts} failed:`, error.message);

        if (this.probeAttempts >= this.options.maxProbeAttempts) {
          console.error('VSRCPlayer: Max probe attempts reached');
          this.isProbing = false;
          this._stopProbing();
          this.options.onProbeFailed(this);
          this.options.onError(new Error('Failed to locate m3u8 file'));
        } else {
          // Schedule next probe
          this.probeTimer = setTimeout(() => {
            this._probe();
          }, this.options.probeInterval);
        }
      });
  }

  /**
   * Stop probing
   * @private
   */
  _stopProbing() {
    if (this.probeTimer) {
      clearTimeout(this.probeTimer);
      this.probeTimer = null;
    }
  }

  /**
   * Set video source
   * @param {string} src - Video source URL
   * @param {string} type - MIME type (optional)
   */
  setSource(src, type) {
    const source = {
      src: src,
      type: type || this._detectType(src)
    };

    console.log('VSRCPlayer: Setting source', source);
    this.player.src(source);
  }

  /**
   * Detect video type from URL
   * @private
   * @param {string} src - Video source URL
   * @returns {string} MIME type
   */
  _detectType(src) {
    if (src.includes('.m3u8')) {
      return 'application/x-mpegURL';
    } else if (src.includes('.mp4')) {
      return 'video/mp4';
    } else if (src.includes('.webm')) {
      return 'video/webm';
    } else if (src.includes('.ogv')) {
      return 'video/ogg';
    }
    return 'video/mp4'; // default
  }

  /**
   * Play video
   */
  play() {
    if (this.player) {
      return this.player.play();
    }
  }

  /**
   * Pause video
   */
  pause() {
    if (this.player) {
      this.player.pause();
    }
  }

  /**
   * Get current time
   * @returns {number} Current time in seconds
   */
  currentTime() {
    return this.player ? this.player.currentTime() : 0;
  }

  /**
   * Set current time
   * @param {number} seconds - Time in seconds
   */
  seek(seconds) {
    if (this.player) {
      this.player.currentTime(seconds);
    }
  }

  /**
   * Get/Set volume
   * @param {number} level - Volume level (0-1)
   * @returns {number} Current volume level
   */
  volume(level) {
    if (this.player) {
      if (level !== undefined) {
        this.player.volume(level);
      }
      return this.player.volume();
    }
    return 0;
  }

  /**
   * Check if video is playing
   * @returns {boolean} True if playing
   */
  isPlaying() {
    return this.player ? !this.player.paused() : false;
  }

  /**
   * Dispose the player
   */
  dispose() {
    this._stopProbing();
    
    // Dispose chat if initialized
    if (this.chat) {
      this.chat.disconnect();
      this.chat = null;
    }
    
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
  }

  /**
   * Get the underlying video.js player instance
   * @returns {Object} video.js player instance
   */
  getPlayer() {
    return this.player;
  }

  /**
   * Get the chat instance
   * @returns {Object} VSRCChat instance or null
   */
  getChat() {
    return this.chat;
  }
}

export default VSRCPlayer;
