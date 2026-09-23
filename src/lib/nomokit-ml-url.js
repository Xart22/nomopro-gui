// Resolves where the embedded nomokit-ml bundle lives. There are three hosts, and they do NOT
// agree on a path:
//
//   1. Laravel (nomokit) serves this GUI from /assets/nomopro/, so a root-relative
//      '/nomokit-ml/' 404s there. The blade template sets window.__NOMOKIT_ML_BASE__ to the
//      *nested* copy (/assets/nomopro/nomokit-ml/) rather than the standalone
//      /assets/nomokit-ml/ one -- the nested copy is emitted by this GUI's own
//      CopyWebpackPlugin, so it is always version-matched with the GUI asking for it. The
//      standalone copy backs Laravel's own /nomokit-ml route and drifts independently.
//   2. nomopro-desktop loads the GUI over file://, where only an absolute file:/// URL built
//      from the app path resolves.
//   3. The webpack dev server and a plain static deploy both serve it at /nomokit-ml/.

const withTrailingSlash = value => (value.endsWith('/') ? value : `${value}/`);

const resolveNomokitMlBase = () => {
    if (typeof window.__NOMOKIT_ML_BASE__ === 'string' && window.__NOMOKIT_ML_BASE__) {
        return withTrailingSlash(window.__NOMOKIT_ML_BASE__);
    }
    if (window.location.protocol === 'file:' && window.electronAPI && window.electronAPI.getAppPath) {
        return `file:///${window.electronAPI.getAppPath().replace(/\\/g, '/')}/src/gui/nomokit-ml/`;
    }
    return '/nomokit-ml/';
};

const nomokitMlIndexUrl = () => `${resolveNomokitMlBase()}index.html`;

// The origin the iframe will report on its messages, or null when it cannot be known -- which is
// the normal case under file://, where every document gets an opaque origin that serializes to the
// string "null". Callers must treat null as "cannot check the origin" and fall back to comparing
// event.source identity instead.
const nomokitMlOrigin = () => {
    try {
        const url = new URL(nomokitMlIndexUrl(), window.location.href);
        return url.protocol === 'file:' ? null : url.origin;
    } catch (_) {
        return null;
    }
};

// nomokit-ml calls the Laravel API with root-relative paths ('/api/...'), which resolve correctly
// only when it is served from that same origin. Under file:// -- nomopro-desktop -- they resolve
// against the filesystem and every call fails, which is why login and My Projects are broken in the
// desktop overlay today. Handing the iframe an explicit base at handshake time fixes both that and
// the inference host's own model fetching.
//
// Matches the constant already hardcoded in containers/device-library.jsx and containers/
// onboarding.jsx; if those ever move to a config, this should follow.
const NOMOKIT_API_URL = 'https://nomo-kit.com';

const resolveApiBase = () => {
    if (typeof window.__NOMOKIT_API_BASE__ === 'string') return window.__NOMOKIT_API_BASE__;
    // Same-origin hosts keep the existing relative behaviour -- the SPA's own '/api' prefix is
    // already correct there, and an absolute base would needlessly make every call cross-origin.
    return window.location.protocol === 'file:' ? NOMOKIT_API_URL : '';
};

export {resolveNomokitMlBase, nomokitMlIndexUrl, nomokitMlOrigin, resolveApiBase};
