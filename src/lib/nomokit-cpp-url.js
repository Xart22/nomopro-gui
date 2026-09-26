// Resolves where the embedded nomokit-cpp bundle lives. Dua host:
//   1. nomopro-desktop memuat GUI lewat file:// (prod) -> butuh URL file:/// absolut.
//   2. webpack dev server (http://127.0.0.1:8601) dan static deploy -> '/nomokit-cpp/'.
// Jangan pakai file:// saat halaman di-serve lewat http (Electron tetap punya electronAPI
// walau GUI dimuat via dev server) -> Chromium blokir "not allowed to load local resource".

const withTrailingSlash = value => (value.endsWith('/') ? value : `${value}/`);

const resolveNomokitCppBase = () => {
    if (typeof window.__NOMOKIT_CPP_BASE__ === 'string' && window.__NOMOKIT_CPP_BASE__) {
        return withTrailingSlash(window.__NOMOKIT_CPP_BASE__);
    }
    if (window.location.protocol === 'file:' && window.electronAPI && window.electronAPI.getAppPath) {
        return `file:///${window.electronAPI.getAppPath().replace(/\\/g, '/')}/src/gui/nomokit-cpp/`;
    }
    return '/nomokit-cpp/';
};

const nomokitCppIndexUrl = () => `${resolveNomokitCppBase()}index.html`;

export {resolveNomokitCppBase, nomokitCppIndexUrl};
