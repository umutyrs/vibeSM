import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, RefreshCw } from "lucide-react";
import { SettingsCardProps } from "../utils";
import { SettingItemDesc } from '../settingsItems';
import { useBackendApi } from "@/hooks/fetch";
import { txToast } from "@/components/TxToaster";
import { useTranslation } from "@/hooks/translator";

export default function ConfigCardLanguage({ cardCtx, pageCtx }: SettingsCardProps) {
    const { t } = useTranslation();
    const [activeLang, setActiveLang] = useState<string>('en');

    const saveGeneralConfigApi = useBackendApi<any, any>({
        method: 'POST',
        path: '/settings/configs/general',
    });

    useEffect(() => {
        // Read current general config language
        if (pageCtx.apiData?.storedConfigs?.general?.language) {
            setActiveLang(pageCtx.apiData.storedConfigs.general.language);
        }
    }, [pageCtx.apiData]);

    // Handle saving the primary system language
    const handleSaveSystemLanguage = async () => {
        const toastId = txToast.loading(t('web.settings.language.updating_system_lang'));
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
                txToast.success(t('web.settings.language.system_lang_updated'), { id: toastId });
                // Force a page reload to let translation changes propagate instantly
                window.location.reload();
            }
        } catch (err) {
            txToast.error(t('web.settings.language.err_save_lang_setting'), { id: toastId });
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
                    <h3 className="text-base font-bold text-white tracking-wide">{t('web.language.active_system')}</h3>
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
                            {t('web.settings.language.desc_custom')}
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
                            {t('web.language.apply_language')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
