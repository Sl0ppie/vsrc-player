import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * AnalyticsReporter - Handles analytics event tracking and reporting
 * Always enabled, cannot be disabled, sends to api.vsrc.video
 */
class AnalyticsReporter {
  constructor(mediaId) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.mediaId = mediaId;
    this.wsUrl = 'wss://api.vsrc.video/ws/analytics';
    this.ajaxUrl = 'https://api.vsrc.video/api/analytics/event';
    this.ws = null;
    this.eventQueue = [];
    this.batchInterval = 5000; // 5 seconds
    this.batchSize = 10;
    this.batchTimer = null;
    
    this._initWebSocket();
    this._startBatchTimer();
  }
  
  _initWebSocket() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('VSRCPlayer Analytics: WebSocket connected');
        this._flushQueue();
      };
      
      this.ws.onerror = (error) => {
        console.log('VSRCPlayer Analytics: WebSocket error, using AJAX fallback');
      };
      
      this.ws.onclose = () => {
        console.log('VSRCPlayer Analytics: WebSocket closed');
        this.ws = null;
        // Try to reconnect after 5 seconds
        setTimeout(() => this._initWebSocket(), 5000);
      };
    } catch (error) {
      console.error('VSRCPlayer Analytics: Failed to initialize WebSocket:', error);
      this.ws = null;
    }
  }
  
  _startBatchTimer() {
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this._flushQueue();
      }
    }, this.batchInterval);
  }
  
  _flushQueue() {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'batch',
        payload: { events }
      }));
    } else {
      // Send via AJAX
      events.forEach(event => this._sendViaAjax(event));
    }
  }
  
  async _sendViaAjax(event) {
    try {
      await fetch(this.ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('VSRCPlayer Analytics: Failed to send event via AJAX:', error);
    }
  }
  
  track(eventType, data = {}) {
    const event = {
      sessionId: this.sessionId,
      mediaId: this.mediaId,
      eventType,
      currentTime: data.currentTime,
      duration: data.duration,
      quality: data.quality,
      bufferDuration: data.bufferDuration,
      errorMessage: data.errorMessage,
      metadata: data.metadata,
    };
    
    // Critical events are sent immediately
    const criticalEvents = ['error', 'ended'];
    if (criticalEvents.includes(eventType)) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'event', payload: event }));
      } else {
        this._sendViaAjax(event);
      }
    } else {
      // Non-critical events are batched
      this.eventQueue.push(event);
      if (this.eventQueue.length >= this.batchSize) {
        this._flushQueue();
      }
    }
  }
  
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Flush any remaining events
    this._flushQueue();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

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
   * @param {string} options.mediaId - Media/video ID (required) - used to generate video source URL
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
   * @note Analytics is always enabled and sends data to api.vsrc.video
   */
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    
    // Validate required mediaId parameter
    if (!options.mediaId) {
      throw new Error('VSRCPlayer: mediaId is required');
    }
    
    // Generate src from mediaId
    const resolveUrl = `//api.vsrc.video/hls/resolve/${options.mediaId}`;
    
    this.options = {
      type: options.type || 'vod',
      src: resolveUrl,
      mediaId: options.mediaId,
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
    this.analytics = null;
    this.probeTimer = null;
    this.probeAttempts = 0;
    this.isProbing = false;
    this.resolvedSrc = null;

    this._init();
  }

  /**
   * Resolve the /hls/resolve URL to get the actual source URL
   * @private
   * @returns {Promise<string>} Resolved URL
   */
  async _resolveUrl(url) {
    try {
      console.log('VSRCPlayer: Resolving URL:', url);
      
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
      console.log('VSRCPlayer: Response not OK, using original URL');
      return url;
    } catch (error) {
      console.warn('VSRCPlayer: Failed to resolve URL, using original:', error);
      return url;
    }
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
      
      // Initialize analytics (always enabled)
      this._initAnalytics();
      
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

    // Resolve the URL and then handle streaming
    if (this.options.src) {
      this._resolveUrl(this.options.src).then(resolvedUrl => {
        this.resolvedSrc = resolvedUrl;
        
        // Handle live streaming with probing
        if (this.options.type === 'live') {
          this._startProbing();
        } else {
          // For VOD, just set the source
          this.setSource(this.resolvedSrc);
        }
      }).catch(error => {
        console.error('VSRCPlayer: Error resolving URL:', error);
        this.options.onError(error);
      });
    }
  }

  /**
   * Initialize analytics tracking (always enabled)
   * @private
   */
  _initAnalytics() {
    // Create analytics reporter
    this.analytics = new AnalyticsReporter(this.options.mediaId);
    
    // Track play event
    this.player.on('play', () => {
      this.analytics.track('play', {
        currentTime: this.player.currentTime(),
        duration: this.player.duration(),
      });
    });
    
    // Track pause event
    this.player.on('pause', () => {
      this.analytics.track('pause', {
        currentTime: this.player.currentTime(),
        duration: this.player.duration(),
      });
    });
    
    // Track seek event
    this.player.on('seeked', () => {
      this.analytics.track('seek', {
        currentTime: this.player.currentTime(),
        duration: this.player.duration(),
      });
    });
    
    // Track ended event
    this.player.on('ended', () => {
      this.analytics.track('ended', {
        currentTime: this.player.currentTime(),
        duration: this.player.duration(),
      });
    });
    
    // Track error event
    this.player.on('error', () => {
      const error = this.player.error();
      this.analytics.track('error', {
        currentTime: this.player.currentTime(),
        duration: this.player.duration(),
        errorMessage: error ? `${error.code}: ${error.message}` : 'Unknown error',
      });
    });
    
    // Track waiting/buffering event
    this.player.on('waiting', () => {
      this.analytics.track('buffer', {
        currentTime: this.player.currentTime(),
        duration: this.player.duration(),
      });
    });
    
    console.log('VSRCPlayer: Analytics initialized (always enabled)');
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

    const urlToProbe = this.resolvedSrc || this.options.src;

    fetch(urlToProbe, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('VSRCPlayer: Probe successful, starting playback');
          this.isProbing = false;
          this._stopProbing();
          this.options.onProbeSuccess(this);
          this.setSource(urlToProbe);
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
    
    // Dispose analytics
    if (this.analytics) {
      this.analytics.destroy();
      this.analytics = null;
    }
    
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
