import TxAnchor from '@/components/TxAnchor';
import SwitchText from '@/components/SwitchText';
import InlineCode from '@/components/InlineCode';
import { SettingItem, SettingItemDesc } from '../settingsItems';
import { useEffect, useMemo, useReducer } from "react";
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils";
import SettingsCardShell from '../SettingsCardShell';
import { useTranslation } from "@/hooks/translator";


export const pageConfigs = {
    hideAdminInPunishments: getPageConfig('gameFeatures', 'hideAdminInPunishments'),
    hideAdminInMessages: getPageConfig('gameFeatures', 'hideAdminInMessages'),
    hideDefaultAnnouncement: getPageConfig('gameFeatures', 'hideDefaultAnnouncement'),
    hideDefaultDirectMessage: getPageConfig('gameFeatures', 'hideDefaultDirectMessage'),
    hideDefaultWarning: getPageConfig('gameFeatures', 'hideDefaultWarning'),
    hideScheduledRestartWarnings: getPageConfig('gameFeatures', 'hideDefaultScheduledRestartWarning'),
} as const;

export default function ConfigCardGameNotifications({ cardCtx, pageCtx }: SettingsCardProps) {
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

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {};

        const res = getConfigDiff(cfg, states, overwrites, false);
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

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label={t('web.settings.gamenotif.hide_admin_punish_label')}>
                <SwitchText
                    id={cfg.hideAdminInPunishments.eid}
                    checkedLabel={t('web.settings.gamenotif.hide_admin_punish_checked')}
                    uncheckedLabel={t('web.settings.gamenotif.hide_admin_punish_unchecked')}
                    checked={states.hideAdminInPunishments}
                    onCheckedChange={cfg.hideAdminInPunishments.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamenotif.hide_admin_punish_desc1')}<strong>{t('web.settings.gamenotif.hide_admin_punish_desc2')}</strong>{t('web.settings.gamenotif.hide_admin_punish_desc3')}<strong>{t('web.settings.gamenotif.hide_admin_punish_desc4')}</strong>. <br />
                    {t('web.settings.gamenotif.hide_admin_punish_desc5')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.gamenotif.hide_admin_msg_label')}>
                <SwitchText
                    id={cfg.hideAdminInMessages.eid}
                    checkedLabel={t('web.settings.gamenotif.hide_admin_punish_checked')}
                    uncheckedLabel={t('web.settings.gamenotif.hide_admin_punish_unchecked')}
                    checked={states.hideAdminInMessages}
                    onCheckedChange={cfg.hideAdminInMessages.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamenotif.hide_admin_msg_desc1')}<strong>{t('web.settings.gamenotif.hide_admin_msg_desc2')}</strong>{t('web.settings.gamenotif.hide_admin_msg_desc3')}<strong>{t('web.settings.gamenotif.hide_admin_msg_desc4')}</strong>. <br />
                    {t('web.settings.gamenotif.hide_admin_msg_desc5')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.gamenotif.hide_announcement_label')}>
                <SwitchText
                    id={cfg.hideDefaultAnnouncement.eid}
                    checkedLabel={t('web.settings.gamenotif.hide_admin_punish_checked')}
                    uncheckedLabel={t('web.settings.gamenotif.hide_admin_punish_unchecked')}
                    checked={states.hideDefaultAnnouncement}
                    onCheckedChange={cfg.hideDefaultAnnouncement.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamenotif.hide_announcement_desc1')}<InlineCode>vibeSM:events:announcement</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/vibesm-events#vibesmeventsannouncement">{t('web.settings.gamenotif.hide_announcement_desc2')}</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.gamenotif.hide_dm_label')}>
                <SwitchText
                    id={cfg.hideDefaultDirectMessage.eid}
                    checkedLabel={t('web.settings.gamenotif.hide_admin_punish_checked')}
                    uncheckedLabel={t('web.settings.gamenotif.hide_admin_punish_unchecked')}
                    checked={states.hideDefaultDirectMessage}
                    onCheckedChange={cfg.hideDefaultDirectMessage.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamenotif.hide_dm_desc1')}<InlineCode>vibeSM:events:playerDirectMessage</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/vibesm-events#vibesmeventsplayerdirectmessage">{t('web.settings.gamenotif.hide_announcement_desc2')}</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.gamenotif.hide_warn_label')}>
                <SwitchText
                    id={cfg.hideDefaultWarning.eid}
                    checkedLabel={t('web.settings.gamenotif.hide_admin_punish_checked')}
                    uncheckedLabel={t('web.settings.gamenotif.hide_admin_punish_unchecked')}
                    checked={states.hideDefaultWarning}
                    onCheckedChange={cfg.hideDefaultWarning.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamenotif.hide_warn_desc1')}<InlineCode>vibeSM:events:playerWarned</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/vibesm-events#vibesmeventsplayerwarned">{t('web.settings.gamenotif.hide_announcement_desc2')}</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.gamenotif.hide_restart_label')}>
                <SwitchText
                    id={cfg.hideScheduledRestartWarnings.eid}
                    checkedLabel={t('web.settings.gamenotif.hide_admin_punish_checked')}
                    uncheckedLabel={t('web.settings.gamenotif.hide_admin_punish_unchecked')}
                    checked={states.hideScheduledRestartWarnings}
                    onCheckedChange={cfg.hideScheduledRestartWarnings.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.gamenotif.hide_restart_desc1')}<InlineCode>vibeSM:events:scheduledRestart</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/vibesm-events#vibesmeventsscheduledrestart">{t('web.settings.gamenotif.hide_announcement_desc2')}</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
