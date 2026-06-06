import { atom, useAtomValue } from 'jotai';

// Fallback dictionary for all React-specific web interface strings
export const reactDefaultPhrases: Record<string, string> = {
    "web.login.welcome_back": "Welcome back",
    "web.login.enter_credentials": "Enter your credentials to access the %{servername} dashboard",
    "web.login.sign_in_cfx": "Sign in with Cfx.re",
    "web.login.or_continue": "OR CONTINUE WITH EMAIL",
    "web.login.username_placeholder": "name@example.com",
    "web.login.password_placeholder": "Password",
    "web.login.anmelden": "Sign In",
    "web.login.remember_creds": "Remember credentials",
    
    // Sidebar / Navigation
    "web.sidebar.dashboard": "Dashboard",
    "web.sidebar.players": "Players",
    "web.sidebar.history": "History",
    "web.sidebar.insights": "Player Drops",
    "web.sidebar.whitelist": "Whitelist",
    "web.sidebar.admins": "Admins",
    "web.sidebar.settings": "Settings",
    "web.sidebar.system": "System",
    "web.sidebar.master_actions": "Master Actions",
    "web.sidebar.diagnostics": "Diagnostics",
    "web.sidebar.console_log": "Console Log",
    "web.sidebar.action_log": "Action Log",
    "web.sidebar.console": "Live Console",
    "web.sidebar.resources": "Resources",
    "web.sidebar.server_log": "Server Log",
    "web.sidebar.cfg_editor": "CFG Editor",
    "web.sidebar.advanced": "Advanced",

    // Header Components
    "web.header.server": "Server",
    "web.header.menu": "Menu",
    "web.header.players": "Players",
    "web.header.light_mode": "Light Mode",
    "web.header.dark_mode": "Dark Mode",
    "web.header.account": "Your Account",
    "web.header.support": "Support",
    "web.header.logout": "Logout",
    
    // Settings Tabs
    "web.settings.tab_general": "General",
    "web.settings.tab_language": "Language",
    "web.settings.tab_fxserver": "FXServer",
    "web.settings.tab_theme": "Theme",
    "web.settings.tab_bans": "Bans",
    "web.settings.tab_whitelist": "Whitelist",
    "web.settings.tab_discord": "Discord",
    "web.settings.tab_game": "Game",
    "web.settings.tab_menu": "Menu",
    "web.settings.tab_notifications": "Notifications",
    
    // Theme Card
    "web.theme.active_theme": "Active Theme",
    "web.theme.creator": "Theme Creator",
    "web.theme.create_dynamic": "Create Dynamic Theme",
    "web.theme.variable_to_edit": "Edit Color Variable",
    
    // Language Card
    "web.language.active_system": "Active System Language",
    "web.language.custom_editor": "Custom Translations Editor",
    "web.language.save_translations": "Save Translations",
    "web.language.apply_language": "Apply Language",
};

// Initialize phrases dictionary injected by the backend merged with default fallbacks
const initialPhrases = {
    ...reactDefaultPhrases,
    ...(window.txConsts?.phrases || {})
};

export const phrasesAtom = atom<Record<string, any>>(initialPhrases);
export const languageAtom = atom<string>(window.txConsts?.language || 'en');

/**
 * A helper to resolve dot-notation path inside a nested object
 */
export function resolvePhrasePath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => {
        if (acc && typeof acc === 'object') {
            return acc[part];
        }
        return undefined;
    }, obj);
}

/**
 * Custom translation hook
 */
export const useTranslation = () => {
    const phrases = useAtomValue(phrasesAtom);

    const t = (key: string, options?: Record<string, any>): string => {
        // First try to resolve nested key path
        let phrase = resolvePhrasePath(phrases, key);

        // If not found, check direct key
        if (phrase === undefined) {
            phrase = phrases[key];
        }

        // If still not found, check default react phrases
        if (phrase === undefined) {
            phrase = reactDefaultPhrases[key];
        }

        // If still not found, return the key as fallback
        if (phrase === undefined || phrase === null) {
            return key;
        }

        let phraseStr = String(phrase);

        // Handle plurals if smart_count is provided (e.g. "phrase |||| plural phrase")
        if (options && typeof options.smart_count === 'number') {
            const parts = phraseStr.split('||||');
            if (parts.length > 1) {
                phraseStr = options.smart_count === 1 ? parts[0].trim() : parts[1].trim();
            }
        }

        // Interpolate placeholders like %{variable}
        if (options) {
            for (const [k, v] of Object.entries(options)) {
                phraseStr = phraseStr.replace(new RegExp(`%\\{${k}\\}`, 'g'), String(v));
            }
        }

        return phraseStr;
    };

    return { t };
};
