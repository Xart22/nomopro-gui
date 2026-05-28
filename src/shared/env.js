export const isDesktop =
    typeof window?.platformInfo?.isDesktop === 'boolean' ?
        window.platformInfo.isDesktop :
        false;

export const isWeb = !isDesktop;

export const backend = isDesktop ? 'native' : 'pyodide';
