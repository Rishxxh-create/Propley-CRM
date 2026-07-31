const ENX_PLAYER_TOOLBAR = {
  displayMode: 'auto' as const,
  branding: { display: false },
  buttons: {
    play: false, share: false, mic: false, resize: false,
    volume: false, mute: false, record: false, playtime: false, zoom: false,
  },
};

export const ENX_PLAYER_OPTIONS = {
  player: {
    autoplay: '',
    frameFitMode: 'bestFit',
    skin: 'classic',
    height: '100%',
    width: '100%',
    volume: 1,
    class: 'object-cover w-full h-full',
    loader: { show: false },
  },
  toolbar: ENX_PLAYER_TOOLBAR,
};

/** joinRoom 4th arg (reconnectInfo) — SDK retries the media session itself before giving up. */
export const ENX_RECONNECT_OPTIONS = {
  allow_reconnect: true,
  number_of_attempts: 5,
  timeout_interval: 90_000,
};

/** Screen share (stream 101). confo1.js `PlayerOpt` — no toolbar/branding chrome. */
export const ENX_SHARE_PLAYER_OPTIONS = {
  player: { height: '100%', width: '100%' },
  toolbar: { displayMode: false, branding: { display: false } },
};

/** DOM containers the SDK plays the shared screen (stream 101) into (one per surface). */
export const SHARE_CONTAINER_ID = {
  moderator: 'screen_share_moderator',
  participant: 'screen_share_participant',
} as const;

/** Stable wrappers around the slide <iframe> — the region a screen share is cropped to (one per
 * surface). The crop binds to this element instance, so it must never remount mid-share. */
export const PRESENTATION_STAGE_ID = {
  moderator: 'presentation-stage-moderator',
  participant: 'presentation-stage-participant',
} as const;

/**
 * Crop an in-progress screen share to ONLY the presentation rectangle (the slide iframe) using
 * Region Capture. The presenter shares the whole current tab (preferCurrentTab), and this crops
 * the captured video track down to the slide element's on-screen box so the video sidebar, footer
 * controls and header are excluded.
 *
 * Region Capture (CropTarget + MediaStreamTrack.cropTo) is Chromium-only (104+). Everything here is
 * best-effort and fully guarded: if unsupported or anything throws, the share simply stays full-tab.
 * `shareStream` is the EnableX stream wrapper (room.ScreenSharelocalStream); its native MediaStream
 * is on `.stream`.
 */
// Experimental Region Capture APIs not yet in the TS DOM lib.
type CropTargetLike = unknown;
interface CropTargetStatic { fromElement(el: Element): Promise<CropTargetLike> }
type CroppableTrack = MediaStreamTrack & { cropTo(target: CropTargetLike): Promise<void> };

export async function cropShareToElement(getShareStream: () => unknown, elementId: string): Promise<void> {
  try {
    if (typeof document === 'undefined') return;
    const CropTarget = (window as unknown as { CropTarget?: CropTargetStatic }).CropTarget;
    if (!CropTarget?.fromElement) { console.warn('[crop] CropTarget unsupported → full tab'); return; }

    // Both the iframe element and the captured track can lag the share-start by a tick — poll for
    // BOTH (re-reading the live share stream via the getter) before giving up (full-tab fallback).
    const resolveTrack = (): CroppableTrack | undefined => {
      const native = (getShareStream() as { stream?: MediaStream } | undefined)?.stream;
      const track = native?.getVideoTracks?.()[0];
      return track && typeof (track as Partial<CroppableTrack>).cropTo === 'function'
        ? (track as CroppableTrack)
        : undefined;
    };

    const ready = await new Promise<{ el: HTMLElement; track: CroppableTrack } | null>((resolve) => {
      let tries = 0;
      const tick = () => {
        const el = document.getElementById(elementId);
        const track = resolveTrack();
        if (el && track) { resolve({ el, track }); return; }
        if (++tries >= 30) { resolve(null); return; } // ~3s
        window.setTimeout(tick, 100);
      };
      tick();
    });

    if (!ready) {
      console.warn('[crop] gave up → full tab. element:', !!document.getElementById(elementId), 'track:', !!resolveTrack());
      return;
    }

    const target = await CropTarget.fromElement(ready.el);
    await ready.track.cropTo(target);
    console.log('[crop] applied cropTo on', elementId, 'track', ready.track.id);
  } catch (e) {
    console.warn('[crop] failed → full tab:', e);
  }
}

