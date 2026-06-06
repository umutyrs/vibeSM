import { useEffect, useState, useMemo } from "react";
import { useTheme, getAvailableThemesInfo, getClientThemes, saveClientThemes, presetThemes, CustomThemeType } from "@/hooks/theme";
import SettingsCardShell from "../SettingsCardShell";
import { SettingItem, SettingItemDesc } from "../settingsItems";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckIcon, Trash2Icon, PlusIcon, DownloadIcon, UploadIcon, PaintbrushIcon, CopyIcon, RefreshCw } from "lucide-react";
import { txToast } from "@/components/TxToaster";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types
type ConfigCardThemeProps = {
    cardCtx: any;
    pageCtx: any;
};

const DEFAULT_THEME_VARIABLES = {
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

// --- Mathematical Color Converter Helpers ---
function parseHslString(hslStr: string) {
    const parts = hslStr.trim().split(/\s+/);
    const h = Math.round(parseFloat(parts[0])) || 0;
    const s = Math.round(parseFloat(parts[1]?.replace("%", ""))) || 0;
    const l = Math.round(parseFloat(parts[2]?.replace("%", ""))) || 0;
    return { h, s, l };
}

function formatHslString(h: number, s: number, l: number) {
    return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

function hslToHsv(h: number, s: number, l: number) {
    const sPct = s / 100;
    const lPct = l / 100;
    const v = lPct + sPct * Math.min(lPct, 1 - lPct);
    const sv = v === 0 ? 0 : 2 * (1 - lPct / v);
    return {
        h: Math.round(h),
        s: Math.round(sv * 100),
        v: Math.round(v * 100)
    };
}

function hsvToHsl(h: number, s: number, v: number) {
    const sPct = s / 100;
    const vPct = v / 100;
    const l = vPct * (1 - sPct / 2);
    const sl = (l === 0 || l === 1) ? 0 : (vPct - l) / Math.min(l, 1 - l);
    return {
        h: Math.round(h),
        s: Math.round(sl * 100),
        l: Math.round(l * 100)
    };
}

function hslToRgb(h: number, s: number, l: number) {
    const sPct = s / 100;
    const lPct = l / 100;
    const c = (1 - Math.abs(2 * lPct - 1)) * sPct;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = lPct - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h <= 360) { r = c; g = 0; b = x; }
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

function rgbToHex(r: number, g: number, b: number) {
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToCmyk(r: number, g: number, b: number) {
    const rPct = r / 255;
    const gPct = g / 255;
    const bPct = b / 255;
    const k = 1 - Math.max(rPct, gPct, bPct);
    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }
    const c = (1 - rPct - k) / (1 - k);
    const m = (1 - gPct - k) / (1 - k);
    const y = (1 - bPct - k) / (1 - k);
    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100)
    };
}

