import { Input } from "@/components/ui/input"
import TxAnchor from '@/components/TxAnchor'
import InlineCode from '@/components/InlineCode'
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { RadioGroup } from "@/components/ui/radio-group"
import BigRadioItem from "@/components/BigRadioItem"
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import { AutosizeTextarea, AutosizeTextAreaRef } from "@/components/ui/autosize-textarea"
import SettingsCardShell from "../SettingsCardShell"
import { txToast } from "@/components/TxToaster"
import consts from "@shared/consts"
import { useTranslation } from "@/hooks/translator"


export const pageConfigs = {
    whitelistMode: getPageConfig('whitelist', 'mode'),
    rejectionMessage: getPageConfig('whitelist', 'rejectionMessage'),
    discordRoles: getPageConfig('whitelist', 'discordRoles'),
    allowlistInstructions: getPageConfig('whitelist', 'allowlistInstructions'),
} as const;

export default function ConfigCardWhitelist({ cardCtx, pageCtx }: SettingsCardProps) {
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
    const rejectionMessageRef = useRef<AutosizeTextAreaRef | null>(null);
    const discordRolesRef = useRef<HTMLInputElement | null>(null);
    const allowlistInstructionsRef = useRef<HTMLInputElement | null>(null);

    //Marshalling Utils
    const inputArrayUtil = {
        toUi: (args?: string[]) => args ? args.join(', ') : '',
        toCfg: (str?: string) => str ? str.split(/[,;]\s*/).map(x => x.trim()).filter(x => x.length) : [],
    }

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        let currDiscordRoles;
        if (discordRolesRef.current) {
            currDiscordRoles = inputArrayUtil.toCfg(discordRolesRef.current.value);
        }
        const overwrites = {
            rejectionMessage: rejectionMessageRef.current?.textArea.value,
            discordRoles: currDiscordRoles,
            allowlistInstructions: allowlistInstructionsRef.current?.value,
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (
            localConfigs.whitelist?.rejectionMessage
            && localConfigs.whitelist.rejectionMessage.length > 512
        ) {
            return txToast.error({
                title: t('web.settings.whitelist.val_rejection_title'),
                md: true,
                msg: t('web.settings.whitelist.val_rejection_msg'),
            });
        }
        if (
            localConfigs.whitelist?.mode === 'discordMember'
            || localConfigs.whitelist?.mode === 'discordRoles'
        ) {
            if (pageCtx.apiData?.storedConfigs.discordBot?.enabled !== true) {
                return txToast.warning({
                    title: t('web.settings.whitelist.val_bot_required_title'),
                    msg: t('web.settings.whitelist.val_bot_required_msg'),
                });
            }
            if (
                localConfigs.whitelist?.mode === 'discordRoles'
                && (
                    !Array.isArray(localConfigs.whitelist?.discordRoles)
                    || !localConfigs.whitelist?.discordRoles.length
                )
            ) {
                return txToast.warning({
                    title: t('web.settings.whitelist.val_roles_required_title'),
                    msg: t('web.settings.whitelist.val_roles_required_msg'),
                });
            }
        }
        if (Array.isArray(localConfigs.whitelist?.discordRoles)) {
            const invalidRoles = localConfigs.whitelist.discordRoles
                .filter(x => !consts.regexDiscordSnowflake.test(x))
                .map(x => `- \`${x.slice(0, 20)}\``);
            if (invalidRoles.length) {
                return txToast.error({
                    title: t('web.settings.whitelist.val_invalid_roles_title'),
                    md: true,
                    msg: t('web.settings.whitelist.val_invalid_roles_msg', { roles: invalidRoles.join('\n') }),
                });
            }
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label={t('web.settings.whitelist.label')}>
                <RadioGroup
                    value={states.whitelistMode}
                    onValueChange={cfg.whitelistMode.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="disabled"
                        title={t('web.settings.whitelist.mode_disabled')}
                        desc={t('web.settings.whitelist.mode_disabled_desc')}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="adminOnly"
                        title={t('web.settings.whitelist.mode_admin')}
                        desc={(<>
                            {t('web.settings.whitelist.mode_admin_desc1')}<InlineCode>fivem:</InlineCode> or <InlineCode>discord:</InlineCode>{t('web.settings.whitelist.mode_admin_desc2')}
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="discordMember"
                        title={t('web.settings.whitelist.mode_discord_member')}
                        desc={(<>
                            {t('web.settings.whitelist.mode_discord_member_desc1')}<InlineCode>discord:</InlineCode>{t('web.settings.whitelist.mode_discord_member_desc2')}
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="discordRoles"
                        title={t('web.settings.whitelist.mode_discord_roles')}
                        desc={(<>
                            {t('web.settings.whitelist.mode_discord_roles_desc1')}<InlineCode>discord:</InlineCode>{t('web.settings.whitelist.mode_discord_roles_desc2')}
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="approvedLicense"
                        title={t('web.settings.whitelist.mode_approved')}
                        desc={(<>
                            {t('web.settings.whitelist.mode_approved_desc1')}<InlineCode>license:</InlineCode>{t('web.settings.whitelist.mode_approved_desc2')}<TxAnchor href="/whitelist">{t('web.settings.whitelist.mode_approved_desc3')}</TxAnchor>{t('web.settings.whitelist.mode_approved_desc4')}<InlineCode>/whitelist</InlineCode>{t('web.settings.whitelist.mode_approved_desc5')}
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="external"
                        title={t('web.settings.whitelist.mode_external')}
                        desc={t('web.settings.whitelist.mode_external_desc')}
                    />
                </RadioGroup>
                <SettingItemDesc>
                    <strong>{t('web.settings.whitelist.note')}</strong>{t('web.settings.whitelist.note_desc')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.whitelist.rejection_label')} htmlFor={cfg.rejectionMessage.eid} showOptional>
                <AutosizeTextarea
                    id={cfg.rejectionMessage.eid}
                    ref={rejectionMessageRef}
                    placeholder={t('web.settings.whitelist.rejection_placeholder')}
                    defaultValue={cfg.rejectionMessage.initialValue}
                    onInput={updatePageState}
                    autoComplete="off"
                    minHeight={60}
                    maxHeight={180}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.whitelist.rejection_desc1')} <br />
                    {t('web.settings.whitelist.rejection_desc2')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.whitelist.allowlist_instructions_label')} htmlFor={cfg.allowlistInstructions.eid} showOptional>
                <Input
                    id={cfg.allowlistInstructions.eid}
                    ref={allowlistInstructionsRef}
                    defaultValue={cfg.allowlistInstructions.initialValue}
                    placeholder={t('web.settings.whitelist.allowlist_instructions_placeholder')}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.whitelist.allowlist_instructions_desc1')}<InlineCode>sv_allowlistInstructions</InlineCode>{t('web.settings.whitelist.allowlist_instructions_desc2')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.whitelist.discord_roles_label')} htmlFor={cfg.discordRoles.eid}>
                <Input
                    id={cfg.discordRoles.eid}
                    ref={discordRolesRef}
                    defaultValue={inputArrayUtil.toUi(cfg.discordRoles.initialValue)}
                    placeholder={t('web.settings.whitelist.discord_roles_placeholder')}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.whitelist.discord_roles_desc1')} <br />
                    {t('web.settings.whitelist.discord_roles_desc2')} <br />
                    <strong>{t('web.settings.whitelist.discord_roles_desc3')}</strong>{t('web.settings.whitelist.discord_roles_desc4')}
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
