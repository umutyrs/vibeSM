import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Search, Save, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { SettingsCardProps } from "../utils";
import SettingsCardShell from "../SettingsCardShell";
import { SettingItem, SettingItemDesc } from '../settingsItems';
import { useBackendApi } from "@/hooks/fetch";
import { txToast } from "@/components/TxToaster";
import { Label } from "@/components/ui/label";

export default function ConfigCardLanguage({ cardCtx, pageCtx }: SettingsCardProps) {
    const [activeLang, setActiveLang] = useState<string>('en');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    
    // Custom translation phrases dictionary
    const [customPhrases, setCustomPhrases] = useState<Record<string, any>>({});
    const [loadingPhrases, setLoadingPhrases] = useState<boolean>(true);
    const [isSavingLocale, setIsSavingLocale] = useState<boolean>(false);

    // Community languages states
    const [communityLocales, setCommunityLocales] = useState<any[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState<boolean>(true);
    const [shareLangAuthor, setShareLangAuthor] = useState("");
    const [shareLangTitle, setShareLangTitle] = useState("");

    // Fetch community locales on mount
    useEffect(() => {
        const fetchCommunityLocales = async () => {
            try {
                const res = await fetch("https://vibesm.cc/api/community/locales");
                if (res.ok) {
                    const data = await res.json();
                    setCommunityLocales(data);
                }
            } catch (e) {
                console.error("Failed to fetch community locales", e);
            } finally {
                setLoadingCommunity(false);
            }
        };
        fetchCommunityLocales();
    }, []);

    // Apply community locale to the system
    const applyCommunityLocale = async (locale: any) => {
        const toastId = txToast.loading(`Importing and applying community language "${locale.name}"...`);
        try {
            // 1. Save translations to backend locale.json
            const saveRes = await saveLocaleApi({
                data: {
                    ...customPhrases,
                    ...locale.translations
                }
            });
            
            if (saveRes && saveRes.type === 'success') {
                // 2. Set active system language to custom
                const configRes = await saveGeneralConfigApi({
                    data: {
                        resetKeys: [],
                        changes: {
                            general: {
                                language: 'custom',
                            }
                        }
                    }
                });

                if (configRes && configRes.type === 'success') {
                    txToast.success(`Successfully applied community language "${locale.name}"!`, { id: toastId });
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                } else {
                    txToast.error("Failed to update active system language.", { id: toastId });
                }
            } else {
                txToast.error(saveRes?.msg || "Failed to import translations to locale.json.", { id: toastId });
            }
        } catch (err) {
            txToast.error("Error applying community locale.", { id: toastId });
        }
    };

    // Share current translations to the community
    const handleShareLocale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shareLangTitle.trim() || !shareLangAuthor.trim()) {
            return txToast.error("Please fill in the Language Title and Author Name.");
        }

        try {
            const res = await fetch("https://vibesm.cc/api/community/locales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: shareLangTitle.trim(),
                    author: shareLangAuthor.trim(),
                    translations: customPhrases
                })
            });
            if (res.ok) {
                const data = await res.json();
                setCommunityLocales(prev => [...prev, data]);
                setShareLangTitle("");
                setShareLangAuthor("");
                txToast.success("Your translations have been shared with the community successfully!");
            } else {
                txToast.error("Failed to share language pack.");
            }
        } catch (e) {
            txToast.error("Failed to connect to community backend database.");
        }
    };

    // API calls
    const getLocaleApi = useBackendApi<{ phrases: any }>({
        method: 'GET',
        path: '/settings/locale',
    });

    const saveLocaleApi = useBackendApi<any, any>({
        method: 'POST',
        path: '/settings/locale',
    });

    const saveGeneralConfigApi = useBackendApi<any, any>({
        method: 'POST',
        path: '/settings/configs/general',
    });

    // Fetch custom translations on mount
    const loadTranslations = async () => {
        setLoadingPhrases(true);
        try {
            const res = await getLocaleApi({});
            if (res && res.phrases) {
                setCustomPhrases(res.phrases);
            }
        } catch (error) {
            console.error('Error reading translations', error);
            txToast.error('Failed to load translation keys.');
        } finally {
            setLoadingPhrases(false);
        }
    };

    useEffect(() => {
        loadTranslations();
        // Read current general config language
        if (pageCtx.apiData?.storedConfigs?.general?.language) {
            setActiveLang(pageCtx.apiData.storedConfigs.general.language);
        }
    }, [pageCtx.apiData]);

    // Handle saving the primary system language
    const handleSaveSystemLanguage = async () => {
        const toastId = txToast.loading('Updating system language...');
        try {
            const res = await saveGeneralConfigApi({
                data: {
                    resetKeys: [],
                    changes: {
                        general: {
                            language: activeLang,
                        }
                    }
                }
            });
            if (res && res.type === 'success') {
                txToast.success('Primary system language updated successfully!', { id: toastId });
                // Force a page reload to let translation changes propagate instantly
                window.location.reload();
            }
        } catch (err) {
            txToast.error('Failed to save language setting.', { id: toastId });
        }
    };

    // Flatten nested objects to dot-notation for easy tabular editing
    const flattenedPhrases = useMemo(() => {
        const result: Record<string, string> = {};
        
        const recurse = (cur: any, prop: string) => {
            if (Object(cur) !== cur) {
                result[prop] = cur;
            } else if (Array.isArray(cur)) {
                // Should not happen in locale json, but good fallback
                result[prop] = cur.join(', ');
            } else {
                let isEmpty = true;
                for (const p in cur) {
                    isEmpty = false;
                    recurse(cur[p], prop ? prop + '.' + p : p);
                }
                if (isEmpty && prop) {
                    result[prop] = '';
                }
            }
        };
        
        // Exclude meta properties
        const { $meta, ...phrasesOnly } = customPhrases;
        recurse(phrasesOnly, '');
        return result;
    }, [customPhrases]);

    // Reconstruct nested structure from flattened dot-notation
    const unflattenPhrases = (flat: Record<string, string>) => {
        const result: Record<string, any> = {
            $meta: customPhrases.$meta || {
                label: "Custom Locale",
                humanizer_language: "en"
            }
        };

        for (const path in flat) {
            const parts = path.split('.');
            let cur = result;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    cur[part] = flat[path];
                } else {
                    if (!cur[part]) {
                        cur[part] = {};
                    }
                    cur = cur[part];
                }
            }
        }
        return result;
    };

    // Categorized phrases list
    const phraseKeys = useMemo(() => {
        return Object.keys(flattenedPhrases);
    }, [flattenedPhrases]);

    // Categories list based on root key mapping
    const categories = useMemo(() => {
        const cats = new Set<string>();
        phraseKeys.forEach(key => {
            const root = key.split('.')[0];
            if (root) cats.add(root);
        });
        return Array.from(cats);
    }, [phraseKeys]);

    // Filter phrases based on search queries and category choices
    const filteredKeys = useMemo(() => {
        return phraseKeys.filter(key => {
            const matchesQuery = key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(flattenedPhrases[key]).toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesCategory = selectedCategory === 'all' || key.startsWith(selectedCategory + '.');
            
            return matchesQuery && matchesCategory;
        });
    }, [phraseKeys, searchQuery, selectedCategory, flattenedPhrases]);

    // Handle single key phrase change
    const handlePhraseChange = (key: string, value: string) => {
        const updated = { ...flattenedPhrases, [key]: value };
        setCustomPhrases(unflattenPhrases(updated));
    };

    // Handle saving custom translations to backend locale.json
    const handleSaveCustomLocale = async () => {
        setIsSavingLocale(true);
        const toastId = txToast.loading('Saving custom translations to locale.json...');
        try {
            const res = await saveLocaleApi({
                data: customPhrases
            });
            if (res && res.type === 'success') {
                txToast.success('Custom translation file saved successfully!', { id: toastId });
                // If currently using custom, reload to update UI
                if (activeLang === 'custom') {
                    window.location.reload();
                }
            } else {
                txToast.error(res?.msg || 'Error saving translations.', { id: toastId });
            }
        } catch (error) {
            txToast.error('An error occurred during translation save.', { id: toastId });
        } finally {
            setIsSavingLocale(false);
        }
    };

    // QOL browser language helpers
    const localeData = useMemo(() => {
        if (!pageCtx.apiData?.locales) return null;
        return [
            ...pageCtx.apiData.locales,
            { code: 'custom', label: 'Custom (txData/locale.json)' }
        ];
    }, [pageCtx.apiData]);

    return (
        <div className="space-y-6">
            {/* System Language Configuration */}
            <div className="bg-card border border-border/40 rounded-xl p-5 md:p-6 space-y-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3 select-none">
                    <Globe className="size-5 text-primary" />
                    <h3 className="text-base font-bold text-white tracking-wide">Active System Language</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                    <div className="md:col-span-8 space-y-2">
                        <Select
                            value={activeLang}
                            onValueChange={setActiveLang}
                            disabled={pageCtx.isReadOnly}
                        >
                            <SelectTrigger id="active-language">
                                <SelectValue placeholder="Select Language..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {localeData?.map((locale) => (
                                    <SelectItem key={locale.code} value={locale.code}>{locale.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <SettingItemDesc>
                            Sets the primary language for chat, console log categories, and bot messaging components. Select <strong>Custom</strong> to load the modified translations below.
                        </SettingItemDesc>
                    </div>
                    <div className="md:col-span-4">
                        <Button
                            type="button"
                            onClick={handleSaveSystemLanguage}
                            disabled={pageCtx.isReadOnly || activeLang === pageCtx.apiData?.storedConfigs?.general?.language}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 transition-all flex items-center justify-center gap-1.5"
                        >
                            <RefreshCw className="size-4" />
                            Apply Language
                        </Button>
                    </div>
                </div>
            </div>

            {/* Community Languages Library */}
            <div className="bg-card border border-border/40 rounded-xl p-5 md:p-6 space-y-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3 select-none">
                    <Globe className="size-5 text-emerald-400 animate-pulse" />
                    <h3 className="text-base font-bold text-white tracking-wide">Community Languages Hub</h3>
                </div>
                
                {loadingCommunity ? (
                    <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5 select-none">
                        <RefreshCw className="size-5 animate-spin text-primary" />
                        <span className="text-xs">Loading community languages...</span>
                    </div>
                ) : communityLocales.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground text-xs select-none">
                        No community language packs available yet. Be the first to share one!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {communityLocales.map((locale) => (
                            <div key={locale.code} className="bg-background/40 border border-border/25 rounded-lg p-4 flex flex-col justify-between space-y-4 hover:border-border/50 transition-colors">
                                <div className="space-y-1.5">
                                    <div className="text-sm font-bold text-white flex items-center justify-between">
                                        <span className="truncate pr-2">{locale.name}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">by {locale.author}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed text-left">
                                        Community localization package containing {Object.keys(locale.translations || {}).length} phrase overrides.
                                    </p>
                                </div>
                                <div className="flex items-center justify-end pt-2 border-t border-border/20">
                                    <Button
                                        type="button"
                                        onClick={() => applyCommunityLocale(locale)}
                                        size="sm"
                                        className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs h-7.5 px-3"
                                    >
                                        Import & Apply
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Share current custom translations to community */}
                <form onSubmit={handleShareLocale} className="bg-foreground/5 border border-border/40 rounded-xl p-4 space-y-4 shadow-sm mt-6">
                    <div className="text-xs font-bold text-white select-none text-left">Share Your Current Custom Translations</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                            <Label htmlFor="share-lang-title" className="text-xs text-foreground/80">Language Pack Title</Label>
                            <Input
                                id="share-lang-title"
                                placeholder="e.g. German Casual, Pirate Dialect"
                                value={shareLangTitle}
                                onChange={e => setShareLangTitle(e.target.value)}
                                className="h-9 bg-background/50 border-border/40"
                                required
                            />
                        </div>
                        <div className="space-y-1.5 text-left">
                            <Label htmlFor="share-lang-author" className="text-xs text-foreground/80">Author Name</Label>
                            <Input
                                id="share-lang-author"
                                placeholder="Your Name or Team Name"
                                value={shareLangAuthor}
                                onChange={e => setShareLangAuthor(e.target.value)}
                                className="h-9 bg-background/50 border-border/40"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!shareLangTitle.trim() || !shareLangAuthor.trim() || Object.keys(customPhrases).length === 0}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8.5 px-4 transition-all"
                        >
                            <Save className="size-4 mr-1.5" />
                            Share with Community
                        </Button>
                    </div>
                </form>
            </div>

            {/* Translations Phrases Custom Editor */}
            <div className="bg-card border border-border/40 rounded-xl p-5 md:p-6 space-y-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div className="flex items-center gap-2 select-none">
                        <BookOpen className="size-5 text-primary" />
                        <h3 className="text-base font-bold text-white tracking-wide">Custom Translations Editor</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Categories select filter */}
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectSeparator />
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat} className="capitalize">{cat.replace(/_/g, ' ')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Search input filter */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                            <Input
                                type="text"
                                placeholder="Search phrases..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-9 pl-9 text-xs"
                            />
                        </div>
                    </div>
                </div>

                {loadingPhrases ? (
                    <div className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 select-none">
                        <RefreshCw className="size-6 animate-spin text-primary" />
                        <span>Loading translation dictionary keys...</span>
                    </div>
                ) : filteredKeys.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground select-none">
                        No translation keys match your search criteria.
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                        {filteredKeys.map(key => (
                            <div key={key} className="bg-background/40 border border-border/20 rounded-lg p-3.5 space-y-2 hover:border-border/40 transition-colors">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-mono text-2xs font-bold text-[#8a8b8d] select-all bg-foreground/5 px-2 py-0.5 rounded border border-border/20">
                                        {key}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-primary/75 select-none bg-primary/5 px-1.5 py-0.25 rounded border border-primary/10">
                                        {key.split('.')[0].replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <Textarea
                                    value={flattenedPhrases[key]}
                                    onChange={e => handlePhraseChange(key, e.target.value)}
                                    placeholder="Enter translation text..."
                                    className="min-h-[44px] max-h-24 bg-[#111214] border-[#222326] hover:border-[#323337] focus:border-primary text-xs"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Save Custom Translations Action */}
                <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-2 max-w-xl select-none">
                        <AlertCircle className="size-4.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-3xs text-muted-foreground leading-normal">
                            All modified fields will be compiled and written dynamically to your server's custom <code className="bg-foreground/5 px-1 py-0.25 rounded border border-border/20">locale.json</code> file. Ensure your active language above is set to <strong>Custom</strong> to load these templates.
                        </span>
                    </div>
                    <Button
                        type="button"
                        onClick={handleSaveCustomLocale}
                        disabled={isSavingLocale || loadingPhrases || pageCtx.isReadOnly}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-6 transition-all flex items-center justify-center gap-1.5 shadow-md self-end"
                    >
                        <Save className="size-4" />
                        Save Translations
                    </Button>
                </div>
            </div>
        </div>
    );
}