/**
 * Force EnableX's screen share to capture the CURRENT presentation tab instead of letting the
 * presenter pick any screen/window. The SDK builds its own getDisplayMedia constraints and never
 * exposes preferCurrentTab, so we temporarily patch navigator.mediaDevices.getDisplayMedia to
 * inject it, run the share-start (`fn`), and restore the original.
 *
 * The SDK calls getDisplayMedia ASYNCHRONOUSLY (after an auxilaryPublishRequests round-trip), so we
 * can't restore synchronously — the patch self-restores on the first invocation, with a safety
 * timeout fallback. No-op on browsers without preferCurrentTab support (Firefox/Safari).
 */
export function withCurrentTabCapture<T>(fn: () => T): T {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    return fn();
  }

  const md = navigator.mediaDevices;
  const original = md.getDisplayMedia.bind(md);
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    md.getDisplayMedia = original;
  };

  md.getDisplayMedia = (constraints?: DisplayMediaStreamOptions) => {
    restore(); // one-shot: subsequent shares use the unpatched call until re-wrapped
    // preferCurrentTab/selfBrowserSurface aren't in the TS lib DisplayMediaStreamOptions yet.
    const patched = {
      ...constraints,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      video: constraints?.video ?? true,
    } as DisplayMediaStreamOptions;
    return original(patched);
  };

  // Fallback: if the SDK never calls getDisplayMedia (error before capture), undo the patch.
  setTimeout(restore, 5000);

  return fn();
}

/** Participant strip: 16:9 card + letterbox (contain). crop: false → EnableX resize uses 16/9. */
export const ENX_PLAYER_OPTIONS_CONTAIN = {
  crop: false,
  resizer: false,
  player: {
    autoplay: '',
    frameFitMode: 'bestFit',
    skin: 'classic',
    height: '100%',
    width: '100%',
    volume: 1,
    class: 'object-contain w-full h-full',
    loader: { show: false },
  },
  toolbar: ENX_PLAYER_TOOLBAR,
};

/** Override EnableX inline sizing (width/height/top) so CSS contain can center in the card. */
export function applyParticipantVideoFit(containerId: string): () => void {
  if (typeof document === 'undefined') return () => {};

  const apply = () => {
    const container = document.getElementById(containerId);
    if (!container) return false;

    container.querySelectorAll<HTMLElement>('.vcx_player').forEach((player) => {
      player.style.position = 'absolute';
      player.style.inset = '0';
      player.style.width = '100%';
      player.style.height = '100%';
      player.style.overflow = 'hidden';
    });

    container.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
      video.style.position = 'absolute';
      video.style.inset = '0';
      video.style.top = '0';
      video.style.left = '0';
      video.style.right = '0';
      video.style.bottom = '0';
      video.style.margin = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.maxWidth = '160px';
      video.style.maxHeight = '80px';
      video.style.objectFit = 'cover';
      video.style.objectPosition = 'center';
    });

    return !!container.querySelector('video');
  };

  // Apply once immediately; if video isn't mounted yet, observe until it appears then disconnect.
  if (apply()) return () => {};

  const container = document.getElementById(containerId);
  if (!container) return () => {};

  let stopped = false;
  const observer = new MutationObserver(() => {
    if (stopped) return;
    if (apply()) {
      observer.disconnect();
      stopped = true;
    }
  });
  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
  });

  // Safety: never keep observers alive for long.
  const stop = window.setTimeout(() => {
    observer.disconnect();
    stopped = true;
  }, 2500);

  return () => {
    observer.disconnect();
    window.clearTimeout(stop);
    stopped = true;
  };
}

