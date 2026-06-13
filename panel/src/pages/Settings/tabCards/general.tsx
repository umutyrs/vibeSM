import { Input } from "@/components/ui/input"
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import SettingsCardShell from "../SettingsCardShell"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import InlineCode from "@/components/InlineCode"
import TxAnchor from "@/components/TxAnchor"
import { txToast } from "@/components/TxToaster"
import SwitchText from '@/components/SwitchText'
import { useAuth } from "@/hooks/auth"
import { useTranslation } from "@/hooks/translator"


const detectBrowserLanguage = () => {
    const txTopLocale = Array.isArray(window.txBrowserLocale)
        ? window.txBrowserLocale[0]
        : window.txBrowserLocale;
    try {
        return new Intl.Locale(txTopLocale).language
    } catch (error) { }
    try {
        if (txTopLocale.includes('-')) {
            return txTopLocale.split('-')[0];
        }
    } catch (error) { }
    return undefined;
}


export const pageConfigs = {
    serverName: getPageConfig('general', 'serverName'),
    language: getPageConfig('general', 'language'),
    twoFactorRequired: getPageConfig('general', 'twoFactorRequired'),
} as const;

export default function ConfigCardGeneral({ cardCtx, pageCtx }: SettingsCardProps) {
    const { authData } = useAuth();
    const isMaster = authData?.isMaster === true;
    const { t } = useTranslation();

    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes and reset advanced settings
    useEffect(() => {
        updatePageState();
    }, [states]);

    //Refs for configs that don't use state
    const serverNameRef = useRef<HTMLInputElement | null>(null);

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {
            serverName: serverNameRef.current?.value,
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (!localConfigs.general?.serverName) {
            return txToast.error(t('web.settings.general.server_name_required'));
        }
        if (localConfigs.general?.serverName?.length > 18) {
            return txToast.error(t('web.settings.general.server_name_too_big'));
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    //Small QOL to hoist the detected browser language to the top of the list
    const localeData = useMemo(() => {
        if (!pageCtx.apiData?.locales) return null;
        const browserLanguage = detectBrowserLanguage();
        let enData;
        let browserData;
        let otherData = [];
        for (const lang of pageCtx.apiData?.locales) {
            if (lang.code === 'en') {
                enData = lang;
            } else if (lang.code === browserLanguage) {
                browserData = {
                    code: lang.code,
                    label: `${lang.label} (browser)`
                };
            } else {
                otherData.push(lang);
            }
        }
        return [
            enData,
            browserData,
            'sep1',
            ...otherData,
            'sep2',
            { code: 'custom', label: 'Custom (txData/locale.json)' }
        ].filter(Boolean);
    }, [pageCtx.apiData]);

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label={t('web.settings.general.server_name')} htmlFor={cfg.serverName.eid} required>
                <Input
                    id={cfg.serverName.eid}
                    ref={serverNameRef}
                    defaultValue={cfg.serverName.initialValue}
                    placeholder={'Example RP'}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.general.server_name_desc1')}<strong>{t('web.settings.general.server_name_desc2')}</strong>{t('web.settings.general.server_name_desc3')} <br />
                    {t('web.settings.general.server_name_desc4')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.general.language')} htmlFor={cfg.language.eid} required>
                {/* TODO: add a "Edit xxx" button besides the language for easy custom.json locale */}
                <Select
                    value={states.language}
                    onValueChange={cfg.language.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.language.eid}>
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {localeData?.map((locale) => (
                            typeof locale === 'object'
                                ? <SelectItem key={locale.code} value={locale.code}>{locale.label}</SelectItem>
                                : <SelectSeparator key={locale} />
                        ))}
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    {t('web.settings.general.language_desc1')} <br />
                    {t('web.settings.general.language_desc2')}<InlineCode>Custom</InlineCode>{t('web.settings.general.language_desc3')} <br />
                    {t('web.settings.general.language_desc4')}<TxAnchor href="https://github.com/tabarra/vibeSM/blob/master/docs/translation.md">{t('web.settings.general.language_desc5')}</TxAnchor>.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.2fa.settings_title')} htmlFor={cfg.twoFactorRequired.eid}>
                <SwitchText
                    id={cfg.twoFactorRequired.eid}
                    checked={states.twoFactorRequired}
                    onCheckedChange={cfg.twoFactorRequired.state.set}
                    disabled={pageCtx.isReadOnly || !isMaster}
                >
                    {t('web.2fa.settings_switch')}
                </SwitchText>
                <SettingItemDesc>
                    {t('web.2fa.settings_desc')}
                    {!isMaster && <span className="text-destructive-inline block mt-1">{t('web.2fa.settings_only_master')}</span>}
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
