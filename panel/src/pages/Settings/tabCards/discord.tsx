import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import TxAnchor from '@/components/TxAnchor'
import { RotateCcwIcon, XIcon } from 'lucide-react'
import SwitchText from '@/components/SwitchText'
import InlineCode from '@/components/InlineCode'
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import SettingsCardShell from "../SettingsCardShell"
import { Textarea } from "@/components/ui/textarea"
import { txToast } from "@/components/TxToaster"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/translator"


//We are not validating the JSON, only that it is a string
export const attemptBeautifyJsonString = (input: string) => {
    try {
        return JSON.stringify(JSON.parse(input), null, 4);
    } catch (error) {
        return input;
    }
};


export const pageConfigs = {
    botEnabled: getPageConfig('discordBot', 'enabled'),
    botToken: getPageConfig('discordBot', 'token'),
    discordGuild: getPageConfig('discordBot', 'guild'),
    warningsChannel: getPageConfig('discordBot', 'warningsChannel'),
    embedJson: getPageConfig('discordBot', 'embedJson'),
    embedConfigJson: getPageConfig('discordBot', 'embedConfigJson'),
    activityDescription: getPageConfig('discordBot', 'activityDescription'),
    activityDescriptionStarting: getPageConfig('discordBot', 'activityDescriptionStarting'),
    activityType: getPageConfig('discordBot', 'activityType'),
    allowDangerousPermissions: getPageConfig('discordBot', 'allowDangerousPermissions'),
} as const;

