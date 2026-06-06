import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

export type CustomThemeType = {
    name: string;
    isDark: boolean;
    label?: string;
    style: Record<string, string>;
};

/**
 * Custom Preset Themes for vibeSM
 */
export const presetThemes: CustomThemeType[] = [
    {
        name: 'synthwave',
        isDark: true,
        label: 'Neon Synthwave',
        style: {
            "background": "285 45% 4%",
            "foreground": "320 100% 95%",
            "card": "285 45% 8%",
            "card-foreground": "320 100% 95%",
            "primary": "320 100% 55%",
            "secondary": "285 30% 12%",
            "muted": "285 30% 12%",
            "muted-foreground": "320 20% 65%",
            "border": "285 30% 18%",
            "ring": "320 100% 55%"
        }
    },
    {
        name: 'matrix',
        isDark: true,
        label: 'Emerald Matrix',
        style: {
            "background": "140 50% 2%",
            "foreground": "140 100% 95%",
            "card": "140 50% 5%",
            "card-foreground": "140 100% 95%",
            "primary": "140 100% 50%",
            "secondary": "140 30% 10%",
            "muted": "140 30% 10%",
            "muted-foreground": "140 20% 60%",
            "border": "140 30% 15%",
            "ring": "140 100% 50%"
        }
    },
    {
        name: 'cyberpunk',
        isDark: true,
        label: 'Cyberpunk 2077',
        style: {
            "background": "240 6% 4%",
            "foreground": "55 100% 95%",
            "card": "240 6% 7%",
            "card-foreground": "55 100% 95%",
            "primary": "55 100% 50%",
            "secondary": "240 6% 12%",
            "muted": "240 6% 12%",
            "muted-foreground": "240 4% 65%",
            "border": "240 6% 16%",
            "ring": "55 100% 50%"
        }
    },
    {
        name: 'spotivibe',
        isDark: true,
        label: 'SpotiVibe (Achromatic Dark)',
        style: {
            "background": "0 0% 7%",
            "foreground": "0 0% 100%",
            "card": "0 0% 9%",
            "card-foreground": "0 0% 100%",
            "primary": "141 73% 48%",
            "secondary": "0 0% 12%",
            "muted": "0 0% 12%",
            "muted-foreground": "0 0% 70%",
            "border": "0 0% 20%",
            "ring": "141 73% 48%"
        }
    },
    {
        name: 'ifruit',
        isDark: false,
        label: 'iFruit (Cupertino Clean)',
        style: {
            "background": "240 5% 96%",
            "foreground": "240 5% 12%",
            "card": "0 0% 100%",
            "card-foreground": "240 5% 12%",
            "primary": "210 100% 40%",
            "secondary": "240 5% 98%",
            "muted": "240 5% 94%",
            "muted-foreground": "240 2% 48%",
            "border": "240 5% 88%",
            "ring": "210 100% 45%"
        }
    },
    {
        name: 'cfx-launcher',
        isDark: true,
        label: 'FiveM Launcher (Cfx.re)',
        style: {
            "background": "225 32% 6%",
            "foreground": "220 15% 95%",
            "card": "224 30% 10%",
            "card-foreground": "220 15% 95%",
            "primary": "14 90% 55%",
            "secondary": "224 25% 14%",
            "muted": "224 25% 14%",
            "muted-foreground": "220 15% 65%",
            "border": "224 20% 18%",
            "ring": "14 90% 55%"
        }
    },
    {
        name: 'rahmen',
        isDark: true,
        label: 'Rahmen (Charcoal Dark)',
        style: {
            "background": "240 5% 2%",
            "foreground": "0 0% 100%",
            "card": "240 5% 6%",
            "card-foreground": "0 0% 100%",
            "primary": "0 0% 100%",
            "secondary": "240 5% 11%",
            "muted": "240 5% 11%",
            "muted-foreground": "0 0% 60%",
            "border": "240 5% 16%",
            "ring": "204 100% 50%"
        }
    },
    {
        name: 'creamhog',
        isDark: false,
        label: 'CreamHog (Sketchbook Light)',
        style: {
            "background": "69 11% 93%",
            "foreground": "75 12% 13%",
            "card": "0 0% 100%",
            "card-foreground": "75 12% 13%",
            "primary": "40 99% 49%",
            "secondary": "75 8% 90%",
            "muted": "75 8% 90%",
            "muted-foreground": "74 6% 30%",
            "border": "72 6% 74%",
            "ring": "40 99% 49%"
        }
    }
];

/**
 * Client Storage Helpers
 */
