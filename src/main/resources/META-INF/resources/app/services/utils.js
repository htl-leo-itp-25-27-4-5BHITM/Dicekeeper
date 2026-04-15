/**
 * Shared utility functions
 */
export function esc(s) {
  return String(s || '').replace(/[&<>"]/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + ' Min.';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' Std.';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + ' Tage';
  return new Date(timestamp).toLocaleDateString();
}

export function calcMod(score) { return Math.floor((score - 10) / 2); }
export function fmtMod(mod) { return mod >= 0 ? '+' + mod : '' + mod; }

const LOCAL_IMAGE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const DEFAULT_VIEWPORT = { width: 1280, height: 720, dpr: 1 };
const IMAGE_FALLBACK_ONERROR = "if(this.dataset.fallbackApplied!=='1'){this.dataset.fallbackApplied='1';this.srcset='';const picture=this.closest('picture');if(picture){picture.querySelectorAll('source').forEach(source=>source.srcset='');}this.src=this.dataset.fallbackSrc;}";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getViewportMetrics() {
  try {
    const docEl = document.documentElement;
    const width = Math.max(window.innerWidth || 0, docEl?.clientWidth || 0, DEFAULT_VIEWPORT.width);
    const height = Math.max(window.innerHeight || 0, docEl?.clientHeight || 0, DEFAULT_VIEWPORT.height);
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
    return { width, height, dpr };
  } catch (e) {
    return DEFAULT_VIEWPORT;
  }
}

function getResponsiveDimensions(preset, options = {}) {
  const viewport = getViewportMetrics();
  const width = options.width ?? Math.round(viewport.width * preset.widthRatio * viewport.dpr);
  const height = options.height ?? Math.round(viewport.height * preset.heightRatio * viewport.dpr);

  return {
    width: clamp(width, preset.minWidth, preset.maxWidth),
    height: clamp(height, preset.minHeight, preset.maxHeight)
  };
}

function normalizeImagePath(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  return imagePath.startsWith('/') ? imagePath : '/' + imagePath;
}

export function resolveOriginalImageUrl(imagePath) {
  return normalizeImagePath(imagePath);
}

function shouldUseImagor(normalizedPath) {
  if (!normalizedPath || !normalizedPath.startsWith('/uploads/')) return false;
  if (normalizedPath.toLowerCase().endsWith('.svg')) return false;
  try {
    return !LOCAL_IMAGE_HOSTS.has(window.location.hostname);
  } catch (e) {
    return true;
  }
}

function htmlAttr(name, value) {
  if (value === undefined || value === null || value === '') return '';
  return ` ${name}="${esc(value)}"`;
}

function renderResponsivePicture({ sources, imgSrc, fallbackSrc, alt = '', imgId, imgClass, imgStyle, pictureClass, pictureStyle, loading = 'lazy' }) {
  if (!imgSrc) return '';

  const sourceHtml = sources
    .filter(source => source?.src)
    .map(source => `<source${htmlAttr('media', source.media)} srcset="${esc(source.src)}" />`)
    .join('');

  return `<picture${htmlAttr('class', pictureClass)}${htmlAttr('style', pictureStyle)}>${sourceHtml}<img${htmlAttr('id', imgId)}${htmlAttr('class', imgClass)} src="${esc(imgSrc)}" data-fallback-src="${esc(fallbackSrc || imgSrc)}" data-fallback-applied="0" onerror="${IMAGE_FALLBACK_ONERROR}" alt="${esc(alt)}"${htmlAttr('style', imgStyle)}${htmlAttr('loading', loading)} decoding="async" /></picture>`;
}

export function resolveProcessedImageUrl(imagePath, options = {}) {
  const normalizedPath = resolveOriginalImageUrl(imagePath);
  if (!normalizedPath) return '';
  if (!shouldUseImagor(normalizedPath)) return normalizedPath;

  const width = Number.isFinite(Number(options.width)) ? Math.max(0, Math.floor(Number(options.width))) : 0;
  const height = Number.isFinite(Number(options.height)) ? Math.max(0, Math.floor(Number(options.height))) : 0;
  const quality = Number.isFinite(Number(options.quality)) ? Math.max(1, Math.min(100, Math.floor(Number(options.quality)))) : null;
  if (!(width > 0 || height > 0 || options.format || quality || options.smart)) {
    return normalizedPath;
  }

  const params = new URLSearchParams();
  params.set('src', normalizedPath);
  if (width > 0) {
    params.set('w', String(width));
  }
  if (height > 0) {
    params.set('h', String(height));
  }
  params.set('fit', options.fitIn !== false ? 'true' : 'false');
  params.set('smart', options.smart ? 'true' : 'false');
  if (options.format) {
    params.set('format', options.format);
  }
  if (quality) {
    params.set('q', String(quality));
  }
  return `/img?${params.toString()}`;
}

export function resolveAvatarUrl(profilePicture, options = {}) {
  const avatarSize = Number.isFinite(Number(options.cssSize)) ? Number(options.cssSize) : 80;
  const viewport = getViewportMetrics();
  const dimension = clamp(
    Math.round(avatarSize * viewport.dpr * 1.5),
    96,
    384
  );

  return resolveProcessedImageUrl(profilePicture, {
    width: dimension,
    height: dimension,
    quality: 85,
    format: 'webp',
    smart: true,
    fitIn: false,
    ...options
  });
}

export function renderAvatarPicture(profilePicture, options = {}) {
  const normalizedPath = resolveOriginalImageUrl(profilePicture);
  if (!normalizedPath) return '';

  const avatarSize = Number.isFinite(Number(options.cssSize)) ? Number(options.cssSize) : 80;
  const variants = [
    { media: '(max-width: 480px)', size: clamp(Math.round(avatarSize * 2), 96, 160) },
    { media: '(max-width: 1024px)', size: clamp(Math.round(avatarSize * 3), 128, 256) },
    { size: clamp(Math.round(avatarSize * 4), 160, 384) }
  ];
  const transform = {
    quality: 85,
    format: 'webp',
    smart: true,
    fitIn: false
  };
  const sources = variants.map(variant => ({
    media: variant.media,
    src: resolveProcessedImageUrl(normalizedPath, {
      ...transform,
      width: variant.size,
      height: variant.size
    })
  }));
  const defaultSize = variants[variants.length - 1].size;

  return renderResponsivePicture({
    sources,
    imgSrc: resolveProcessedImageUrl(normalizedPath, {
      ...transform,
      width: defaultSize,
      height: defaultSize
    }),
    fallbackSrc: normalizedPath,
    alt: options.alt || 'Avatar',
    imgId: options.imgId,
    imgClass: options.imgClass,
    imgStyle: options.imgStyle || 'width:100%;height:100%;object-fit:cover;display:block;',
    pictureClass: options.pictureClass,
    pictureStyle: options.pictureStyle || 'display:block;width:100%;height:100%;',
    loading: options.loading || 'lazy'
  });
}

/**
 * Resolve a map image path stored in the DB to a valid URL.
 * Uploaded files are served from /uploads/* by the backend and can be routed
 * through imagor in production for resizing/format conversion.
 */
export function resolveMapUrl(mapImagePath, options = {}) {
  const preset = options.variant === 'preview'
    ? { widthRatio: 0.92, heightRatio: 0.55, minWidth: 480, maxWidth: 1600, minHeight: 320, maxHeight: 1200 }
    : { widthRatio: 1.1, heightRatio: 1.1, minWidth: 960, maxWidth: 3200, minHeight: 960, maxHeight: 3200 };
  const dimensions = getResponsiveDimensions(preset, options);

  return resolveProcessedImageUrl(mapImagePath, {
    width: dimensions.width,
    height: dimensions.height,
    quality: 85,
    format: 'webp',
    fitIn: true,
    ...options
  });
}

export function renderMapPicture(mapImagePath, options = {}) {
  const normalizedPath = resolveOriginalImageUrl(mapImagePath);
  if (!normalizedPath) return '';

  const variant = options.variant || 'preview';
  const breakpoints = variant === 'preview'
    ? [
        { media: '(max-width: 600px)', width: 640, height: 420 },
        { media: '(max-width: 1024px)', width: 1024, height: 720 },
        { width: 1600, height: 1200 }
      ]
    : [
        { media: '(max-width: 600px)', width: 1024, height: 768 },
        { media: '(max-width: 1024px)', width: 1600, height: 1200 },
        { width: 2400, height: 1800 }
      ];
  const sources = breakpoints.map(breakpoint => ({
    media: breakpoint.media,
    src: resolveMapUrl(normalizedPath, {
      variant,
      width: breakpoint.width,
      height: breakpoint.height
    })
  }));
  const fallback = breakpoints[breakpoints.length - 1];

  return renderResponsivePicture({
    sources,
    imgSrc: resolveMapUrl(normalizedPath, {
      variant,
      width: fallback.width,
      height: fallback.height
    }),
    fallbackSrc: normalizedPath,
    alt: options.alt || 'Kampagnenkarte',
    imgId: options.imgId,
    imgClass: options.imgClass,
    imgStyle: options.imgStyle || 'width:100%;max-width:100%;display:block;',
    pictureClass: options.pictureClass,
    pictureStyle: options.pictureStyle || 'display:block;width:100%;',
    loading: options.loading || 'lazy'
  });
}