export default function ConfigCardDiscord({ cardCtx, pageCtx }: SettingsCardProps) {
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
    const botTokenRef = useRef<HTMLInputElement | null>(null);
    const discordGuildRef = useRef<HTMLInputElement | null>(null);
    const warningsChannelRef = useRef<HTMLInputElement | null>(null);
    const activityDescriptionRef = useRef<HTMLInputElement | null>(null);
    const activityDescriptionStartingRef = useRef<HTMLInputElement | null>(null);

    //Marshalling Utils
    const emptyToNull = (str?: string) => {
        if (str === undefined) return undefined;
        const trimmed = str.trim();
        return trimmed.length ? trimmed : null;
    };

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {
            botToken: emptyToNull(botTokenRef.current?.value),
            discordGuild: emptyToNull(discordGuildRef.current?.value),
            warningsChannel: emptyToNull(warningsChannelRef.current?.value),
            activityDescription: emptyToNull(activityDescriptionRef.current?.value),
            activityDescriptionStarting: emptyToNull(activityDescriptionStartingRef.current?.value),
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (localConfigs.discordBot?.enabled) {
            if (!localConfigs.discordBot?.token) {
                return txToast.error(t('web.settings.discord.val_token_required'));
            }
            if (!localConfigs.discordBot?.guild) {
                return txToast.error(t('web.settings.discord.val_guild_required'));
            }
            if (!localConfigs.discordBot?.embedJson || !localConfigs.discordBot?.embedConfigJson) {
                return txToast.error(t('web.settings.discord.val_jsons_required'));
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
            <SettingItem label={t('web.settings.discord.bot_label')}>
                <SwitchText
                    id={cfg.botEnabled.eid}
                    checkedLabel={t('web.settings.enabled')}
                    uncheckedLabel={t('web.settings.disabled')}
                    variant="checkedGreen"
                    checked={states.botEnabled}
                    onCheckedChange={cfg.botEnabled.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.discord.bot_desc')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.token_label')} htmlFor={cfg.botToken.eid} required={states.botEnabled}>
                <Input
                    id={cfg.botToken.eid}
                    ref={botTokenRef}
                    defaultValue={cfg.botToken.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder={t('web.settings.discord.token_placeholder')}
                    maxLength={96}
                    autoComplete="off"
                    className="blur-input"
                    required
                />
                <SettingItemDesc>
                    {t('web.settings.discord.token_desc1')}
                    <TxAnchor href="https://discordjs.guide/preparations/setting-up-a-bot-application.html">{t('web.settings.discord.token_desc2')}</TxAnchor> and <TxAnchor href="https://discordjs.guide/preparations/adding-your-bot-to-servers.html">{t('web.settings.discord.token_desc3')}</TxAnchor> <br />
                    <strong>{t('web.settings.whitelist.discord_roles_desc3')}</strong> {t('web.settings.discord.token_desc4')} <br />
                    <strong>{t('web.settings.whitelist.discord_roles_desc3')}</strong> {t('web.settings.discord.token_desc5')} <strong>{t('web.settings.discord.token_desc6')}</strong> {t('web.settings.discord.token_desc7')}
                    <TxAnchor href="https://discord.com/developers/applications">{t('web.settings.discord.token_desc8')}</TxAnchor>.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.guild_label')} htmlFor={cfg.discordGuild.eid} required={states.botEnabled}>
                <Input
                    id={cfg.discordGuild.eid}
                    ref={discordGuildRef}
                    defaultValue={cfg.discordGuild.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder={t('web.settings.discord.guild_placeholder')}
                />
                <SettingItemDesc>
                    {t('web.settings.discord.guild_desc1')} <br />
                    {t('web.settings.discord.guild_desc2')}
                    <TxAnchor href="https://support.discordapp.com/hc/article_attachments/115002742731/mceclip0.png">{t('web.settings.discord.guild_desc3')}</TxAnchor>{t('web.settings.discord.guild_desc4')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.warnings_channel_label')} htmlFor={cfg.warningsChannel.eid} showOptional>
                <Input
                    id={cfg.warningsChannel.eid}
                    ref={warningsChannelRef}
                    defaultValue={cfg.warningsChannel.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder={t('web.settings.discord.warnings_channel_placeholder')}
                />
                <SettingItemDesc>
                    {t('web.settings.discord.warnings_channel_desc1')} <br />
                    {t('web.settings.discord.warnings_channel_desc2')} <br />
                    {t('web.settings.discord.warnings_channel_desc3')}
                    <TxAnchor href="https://support.discordapp.com/hc/article_attachments/115002742731/mceclip0.png">{t('web.settings.discord.warnings_channel_desc4')}</TxAnchor>{t('web.settings.discord.warnings_channel_desc5')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.allow_dangerous_perms_label')}>
                <SwitchText
                    id={cfg.allowDangerousPermissions.eid}
                    checkedLabel={t('web.settings.discord.allow_dangerous_perms_allowed')}
                    uncheckedLabel={t('web.settings.discord.allow_dangerous_perms_forbidden')}
                    variant="checkedOrange"
                    checked={states.allowDangerousPermissions}
                    onCheckedChange={cfg.allowDangerousPermissions.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.discord.allow_dangerous_perms_desc1')} <br />
                    <strong>{t('web.settings.fxserver.timezone_warn1')}</strong> {t('web.settings.discord.allow_dangerous_perms_desc2')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.activity_type_label')} htmlFor={cfg.activityType.eid}>
                <Select
                    value={states.activityType || 'watching'}
                    onValueChange={(val) => {
                        cfg.activityType.state.set(val);
                    }}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.activityType.eid}>
                        <SelectValue placeholder={t('web.settings.discord.activity_type_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="playing">{t('web.settings.discord.activity_type_playing')}</SelectItem>
                        <SelectItem value="streaming">{t('web.settings.discord.activity_type_streaming')}</SelectItem>
                        <SelectItem value="listening">{t('web.settings.discord.activity_type_listening')}</SelectItem>
                        <SelectItem value="watching">{t('web.settings.discord.activity_type_watching')}</SelectItem>
                        <SelectItem value="competing">{t('web.settings.discord.activity_type_competing')}</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    {t('web.settings.discord.activity_type_desc')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.activity_desc_label')} htmlFor={cfg.activityDescription.eid}>
                <Input
                    id={cfg.activityDescription.eid}
                    ref={activityDescriptionRef}
                    defaultValue={cfg.activityDescription.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder={t('web.settings.discord.activity_desc_placeholder')}
                />
                <SettingItemDesc>
                    {t('web.settings.discord.activity_desc_desc1')} <br />
                    - <InlineCode>{`{{players}}`}</InlineCode> / <InlineCode>[players]</InlineCode>: {t('web.settings.discord.activity_desc_desc2')} <br />
                    - <InlineCode>{`{{maxClients}}`}</InlineCode> / <InlineCode>[maxClients]</InlineCode>: {t('web.settings.discord.activity_desc_desc3')} <br />
                    - <InlineCode>{`{{serverName}}`}</InlineCode> / <InlineCode>[serverName]</InlineCode>: {t('web.settings.discord.activity_desc_desc4')} <br />
                    {t('web.settings.discord.activity_desc_desc5')} <InlineCode>{`[{{players}}/{{maxClients}}] on {{serverName}}`}</InlineCode>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.activity_desc_starting_label')} htmlFor={cfg.activityDescriptionStarting.eid}>
                <Input
                    id={cfg.activityDescriptionStarting.eid}
                    ref={activityDescriptionStartingRef}
                    defaultValue={cfg.activityDescriptionStarting.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder={t('web.settings.discord.activity_desc_starting_placeholder')}
                />
                <SettingItemDesc>
                    {t('web.settings.discord.activity_desc_starting_desc1')} <br />
                    {t('web.settings.discord.activity_desc_starting_desc2')} <InlineCode>Server starting...</InlineCode>
                </SettingItemDesc>
            </SettingItem>
            {/* <SettingItem label="Status Embed">
                <div className="flex flex-wrap gap-6">
                    <Button
                        size={'sm'}
                        variant="secondary"
                        disabled={pageCtx.isReadOnly}
                        // FIXME: implement
                    >
                        <PencilIcon className='size-4 mr-1.5 inline-block' /> Change Embed JSON
                    </Button>
                    <Button
                        size={'sm'}
                        variant="secondary"
                        disabled={pageCtx.isReadOnly}
                        // FIXME: implement
                    >
                        <PencilIcon className='size-4 mr-1.5 inline-block' /> Change Config JSON
                    </Button>
                </div>
                <SettingItemDesc>
                    The server status embed is customizable by editing the two JSONs above. <br />
                    <strong>Note:</strong> Use the command <InlineCode>/status add</InlineCode> on a channel that the bot has the "Send Message" permission to setup the embed.
                </SettingItemDesc>
            </SettingItem> */}
            <SettingItem label={t('web.settings.discord.status_embed_json_label')} htmlFor={cfg.embedJson.eid} required={states.botEnabled}>
                <div className="flex flex-col gap-2">
                    <Textarea
                        id={cfg.embedJson.eid}
                        placeholder='{}'
                        value={attemptBeautifyJsonString(states.embedJson ?? '')}
                        onChange={(e) => cfg.embedJson.state.set(e.target.value)}
                        autoComplete="off"
                        style={{ minHeight: 512 }}
                        disabled={pageCtx.isReadOnly}
                        spellCheck={false}
                    />
                    <div className="w-full flex flex-wrap justify-between gap-6">
                        <Button
                            className="grow"
                            variant="outline"
                            onClick={() => cfg.embedJson.state.discard()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <XIcon className="mr-2 h-4 w-4" /> {t('web.settings.discord.discard_changes')}
                        </Button>
                        <Button
                            className="grow border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            variant="outline"
                            onClick={() => cfg.embedJson.state.default()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <RotateCcwIcon className="mr-2 h-4 w-4" /> {t('web.settings.discord.reset_default')}
                        </Button>
                    </div>
                </div>
                <SettingItemDesc>
                    {t('web.settings.discord.embed_desc1')} <br />
                    <strong>{t('web.settings.whitelist.note')}</strong> {t('web.settings.discord.embed_desc3')} <InlineCode>/status add</InlineCode> {t('web.settings.discord.embed_desc4')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.discord.status_config_json_label')} htmlFor={cfg.embedConfigJson.eid} required={states.botEnabled}>
                <div className="flex flex-col gap-2">
                    <Textarea
                        id={cfg.embedConfigJson.eid}
                        placeholder='{}'
                        value={attemptBeautifyJsonString(states.embedConfigJson ?? '')}
                        onChange={(e) => cfg.embedConfigJson.state.set(e.target.value)}
                        autoComplete="off"
                        style={{ minHeight: 512 }}
                        disabled={pageCtx.isReadOnly}
                        spellCheck={false}
                    />
                    <div className="w-full flex flex-wrap justify-between gap-6">
                        <Button
                            className="grow"
                            variant="outline"
                            onClick={() => cfg.embedConfigJson.state.discard()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <XIcon className="mr-2 h-4 w-4" /> {t('web.settings.discord.discard_changes')}
                        </Button>
                        <Button
                            className="grow border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            variant="outline"
                            onClick={() => cfg.embedConfigJson.state.default()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <RotateCcwIcon className="mr-2 h-4 w-4" /> {t('web.settings.discord.reset_default')}
                        </Button>
                    </div>
                </div>
                <SettingItemDesc>
                    {t('web.settings.discord.embed_desc1')} <br />
                    <strong>{t('web.settings.whitelist.note')}</strong> {t('web.settings.discord.embed_desc3')} <InlineCode>/status add</InlineCode> {t('web.settings.discord.embed_desc4')}
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