/**
 * Override EnableX inline sizing so portrait (9:16) video from mobile clients is
 * letterboxed (object-contain) inside a 16:9 observer sidebar card, rather than
 * being cropped with object-cover. The SDK continuously re-applies its own inline
 * styles, so we keep a MutationObserver alive to fight back.
 */
export function applyObserverVideoContain(containerId: string): () => void {
  if (typeof document === 'undefined') return () => {};

  const apply = () => {
    const container = document.getElementById(containerId);
    if (!container) return false;

    container.querySelectorAll<HTMLElement>('.vcx_player').forEach((player) => {
      player.style.position = 'absolute';
      player.style.inset = '0';
      player.style.width = '100%';
      player.style.height = '100%';
      player.style.overflow = 'hidden';
    });

    container.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
      video.style.position = 'absolute';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      video.style.objectFit = 'contain';
      video.style.objectPosition = 'center';
      video.style.margin = '0';
    });

    return !!container.querySelector('video');
  };

  // Apply once immediately.
  apply();

  const container = document.getElementById(containerId);
  if (!container) return () => {};

  let stopped = false;
  const observer = new MutationObserver(() => {
    if (stopped) return;
    apply();
  });
  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
  });

  // Keep alive longer — the SDK can re-apply styles after resize/orientation events.
  const stop = window.setTimeout(() => {
    observer.disconnect();
    stopped = true;
  }, 8000);

  return () => {
    observer.disconnect();
    window.clearTimeout(stop);
    stopped = true;
  };
}

/**
 * The SDK plays the shared screen (stream 101) into the container but leaves the <video>
 * paused — Chrome blocks autoplay when our area flips from hidden to visible without a user
 * gesture, so it renders black. Mute it (share has no useful audio) to make autoplay allowed,
 * then call play(). Retries briefly until the SDK's element appears, then stops.
 */
export function playSharedScreen(containerId: string): () => void {
  if (typeof document === 'undefined') return () => {};

  let stopped = false;
  const play = () => {
    const container = document.getElementById(containerId);
    const video = container?.querySelector<HTMLVideoElement>('video');
    if (!video) return false;
    video.muted = true;
    video.playsInline = true;
    if (video.paused) video.play?.().catch(() => {});
    return !video.paused && video.videoWidth > 2;
  };

  if (play()) return () => {};

  const interval = window.setInterval(() => {
    if (stopped) return;
    if (play()) { window.clearInterval(interval); stopped = true; }
  }, 200);
  const stop = window.setTimeout(() => { window.clearInterval(interval); stopped = true; }, 8000);

  return () => {
    window.clearInterval(interval);
    window.clearTimeout(stop);
    stopped = true;
  };
}

export function muteLocalPlayback(containerId: string) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const apply = () => {
    const video = container.querySelector('video');
    if (video) { video.muted = true; return true; }
    return false;
  };
  if (apply()) return;
  const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
  observer.observe(container, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 5000);
}

/**
 * iOS WebKit pauses media on audio-session interruptions (lock, call, app switch) and
 * refuses unmuted autoplay without an active capture or user gesture. Re-issue play()
 * for paused elements on any gesture and on returning to the foreground; muted state is
 * left untouched so local self-views stay silent.
 */
export function installIosAudioUnlock(): () => void {
  if (typeof document === 'undefined') return () => {};
  const resume = () => {
    document.querySelectorAll<HTMLMediaElement>('video, audio').forEach((media) => {
      (media as HTMLVideoElement).playsInline = true;
      media.setAttribute('playsinline', '');
      if (media.paused) media.play?.().catch(() => {});
    });
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') resume();
  };
  document.addEventListener('touchend', resume, true);
  document.addEventListener('click', resume, true);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    document.removeEventListener('touchend', resume, true);
    document.removeEventListener('click', resume, true);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export function unmuteRemotePlayback(containerId: string) {
  if (typeof document === 'undefined') return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const apply = () => {
    const media = container.querySelector<HTMLMediaElement>('video, audio');
    if (media) {
      media.muted = false;
      media.volume = 1;
      const p = media.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    }
    return false;
  };
  apply();
  const observer = new MutationObserver(() => { apply(); });
  observer.observe(container, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 6000);
}
