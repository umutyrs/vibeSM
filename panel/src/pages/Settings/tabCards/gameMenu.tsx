import { Input } from "@/components/ui/input";
import SwitchText from '@/components/SwitchText';
import InlineCode from '@/components/InlineCode';
import { AdvancedDivider, SettingItem, SettingItemDesc } from '../settingsItems';
import { useState, useEffect, useMemo, useReducer } from "react";
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils";
import SettingsCardShell from "../SettingsCardShell";
import { useTranslation } from "@/hooks/translator";


export const pageConfigs = {
    menuEnabled: getPageConfig('gameFeatures', 'menuEnabled'),
    alignRight: getPageConfig('gameFeatures', 'menuAlignRight'),
    pageKey: getPageConfig('gameFeatures', 'menuPageKey'),
    playerModePtfx: getPageConfig('gameFeatures', 'playerModePtfx'),
} as const;

export default function ConfigCardGameMenu({ cardCtx, pageCtx }: SettingsCardProps) {
    const { t } = useTranslation();
    const [showAdvanced, setShowAdvanced] = useState(false);
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
    useEffect(() => {
        if (showAdvanced) return;
        Object.values(cfg).forEach(c => c.isAdvanced && c.state.discard());
    }, [showAdvanced]);


    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {};

        const res = getConfigDiff(cfg, states, overwrites, showAdvanced);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }


    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;
        //NOTE: nothing to validate
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    //Card content stuff
    const handlePageKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!e.metaKey) e.preventDefault();

        if (["Escape", "Backspace"].includes(e.code)) {
            cfg.pageKey.state.set('Tab');
        } else {
            cfg.pageKey.state.set(e.code);
        }
    }

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
            advancedVisible={showAdvanced}
            advancedSetter={setShowAdvanced}
        >
            <SettingItem label={t('web.settings.gamemenu.label')}>
                <SwitchText
                    id={cfg.menuEnabled.eid}
                    checkedLabel={t('web.settings.enabled')}
                    uncheckedLabel={t('web.settings.disabled')}
                    variant="checkedGreen"
                    checked={states.menuEnabled}
                    onCheckedChange={cfg.menuEnabled.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamemenu.desc1')}<InlineCode>/tx</InlineCode>{t('web.settings.gamemenu.desc2')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.gamemenu.align_right_label')}>
                <SwitchText
                    id={cfg.alignRight.eid}
                    checkedLabel={t('web.settings.gamemenu.align_right_checked')}
                    uncheckedLabel={t('web.settings.gamemenu.align_right_unchecked')}
                    checked={states.alignRight}
                    onCheckedChange={cfg.alignRight.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamemenu.align_right_desc')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.gamemenu.page_key_label')} htmlFor={cfg.pageKey.eid} required>
                <Input
                    id={cfg.pageKey.eid}
                    value={states.pageKey}
                    placeholder={t('web.settings.gamemenu.page_key_placeholder')}
                    onKeyDown={handlePageKey}
                    className="font-mono"
                    readOnly
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamemenu.page_key_desc1')} <br />
                    {t('web.settings.gamemenu.page_key_desc2')} <br />
                    <strong>{t('web.settings.fxserver.restart_schedule_desc2')}</strong>{t('web.settings.gamemenu.page_key_desc4')}<InlineCode>Tab</InlineCode>{t('web.settings.gamemenu.page_key_desc5')}<InlineCode>Escape</InlineCode>{t('web.settings.gamemenu.page_key_desc6')}<InlineCode>Backspace</InlineCode>.
                </SettingItemDesc>
            </SettingItem>

            {showAdvanced && <AdvancedDivider />}

            <SettingItem label={t('web.settings.gamemenu.effect_label')} showIf={showAdvanced}>
                <SwitchText
                    id={cfg.playerModePtfx.eid}
                    checkedLabel={t('web.settings.enabled')}
                    uncheckedLabel={t('web.settings.disabled')}
                    variant="checkedGreen"
                    checked={states.playerModePtfx}
                    onCheckedChange={cfg.playerModePtfx.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamemenu.effect_desc1')} <br />
                    <strong>{t('web.settings.fxserver.timezone_warn1')}</strong> {t('web.settings.gamemenu.effect_desc3')}
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
