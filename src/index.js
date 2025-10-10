import VSRCPlayer from './vsrc-player.js';

// Export for ES modules
export default VSRCPlayer;

// Also attach to window for browser usage
if (typeof window !== 'undefined') {
  window.VSRCPlayer = VSRCPlayer;
}
