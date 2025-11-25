/**
 * Utility function to get the correct image URL
 * Handles both external URLs (Discord avatars) and local paths
 * @param {string} path - The image path or URL
 * @param {boolean} bustCache - Whether to add cache-busting timestamp
 * @returns {string|null} The formatted image URL or null if path is empty
 */
export const getImageUrl = (path, bustCache = false) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const url = `/${cleanPath}`;
  return bustCache ? `${url}?t=${Date.now()}` : url;
};