export const getClientThemes = (): CustomThemeType[] => {
    try {
        const stored = localStorage.getItem('vibeSM-client-themes');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const saveClientThemes = (themes: CustomThemeType[]) => {
    localStorage.setItem('vibeSM-client-themes', JSON.stringify(themes));
    injectClientThemesStyle();
};

export const injectClientThemesStyle = () => {
    if (typeof window === 'undefined') return;
    let styleTag = document.getElementById('vibe-client-themes-style') as HTMLStyleElement;
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'vibe-client-themes-style';
        document.head.appendChild(styleTag);
    }
    const clientThemes = getClientThemes();
    const allCustomThemes = [...presetThemes, ...clientThemes];
    const cssRules = allCustomThemes.map((theme) => {
        const style = { ...theme.style };
        if (!style.popover) style.popover = style.card;
        if (!style["popover-foreground"]) style["popover-foreground"] = style["card-foreground"];
        if (!style.input) style.input = style.border;
        const rules = Object.entries(style).map(([k, v]) => `--${k}: ${v};`).join(' ');
        return `.theme-${theme.name} { ${rules} }`;
    });
    styleTag.innerHTML = cssRules.join('\n');
};

// Initialize client styles immediately
if (typeof window !== 'undefined') {
    injectClientThemesStyle();
}

/**
 * Constants
 */
const root = window.document.documentElement;
const defaultThemes = ['dark', 'light'];

export const getAvailableThemesInfo = () => {
    const backend = window.txConsts.customThemes.map((theme) => ({
        name: theme.name,
        isDark: theme.isDark,
        label: theme.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        isClient: false
    }));
    const presets = presetThemes.map((theme) => ({
        name: theme.name,
        isDark: theme.isDark,
        label: theme.label ?? theme.name,
        isClient: false
    }));
    const client = getClientThemes().map((theme) => ({
        name: theme.name,
        isDark: theme.isDark,
        label: theme.label ?? theme.name,
        isClient: true
    }));

    return [
        { name: 'dark', isDark: true, label: 'Default Space Dark', isClient: false },
        { name: 'light', isDark: false, label: 'Default Light', isClient: false },
        ...backend,
        ...presets,
        ...client
    ];
};

const getThemeClasses = () => {
    return getAvailableThemesInfo().map((t) => `theme-${t.name}`);
};

/**
 * Helpers
 */
const setThemeCookieValue = (value: string) => {
    document.cookie = `vibeSM-theme=${value};path=/;SameSite=Lax;max-age=31536000;`;
}

const parseTheme = (themeName: string) => {
    if (defaultThemes.includes(themeName)) {
        return {
            isInvalid: false,
            isDefault: true,
            isDarkScheme: themeName === 'dark',
            lightDarkClass: themeName,
            customClass: undefined,
        }
    }

    // Check presets first
    const preset = presetThemes.find((theme) => theme.name === themeName);
    if (preset) {
        return {
            isInvalid: false,
            isDefault: false,
            isDarkScheme: preset.isDark,
            lightDarkClass: preset.isDark ? 'dark' : 'light',
            customClass: `theme-${themeName}`,
        };
    }

    // Check client-stored themes
    const clientTheme = getClientThemes().find((theme) => theme.name === themeName);
    if (clientTheme) {
        return {
            isInvalid: false,
            isDefault: false,
            isDarkScheme: clientTheme.isDark,
            lightDarkClass: clientTheme.isDark ? 'dark' : 'light',
            customClass: `theme-${themeName}`,
        };
    }

    // Check backend custom themes
    const backendTheme = window.txConsts.customThemes.find((theme) => theme.name === themeName);
    if (backendTheme) {
        return {
            isInvalid: false,
            isDefault: false,
            isDarkScheme: backendTheme.isDark,
            lightDarkClass: backendTheme.isDark ? 'dark' : 'light',
            customClass: `theme-${themeName}`,
        };
    }

    console.warn(`Could not find theme '${themeName}', defaulting to dark.`);
    return {
        isInvalid: true,
        isDefault: false,
        isDarkScheme: true,
        lightDarkClass: 'dark',
        customClass: undefined,
    }
}

// Read stored theme helper
export const getStoredActiveTheme = () => {
    try {
        return localStorage.getItem('vibeSM-active-theme');
    } catch {
        return null;
    }
};

// Helper to get CSS variables style object of active theme
export const getThemeStyleObject = (themeName: string): Record<string, string> | undefined => {
    let resolvedStyle: Record<string, string> | undefined;

    // 1. Check presets
    const preset = presetThemes.find((t) => t.name === themeName);
    if (preset) {
        resolvedStyle = preset.style;
    } else {
        // 2. Check client-stored
        const clientTheme = getClientThemes().find((t) => t.name === themeName);
        if (clientTheme) {
            resolvedStyle = clientTheme.style;
        } else {
            // 3. Check backend
            const backendTheme = window.txConsts.customThemes.find((t) => t.name === themeName);
            if (backendTheme) {
                resolvedStyle = backendTheme.style;
            } else if (themeName === 'dark') {
                resolvedStyle = {
                    background: "258 67% 2%",
                    foreground: "0 0% 100%",
                    card: "258 50% 6%",
                    "card-foreground": "0 0% 100%",
                    primary: "340 89% 52%",
                    secondary: "258 40% 10%",
                    muted: "258 35% 10%",
                    "muted-foreground": "258 10% 70%",
                    border: "258 30% 15%",
                    ring: "340 89% 52%"
                };
            } else if (themeName === 'light') {
                resolvedStyle = {
                    background: "0 0% 98%",
                    foreground: "240 10% 3.9%",
                    card: "0 0% 100%",
                    "card-foreground": "240 10% 3.9%",
                    primary: "340 89% 52%",
                    secondary: "240 4.8% 95.9%",
                    muted: "240 4.8% 95.9%",
                    "muted-foreground": "240 3.8% 46.1%",
                    border: "240 5.9% 90%",
                    ring: "340 89% 52%"
                };
            }
        }
    }

    if (!resolvedStyle) return undefined;

    const style = { ...resolvedStyle };
    if (!style.popover) style.popover = style.card;
    if (!style["popover-foreground"]) style["popover-foreground"] = style["card-foreground"];
    if (!style.input) style.input = style.border;
    return style;
};

// Apply saved theme classes immediately on script startup to prevent flashes
if (typeof window !== 'undefined') {
    const storedTheme = getStoredActiveTheme();
    if (storedTheme) {
        const info = getAvailableThemesInfo();
        if (info.some(t => t.name === storedTheme)) {
            const { isInvalid, lightDarkClass, customClass } = parseTheme(storedTheme);
            if (!isInvalid) {
                root.classList.remove(...defaultThemes, ...getThemeClasses());
                root.classList.add(lightDarkClass);
                if (customClass) {
                    root.classList.add(customClass);
                }
            }
        }
    }
}

// Read current theme state on startup
const storedThemeOnLoad = getStoredActiveTheme();
const initialAtomValue = (storedThemeOnLoad && getAvailableThemesInfo().some(t => t.name === storedThemeOnLoad))
    ? storedThemeOnLoad
    : (getAvailableThemesInfo().find((theme) => root.classList.contains(`theme-${theme.name}`))?.name
        ?? defaultThemes.find((name) => root.classList.contains(name))
        ?? window.txConsts.defaultTheme);

/**
 * Atoms
 */
const themeAtom = atom(initialAtomValue);
const isDarkModeAtom = atom((get) => {
    const currTheme = get(themeAtom);
    return parseTheme(currTheme).isDarkScheme;
});

// Refresh/initialize active theme cookie
setThemeCookieValue(initialAtomValue);

/**
 * Theme changer
 */
const applyNewTheme = (oldTheme: string, newTheme: string) => {
    const { isInvalid, isDarkScheme, lightDarkClass, customClass } = parseTheme(newTheme);
    if (isInvalid) {
        throw new Error(`invalid theme ${newTheme}`);
    }

    // Applying classes
    root.classList.remove(...defaultThemes, ...getThemeClasses());
    root.classList.add(lightDarkClass);
    if (customClass) {
        root.classList.add(customClass);
    }

    // Save choice to localStorage
    try {
        localStorage.setItem('vibeSM-active-theme', newTheme);
    } catch (e) {
        console.error('Failed to save theme in localStorage', e);
    }

    // Changing legacy iframe theme
    const iframeBody = (document.getElementById('legacyPageIframe') as HTMLObjectElement)?.contentDocument?.body;
    if (iframeBody) {
        if (isDarkScheme) {
            iframeBody.classList.add('theme--dark');
        } else {
            iframeBody.classList.remove('theme--dark');
        }
    }

    setThemeCookieValue(newTheme);
    console.log(`Changed theme from '${oldTheme}' to '${newTheme}'.`);
}


/**
 * Hooks
 */
export const useTheme = () => {
    const [atomTheme, setAtomTheme] = useAtom(themeAtom);

    // Theme setter
    const setTheme = (newTheme: string) => {
        if (newTheme === atomTheme) return;
        applyNewTheme(atomTheme, newTheme);
        setAtomTheme(newTheme);
    }

    return {
        theme: atomTheme,
        setTheme,
    }
};

export const useToggleTheme = () => {
    const setTheme = useSetAtom(themeAtom);
    return () => setTheme((curr) => {
        if (curr === 'dark') {
            applyNewTheme(curr, 'light');
            return 'light';
        } else if (curr === 'light') {
            applyNewTheme(curr, 'dark');
            return 'dark';
        } else {
            console.log('invalid theme', curr);
            return curr;
        }
    });
}

export const useIsDarkMode = () => {
    return useAtomValue(isDarkModeAtom);
}

export const useThemedImage = (baseImageUrl?: string) => {
    const isDarkMode = useAtomValue(isDarkModeAtom);
    if(typeof baseImageUrl !== 'string') return;
    return baseImageUrl.replace(/{theme}/g, isDarkMode ? 'dark' : 'light');
}
