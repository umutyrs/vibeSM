import { Input } from "@/components/ui/input"
import SwitchText from '@/components/SwitchText'
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import SettingsCardShell from "../SettingsCardShell"
import { txToast } from "@/components/TxToaster"
import consts from "@shared/consts"
import { AutosizeTextarea, AutosizeTextAreaRef } from "@/components/ui/autosize-textarea"
import { useTranslation } from "@/hooks/translator"


export const pageConfigs = {
    enabled: getPageConfig('queue', 'enabled'),
    priorityRoles: getPageConfig('queue', 'priorityRoles'),
    teamRoles: getPageConfig('queue', 'teamRoles'),
    customMaxSlots: getPageConfig('queue', 'customMaxSlots'),
    priorityLabel: getPageConfig('queue', 'priorityLabel'),
    standardLabel: getPageConfig('queue', 'standardLabel'),
    queueMessageTemplate: getPageConfig('queue', 'queueMessageTemplate'),
    adaptiveCardJson: getPageConfig('queue', 'adaptiveCardJson'),
} as const;

export default function ConfigCardQueue({ cardCtx, pageCtx }: SettingsCardProps) {
    const { t } = useTranslation();
    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes
    useEffect(() => {
        updatePageState();
    }, [states]);

    //Refs for inputs
    const priorityRolesRef = useRef<HTMLInputElement | null>(null);
    const teamRolesRef = useRef<HTMLInputElement | null>(null);
    const customMaxSlotsRef = useRef<HTMLInputElement | null>(null);
    const priorityLabelRef = useRef<HTMLInputElement | null>(null);
    const standardLabelRef = useRef<HTMLInputElement | null>(null);
    const queueMessageTemplateRef = useRef<AutosizeTextAreaRef | null>(null);
    const adaptiveCardJsonRef = useRef<AutosizeTextAreaRef | null>(null);

    //Marshalling Utils
    const inputArrayUtil = {
        toUi: (args?: string[]) => args ? args.join(', ') : '',
        toCfg: (str?: string) => str ? str.split(/[,;]\s*/).map(x => x.trim()).filter(x => x.length) : [],
    }
    const inputNumberUtil = {
        toUi: (num?: number) => num !== undefined && num !== null ? num.toString() : '0',
        toCfg: (str?: string) => {
            const parsed = parseInt(str || '0');
            return isNaN(parsed) ? 0 : Math.max(0, parsed);
        }
    }

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        let currPriorityRoles, currTeamRoles, currCustomMaxSlots, currPriorityLabel, currStandardLabel, currQueueMessageTemplate, currAdaptiveCardJson;
        if (priorityRolesRef.current) {
            currPriorityRoles = inputArrayUtil.toCfg(priorityRolesRef.current.value);
        }
        if (teamRolesRef.current) {
            currTeamRoles = inputArrayUtil.toCfg(teamRolesRef.current.value);
        }
        if (customMaxSlotsRef.current) {
            currCustomMaxSlots = inputNumberUtil.toCfg(customMaxSlotsRef.current.value);
        }
        if (priorityLabelRef.current) {
            currPriorityLabel = priorityLabelRef.current.value;
        }
        if (standardLabelRef.current) {
            currStandardLabel = standardLabelRef.current.value;
        }
        if (queueMessageTemplateRef.current) {
            currQueueMessageTemplate = queueMessageTemplateRef.current.textArea.value;
        }
        if (adaptiveCardJsonRef.current) {
            currAdaptiveCardJson = adaptiveCardJsonRef.current.textArea.value;
        }

        const overwrites = {
            priorityRoles: currPriorityRoles,
            teamRoles: currTeamRoles,
            customMaxSlots: currCustomMaxSlots,
            priorityLabel: currPriorityLabel,
            standardLabel: currStandardLabel,
            queueMessageTemplate: currQueueMessageTemplate,
            adaptiveCardJson: currAdaptiveCardJson,
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        // Validation for role snowflakes
        if (Array.isArray(localConfigs.queue?.priorityRoles)) {
            const invalidRoles = localConfigs.queue.priorityRoles
                .filter(x => !consts.regexDiscordSnowflake.test(x))
                .map(x => `- \`${x.slice(0, 20)}\``);
            if (invalidRoles.length) {
                return txToast.error({
                    title: t('web.settings.queue.val_priority_roles_title'),
                    md: true,
                    msg: t('web.settings.queue.val_roles_msg', { roles: invalidRoles.join('\n') }),
                });
            }
        }
        if (Array.isArray(localConfigs.queue?.teamRoles)) {
            const invalidRoles = localConfigs.queue.teamRoles
                .filter(x => !consts.regexDiscordSnowflake.test(x))
                .map(x => `- \`${x.slice(0, 20)}\``);
            if (invalidRoles.length) {
                return txToast.error({
                    title: t('web.settings.queue.val_team_roles_title'),
                    md: true,
                    msg: t('web.settings.queue.val_roles_msg', { roles: invalidRoles.join('\n') }),
                });
            }
        }

        // Validate JSON
        if (localConfigs.queue?.adaptiveCardJson) {
            try {
                JSON.parse(localConfigs.queue.adaptiveCardJson);
            } catch (e) {
                return txToast.error({
                    title: t('web.settings.queue.val_json_title'),
                    msg: t('web.settings.queue.val_json_msg', { error: (e as Error).message }),
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
            <SettingItem label={t('web.settings.queue.enabled')}>
                <SwitchText
                    id={cfg.enabled.eid}
                    checkedLabel={t('web.settings.enabled')}
                    uncheckedLabel={t('web.settings.disabled')}
                    checked={states.enabled}
                    onCheckedChange={cfg.enabled.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.queue.enabled_desc')}
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label={t('web.settings.queue.priority_roles')} htmlFor={cfg.priorityRoles.eid}>
                <Input
                    id={cfg.priorityRoles.eid}
                    ref={priorityRolesRef}
                    defaultValue={inputArrayUtil.toUi(cfg.priorityRoles.initialValue)}
                    placeholder="000000000000000000, 000000000000000000"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.queue.priority_roles_desc')}
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label={t('web.settings.queue.team_roles')} htmlFor={cfg.teamRoles.eid}>
                <Input
                    id={cfg.teamRoles.eid}
                    ref={teamRolesRef}
                    defaultValue={inputArrayUtil.toUi(cfg.teamRoles.initialValue)}
                    placeholder="000000000000000000, 000000000000000000"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.queue.team_roles_desc')}
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label={t('web.settings.queue.max_slots')} htmlFor={cfg.customMaxSlots.eid}>
                <Input
                    id={cfg.customMaxSlots.eid}
                    ref={customMaxSlotsRef}
                    type="number"
                    defaultValue={inputNumberUtil.toUi(cfg.customMaxSlots.initialValue)}
                    placeholder="0"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.queue.max_slots_desc')}
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label={t('web.settings.queue.priority_label')} htmlFor={cfg.priorityLabel.eid}>
                <Input
                    id={cfg.priorityLabel.eid}
                    ref={priorityLabelRef}
                    defaultValue={cfg.priorityLabel.initialValue}
                    placeholder="Priority"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.queue.priority_label_desc')}
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label={t('web.settings.queue.standard_label')} htmlFor={cfg.standardLabel.eid}>
                <Input
                    id={cfg.standardLabel.eid}
                    ref={standardLabelRef}
                    defaultValue={cfg.standardLabel.initialValue}
                    placeholder="Standard"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.queue.standard_label_desc')}
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label={t('web.settings.queue.msg_template')} htmlFor={cfg.queueMessageTemplate.eid}>
                <AutosizeTextarea
                    id={cfg.queueMessageTemplate.eid}
                    ref={queueMessageTemplateRef}
                    defaultValue={cfg.queueMessageTemplate.initialValue}
                    onInput={updatePageState}
                    autoComplete="off"
                    minHeight={60}
                    maxHeight={200}
                    disabled={pageCtx.isReadOnly}
                    className="font-mono text-xs"
                />
                <SettingItemDesc>
                    {t('web.settings.queue.msg_template_desc')}
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label={t('web.settings.queue.card_template')} htmlFor={cfg.adaptiveCardJson.eid}>
                <AutosizeTextarea
                    id={cfg.adaptiveCardJson.eid}
                    ref={adaptiveCardJsonRef}
                    placeholder="{}"
                    defaultValue={cfg.adaptiveCardJson.initialValue}
                    onInput={updatePageState}
                    autoComplete="off"
                    minHeight={150}
                    maxHeight={400}
                    disabled={pageCtx.isReadOnly}
                    className="font-mono text-xs"
                />
                <SettingItemDesc>
                    {t('web.settings.queue.card_template_desc')}
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