export default function ConfigCardTheme({ cardCtx, pageCtx }: ConfigCardThemeProps) {
    const { theme: currentTheme, setTheme } = useTheme();
    const [availableThemes, setAvailableThemes] = useState(() => getAvailableThemesInfo());
    
    // Creator form state
    const [themeName, setThemeName] = useState("");
    const [themeLabel, setThemeLabel] = useState("");
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [variables, setVariables] = useState<Record<string, string>>({ ...DEFAULT_THEME_VARIABLES });
    
    // Active editing color token
    const [activeVariable, setActiveVariable] = useState<string>("primary");

    // Import/Export state
    const [importJson, setImportJson] = useState("");
    
    // Community themes state
    const [communityThemes, setCommunityThemes] = useState<any[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState<boolean>(true);
    const [shareAuthor, setShareAuthor] = useState("");
    const [themeToShare, setThemeToShare] = useState("");

    // Fetch community themes on mount
    useEffect(() => {
        const fetchCommunityThemes = async () => {
            try {
                const res = await fetch("https://vibesm.cc/api/community/themes");
                if (res.ok) {
                    const data = await res.json();
                    setCommunityThemes(data);
                }
            } catch (e) {
                console.error("Failed to fetch community themes", e);
            } finally {
                setLoadingCommunity(false);
            }
        };
        fetchCommunityThemes();
    }, []);

    // Apply Community Theme
    const applyCommunityTheme = (theme: any) => {
        const hexToHsl = (hex: string) => {
            hex = hex.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };

        const style = {
            background: hexToHsl(theme.canvas),
            foreground: "0 0% 100%",
            card: hexToHsl(theme.surface1),
            "card-foreground": "0 0% 100%",
            primary: hexToHsl(theme.primary),
            secondary: hexToHsl(theme.surface2),
            muted: hexToHsl(theme.surface2),
            "muted-foreground": "0 0% 70%",
            border: hexToHsl(theme.surface2),
            ring: hexToHsl(theme.primary)
        };

        const clientThemes = getClientThemes();
        const cleanName = `community-${theme.id}`;
        
        const existingIndex = clientThemes.findIndex(t => t.name === cleanName);
        const newCustomTheme: CustomThemeType = {
            name: cleanName,
            isDark: true,
            label: `${theme.name} (by ${theme.author})`,
            style
        };

        if (existingIndex > -1) {
            clientThemes[existingIndex] = newCustomTheme;
        } else {
            clientThemes.push(newCustomTheme);
        }
        
        saveClientThemes(clientThemes);
        reloadThemes();
        setTheme(cleanName);
        txToast.success(`Applied community theme "${theme.name}"!`);
    };

    // Share a theme to the community
    const handleShareTheme = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!themeToShare) {
            return txToast.error("Please select a theme to share.");
        }
        if (!shareAuthor.trim()) {
            return txToast.error("Please enter your name as the author.");
        }

        const match = [...presetThemes, ...getClientThemes()].find(t => t.name === themeToShare);
        if (!match) return txToast.error("Theme not found.");

        const hslToHexStr = (hslStr: string) => {
            const parts = hslStr.trim().split(/\s+/);
            const h = parseFloat(parts[0]) || 0;
            const s = parseFloat(parts[1]?.replace("%", "")) || 0;
            const l = parseFloat(parts[2]?.replace("%", "")) || 0;
            const rgb = hslToRgb(h, s, l);
            return rgbToHex(rgb.r, rgb.g, rgb.b);
        };

        const canvasHex = hslToHexStr(match.style.background || "0 0% 0%");
        const primaryHex = hslToHexStr(match.style.primary || "0 0% 100%");
        const hoverHex = hslToHexStr(match.style.ring || match.style.primary || "0 0% 100%");

        const r = parseInt(canvasHex.slice(1, 3), 16) || 10;
        const g = parseInt(canvasHex.slice(3, 5), 16) || 11;
        const b = parseInt(canvasHex.slice(5, 7), 16) || 16;
        const surface1 = `#${Math.min(255, r + 8).toString(16).padStart(2, '0')}${Math.min(255, g + 9).toString(16).padStart(2, '0')}${Math.min(255, b + 14).toString(16).padStart(2, '0')}`;
        const surface2 = `#${Math.min(255, r + 18).toString(16).padStart(2, '0')}${Math.min(255, g + 20).toString(16).padStart(2, '0')}${Math.min(255, b + 28).toString(16).padStart(2, '0')}`;

        try {
            const res = await fetch("https://vibesm.cc/api/community/themes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: match.label || match.name,
                    author: shareAuthor.trim(),
                    canvas: canvasHex,
                    surface1,
                    surface2,
                    primary: primaryHex,
                    hover: hoverHex
                })
            });
            if (res.ok) {
                const data = await res.json();
                setCommunityThemes(prev => [...prev, data]);
                setShareAuthor("");
                setThemeToShare("");
                txToast.success("Theme shared to the community successfully!");
            } else {
                txToast.error("Failed to share theme.");
            }
        } catch (e) {
            txToast.error("Failed to connect to community backend database.");
        }
    };
    
    // Reload themes list
    const reloadThemes = () => {
        setAvailableThemes(getAvailableThemesInfo());
    };

    // Calculate active theme JSON for copy-paste export
    const activeThemeJson = useMemo(() => {
        const active = [...presetThemes, ...getClientThemes()].find(t => t.name === currentTheme);
        if (active) {
            return JSON.stringify(active, null, 2);
        }
        return JSON.stringify({
            name: currentTheme,
            isDark: currentTheme !== 'light',
            label: currentTheme === 'dark' ? 'Default Space Dark' : 'Default Light',
            style: DEFAULT_THEME_VARIABLES
        }, null, 2);
    }, [currentTheme, availableThemes]);

    // Handle variable input change
    const handleVarChange = (name: string, value: string) => {
        setVariables(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Create Custom Theme
    const handleCreateTheme = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = themeName.toLowerCase().replace(/[^a-z0-9]/g, "-").trim();
        if (!cleanName) {
            return txToast.error("Please enter a valid unique theme name.");
        }
        if (!themeLabel.trim()) {
            return txToast.error("Please enter a theme label.");
        }

        const clientThemes = getClientThemes();
        if (clientThemes.some(t => t.name === cleanName) || presetThemes.some(t => t.name === cleanName) || ['dark', 'light'].includes(cleanName)) {
            return txToast.error("A theme with this name already exists.");
        }

        // Massaging HSL variables to support secondary & ring values automatically
        const newTheme: CustomThemeType = {
            name: cleanName,
            isDark: isDarkTheme,
            label: themeLabel.trim(),
            style: {
                ...variables,
                secondary: variables.card,
                ring: variables.primary
            }
        };

        const updatedThemes = [...clientThemes, newTheme];
        saveClientThemes(updatedThemes);
        reloadThemes();
        
        // Apply instantly
        setTheme(cleanName);
        txToast.success(`Theme "${newTheme.label}" created and applied successfully!`);

        // Reset Creator fields
        setThemeName("");
        setThemeLabel("");
        setVariables({ ...DEFAULT_THEME_VARIABLES });
    };

    // Delete Client Theme
    const handleDeleteTheme = (name: string, event: React.MouseEvent) => {
        event.stopPropagation();
        const clientThemes = getClientThemes();
        const themeToDelete = clientThemes.find(t => t.name === name);
        if (!themeToDelete) return;

        if (currentTheme === name) {
            setTheme("dark");
        }

        const updatedThemes = clientThemes.filter(t => t.name !== name);
        saveClientThemes(updatedThemes);
        reloadThemes();
        txToast.success(`Theme "${themeToDelete.label}" deleted.`);
    };

    // Import Theme via JSON
    const handleImportTheme = () => {
        try {
            const parsed = JSON.parse(importJson.trim());
            if (!parsed.name || !parsed.style || typeof parsed.isDark !== 'boolean') {
                throw new Error("Missing required fields: 'name', 'isDark', 'style'.");
            }
            const cleanName = parsed.name.toLowerCase().replace(/[^a-z0-9]/g, "-").trim();
            
            const clientThemes = getClientThemes();
            if (clientThemes.some(t => t.name === cleanName) || presetThemes.some(t => t.name === cleanName) || ['dark', 'light'].includes(cleanName)) {
                return txToast.error("A theme with this name already exists.");
            }

            const newTheme: CustomThemeType = {
                name: cleanName,
                isDark: parsed.isDark,
                label: parsed.label || parsed.name,
                style: parsed.style
            };

            const updatedThemes = [...clientThemes, newTheme];
            saveClientThemes(updatedThemes);
            reloadThemes();
            setTheme(cleanName);
            setImportJson("");
            txToast.success(`Theme "${newTheme.label}" imported successfully!`);
        } catch (error) {
            txToast.error(`Failed to parse theme JSON: ${(error as Error).message}`);
        }
    };

    // Current color stats & variables parsing
    const currentColorValues = useMemo(() => {
        const { h, s, l } = parseHslString(variables[activeVariable] || "0 0% 100%");
        const hsv = hslToHsv(h, s, l);
        const rgb = hslToRgb(h, s, l);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

        return {
            h, s, l,
            hsvS: hsv.s,
            hsvV: hsv.v,
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            hex,
            c: cmyk.c,
            m: cmyk.m,
            y: cmyk.y,
            k: cmyk.k
        };
    }, [variables, activeVariable]);

    // Pointer-events drag handlers for Saturation-Value Canvas
    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        updateCanvasColor(e);
    };

    const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        updateCanvasColor(e);
    };

    const updateCanvasColor = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        
        const sat = Math.round((x / rect.width) * 100);
        const val = Math.round(100 - (y / rect.height) * 100);

        const { h } = parseHslString(variables[activeVariable] || "0 0% 100%");
        const newHsl = hsvToHsl(h, sat, val);
        const formatted = formatHslString(newHsl.h, newHsl.s, newHsl.l);

        handleVarChange(activeVariable, formatted);
    };

    // Pointer-events drag handlers for Hue Slider
    const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        updateHueColor(e);
    };

    const handleHuePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        updateHueColor(e);
    };

    const updateHueColor = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const hue = Math.round((x / rect.width) * 360);

        const { s, l } = parseHslString(variables[activeVariable] || "0 0% 100%");
        const hsv = hslToHsv(hue, s, l); // maintain HSV representation to avoid math shift
        const newHsl = hsvToHsl(hue, hsv.s, hsv.v);
        const formatted = formatHslString(newHsl.h, newHsl.s, newHsl.l);

        handleVarChange(activeVariable, formatted);
    };

    // Copy to clipboard helper
    const handleCopyHex = () => {
        navigator.clipboard.writeText(currentColorValues.hex.toUpperCase());
        txToast.success(`HEX Color ${currentColorValues.hex.toUpperCase()} copied to clipboard!`);
    };

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={() => {
                pageCtx.setCardPendingSave(null);
                txToast.success("Theme settings saved.");
            }}
        >
            {/* 1. Theme Presets and Selector */}
            <SettingItem label="Active Theme" required>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableThemes.map((theme) => {
                        const isActive = currentTheme === theme.name;
                        return (
                            <div
                                key={theme.name}
                                onClick={() => setTheme(theme.name)}
                                className={`relative cursor-pointer glass-card p-3 flex items-center justify-between group transition-all duration-300 hover:-translate-y-0.5 ${
                                    isActive
                                        ? "!border-primary bg-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
                                        : ""
                                }`}
                            >
                                <div className="flex flex-col gap-0.5 select-none">
                                    <span className="font-semibold text-sm text-foreground">{theme.label}</span>
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                        {theme.isDark ? "Dark Scheme" : "Light Scheme"}
                                        {theme.isClient && " (Custom)"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {isActive ? (
                                        <CheckIcon className="size-4 text-primary shrink-0" />
                                    ) : (
                                        theme.isClient && (
                                            <button
                                                onClick={(e) => handleDeleteTheme(theme.name, e)}
                                                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 transition-opacity p-1 rounded hover:bg-white/5"
                                                title="Delete Custom Theme"
                                            >
                                                <Trash2Icon className="size-4" />
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                 <SettingItemDesc>
                    Choose from standard built-in themes, customized preset themes, or click to load custom themes stored in this browser session.
                </SettingItemDesc>
            </SettingItem>

            {/* Community Themes Gallery */}
            <SettingItem label="Community Themes Library">
                {loadingCommunity ? (
                    <div className="py-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5 select-none">
                        <RefreshCw className="size-5 animate-spin text-primary" />
                        <span className="text-xs">Loading community themes database...</span>
                    </div>
                ) : communityThemes.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground text-xs select-none">
                        No community themes uploaded yet. Be the first to share one!
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {communityThemes.map((theme) => {
                            const isApplied = currentTheme === `community-${theme.id}`;
                            return (
                                <div
                                    key={theme.id}
                                    onClick={() => applyCommunityTheme(theme)}
                                    className={`relative cursor-pointer glass-card p-3.5 flex flex-col justify-between space-y-3 group transition-all duration-300 hover:-translate-y-0.5 ${
                                        isApplied
                                            ? "!border-primary bg-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
                                            : ""
                                    }`}
                                >
                                    <div className="flex flex-col gap-0.5 select-none text-left">
                                        <span className="font-bold text-sm text-foreground truncate">{theme.name}</span>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                            by {theme.author}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-border/25">
                                        <div className="flex gap-1.5">
                                            <span className="size-3.5 rounded-full border border-foreground/10" style={{ backgroundColor: theme.canvas }} title="Canvas" />
                                            <span className="size-3.5 rounded-full border border-foreground/10" style={{ backgroundColor: theme.primary }} title="Accent" />
                                        </div>
                                        <span className={`text-[10px] font-semibold transition-colors ${
                                            isApplied ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                        }`}>
                                            {isApplied ? "Applied" : "Apply"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <SettingItemDesc>
                    Browse, download, and apply theme customization packages created and shared by other vibeSM community administrators.
                </SettingItemDesc>
            </SettingItem>

            {/* Share custom theme to community */}
            <SettingItem label="Share Theme to Community">
                <form onSubmit={handleShareTheme} className="bg-foreground/5 border border-border/40 rounded-xl p-4 space-y-4 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                            <Label htmlFor="share-theme-select" className="text-xs text-foreground/80">Select Theme to Share</Label>
                            <Select value={themeToShare} onValueChange={setThemeToShare}>
                                <SelectTrigger id="share-theme-select">
                                    <SelectValue placeholder="Select one of your custom themes..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...presetThemes, ...getClientThemes()].map(t => (
                                        <SelectItem key={t.name} value={t.name}>{t.label || t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 text-left">
                            <Label htmlFor="share-author-name" className="text-xs text-foreground/80">Author Name</Label>
                            <Input
                                id="share-author-name"
                                placeholder="Your Name or Server Name"
                                value={shareAuthor}
                                onChange={e => setShareAuthor(e.target.value)}
                                className="h-9 bg-background/50 border-border/40"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!themeToShare || !shareAuthor.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8.5 px-4 transition-all"
                        >
                            <UploadIcon className="size-4 mr-1.5 animate-pulse" />
                            Upload & Share Theme
                        </Button>
                    </div>
                </form>
                <SettingItemDesc>
                    Publish your customized themes directly to the shared community catalog for other administrators worldwide to fetch and enjoy.
                </SettingItemDesc>
            </SettingItem>

            {/* 2. Visual Theme Creator Studio */}
            <SettingItem label="Theme Creator">
                <form onSubmit={handleCreateTheme} className="bg-foreground/5 border border-border/40 rounded-xl p-4 md:p-5 space-y-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/80 pb-2 border-b border-border/40 flex items-center gap-1.5 select-none">
                        <PaintbrushIcon className="size-4 text-primary" />
                        Create Dynamic Theme
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Premium Visual Color Picker */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                            {/* Color Variable Selection list */}
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                                    Edit Color Variable
                                </Label>
                                <div className="grid grid-cols-3 gap-1.5 select-none">
                                    {[
                                        { name: "primary", label: "Primary" },
                                        { name: "background", label: "Canvas" },
                                        { name: "card", label: "Card" },
                                        { name: "foreground", label: "Text" },
                                        { name: "card-foreground", label: "Card Text" },
                                        { name: "border", label: "Borders" }
                                    ].map((v) => {
                                        const isSel = activeVariable === v.name;
                                        return (
                                            <button
                                                key={v.name}
                                                type="button"
                                                onClick={() => setActiveVariable(v.name)}
                                                className={`h-7 px-2 border rounded-md flex items-center justify-between text-2xs font-semibold tracking-wide transition-all ${
                                                    isSel
                                                        ? "border-primary bg-primary/10 text-foreground"
                                                        : "border-border/30 bg-background/50 text-muted-foreground hover:bg-foreground/5"
                                                }`}
                                            >
                                                <span>{v.label}</span>
                                                <span
                                                    className="size-2 rounded-full border border-foreground/10 shrink-0"
                                                    style={{ backgroundColor: `hsl(${variables[v.name]})` }}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Adobe-Style dragger Saturation-Value canvas */}
                            <div
                                onPointerDown={handleCanvasPointerDown}
                                onPointerMove={handleCanvasPointerMove}
                                className="w-full h-40 relative rounded-lg overflow-hidden cursor-crosshair select-none shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)] border border-border/40"
                                style={{
                                    backgroundColor: `hsl(${currentColorValues.h}, 100%, 50%)`,
                                    backgroundImage: "linear-gradient(to top, #000 0%, transparent 100%), linear-gradient(to right, #fff 0%, transparent 100%)",
                                    backgroundBlendMode: "multiply"
                                }}
                            >
                                {/* Selector dot handle */}
                                <div
                                    className="absolute size-4.5 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                        left: `${currentColorValues.hsvS}%`,
                                        top: `${100 - currentColorValues.hsvV}%`,
                                        backgroundColor: `hsl(${currentColorValues.h}, ${currentColorValues.s}%, ${currentColorValues.l}%)`
                                    }}
                                />
                            </div>

                            {/* Rainbow Hue Slider */}
                            <div className="flex flex-col gap-1.5 select-none">
                                <div
                                    onPointerDown={handleHuePointerDown}
                                    onPointerMove={handleHuePointerMove}
                                    className="w-full h-3.5 relative rounded-full overflow-hidden cursor-pointer shadow-inner border border-border/40"
                                    style={{
                                        background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
                                    }}
                                >
                                    {/* Hue handle */}
                                    <div
                                        className="absolute top-0 bottom-0 w-2.5 bg-white border border-black/35 shadow-md -translate-x-1/2"
                                        style={{
                                            left: `${(currentColorValues.h / 360) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Pro Color Readouts box */}
                            <div className="bg-background/80 border border-border/40 rounded-lg p-3 space-y-2 select-none shadow-md">
                                {/* HEX row with copy button */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">HEX Format</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-grow h-8 bg-foreground/5 border border-border/40 rounded-md flex items-center justify-center font-mono text-xs text-foreground font-bold uppercase tracking-widest">
                                            {currentColorValues.hex}
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={handleCopyHex}
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 border border-border/40 hover:bg-foreground/5"
                                            title="Copy HEX color"
                                        >
                                            <CopyIcon className="size-3.5 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Custom Color Spaces Readouts Grid */}
                                <div className="grid grid-cols-2 gap-2 text-center text-3xs font-mono select-none">
                                    <div className="bg-foreground/5 border border-border/40 rounded-md p-1.5 flex flex-col justify-center gap-0.5">
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">RGB</span>
                                        <span className="text-2xs text-foreground font-semibold">
                                            {currentColorValues.r}, {currentColorValues.g}, {currentColorValues.b}
                                        </span>
                                    </div>
                                    <div className="bg-foreground/5 border border-border/40 rounded-md p-1.5 flex flex-col justify-center gap-0.5">
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">CMYK</span>
                                        <span className="text-2xs text-foreground font-semibold">
                                            {currentColorValues.c}%, {currentColorValues.m}%, {currentColorValues.y}%, {currentColorValues.k}%
                                        </span>
                                    </div>
                                    <div className="bg-foreground/5 border border-border/40 rounded-md p-1.5 flex flex-col justify-center gap-0.5">
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">HSV</span>
                                        <span className="text-2xs text-foreground font-semibold">
                                            {currentColorValues.h}°, {currentColorValues.hsvS}%, {currentColorValues.hsvV}%
                                        </span>
                                    </div>
                                    <div className="bg-foreground/5 border border-border/40 rounded-md p-1.5 flex flex-col justify-center gap-0.5">
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">HSL</span>
                                        <span className="text-2xs text-foreground font-semibold">
                                            {currentColorValues.h}°, {currentColorValues.s}%, {currentColorValues.l}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Form Fields & variable outputs */}
                        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="theme-name" className="text-xs text-foreground/80">Theme ID (Lowercase, no spaces)</Label>
                                        <Input
                                            id="theme-name"
                                            placeholder="my-neon-theme"
                                            value={themeName}
                                            onChange={(e) => setThemeName(e.target.value)}
                                            className="h-9 bg-background/50 border-border/40"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="theme-label" className="text-xs text-foreground/80">Display Label</Label>
                                        <Input
                                            id="theme-label"
                                            placeholder="My Neon Theme"
                                            value={themeLabel}
                                            onChange={(e) => setThemeLabel(e.target.value)}
                                            className="h-9 bg-background/50 border-border/40"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 pt-1 select-none">
                                    <Switch
                                        id="theme-dark-scheme"
                                        checked={isDarkTheme}
                                        onCheckedChange={setIsDarkTheme}
                                    />
                                    <Label htmlFor="theme-dark-scheme" className="text-xs text-foreground/80 cursor-pointer">
                                        Use Dark Scheme styling (recommends dark text on light accents)
                                    </Label>
                                </div>

                                {/* Raw HSL Input Field list */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block select-none">
                                        Active Variable HSL Configuration
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { name: "primary", label: "Primary Accent" },
                                            { name: "background", label: "Core Background" },
                                            { name: "card", label: "Card Backdrop" },
                                            { name: "foreground", label: "Text/Foreground" },
                                            { name: "card-foreground", label: "Card Text" },
                                            { name: "border", label: "Hairline Borders" }
                                        ].map((variable) => {
                                            const isEditing = activeVariable === variable.name;
                                            return (
                                                <div
                                                    key={variable.name}
                                                    onClick={() => setActiveVariable(variable.name)}
                                                    className={`cursor-pointer flex flex-col gap-1.5 bg-background/30 border rounded-lg p-2.5 transition-all select-none ${
                                                        isEditing
                                                            ? "border-primary bg-primary/5 shadow-inner"
                                                            : "border-border/30 hover:border-border/60 hover:bg-foreground/5"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="text-[10px] font-semibold text-foreground/85 truncate">{variable.label}</span>
                                                        <div
                                                            className="size-3 rounded-full border border-foreground/10 shrink-0"
                                                            style={{ backgroundColor: `hsl(${variables[variable.name]})` }}
                                                        />
                                                    </div>
                                                    <Input
                                                        value={variables[variable.name]}
                                                        onChange={(e) => handleVarChange(variable.name, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="h-6.5 text-[11px] font-mono bg-background/70 border-border/40 text-center px-1.5"
                                                        required
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-3">
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-5 active:scale-95 transition-all shadow-md"
                                >
                                    <PlusIcon className="size-4 mr-1.5" />
                                    Create & Apply Theme
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
                <SettingItemDesc>
                    Tweak color variable parameters visually in HSL, HSV, or HEX units to build a premium custom dynamic theme. Outlines, shadows, and secondary configurations are mathematically balanced automatically.
                </SettingItemDesc>
            </SettingItem>

            {/* 3. JSON Import/Export */}
            <SettingItem label="Import & Export Theme">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export Active Theme */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 select-none">
                            <DownloadIcon className="size-4 text-primary" />
                            Active Theme JSON (Export)
                        </div>
                        <Textarea
                            readOnly
                            value={activeThemeJson}
                            onClick={(e) => {
                                (e.target as HTMLTextAreaElement).select();
                                navigator.clipboard.writeText(activeThemeJson);
                                txToast.success("Theme JSON copied to clipboard!");
                            }}
                            className="h-32 text-2xs font-mono bg-background/50 border-border/40 hover:border-primary/20 focus:border-primary cursor-pointer transition-colors"
                        />
                        <span className="text-[10px] text-muted-foreground block select-none">
                            Click inside the box to copy the active theme JSON setup to share with other vibeSM/txAdmin admins.
                        </span>
                    </div>

                    {/* Import Theme */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 select-none">
                            <UploadIcon className="size-4 text-emerald-400" />
                            Paste Theme JSON (Import)
                        </div>
                        <Textarea
                            placeholder='{"name": "custom", "isDark": true, "label": "Shared", "style": {...}}'
                            value={importJson}
                            onChange={(e) => setImportJson(e.target.value)}
                            className="h-32 text-2xs font-mono bg-background/50 border-border/40"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                onClick={handleImportTheme}
                                size="sm"
                                disabled={!importJson.trim()}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-7.5"
                            >
                                Import Theme
                            </Button>
                        </div>
                    </div>
                </div>
            </SettingItem>
        </SettingsCardShell>
    );
}
