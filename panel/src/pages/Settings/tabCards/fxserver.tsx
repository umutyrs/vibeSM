import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SwitchText from '@/components/SwitchText'
import InlineCode from '@/components/InlineCode'
import { AdvancedDivider, SettingItem, SettingItemDesc } from '../settingsItems'
import { useState, useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff, type PageConfigReducerAction } from "../utils"
import { PlusIcon, TrashIcon, Undo2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimeInputDialog } from "@/components/TimeInputDialog"
import TxAnchor from "@/components/TxAnchor"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import SettingsCardShell from "../SettingsCardShell"
import { cn } from "@/lib/utils"
import { txToast } from "@/components/TxToaster"
import { useBackendApi } from "@/hooks/fetch"
import { useAdminPerms } from "@/hooks/auth"
import { useLocation } from "wouter"
import type { ResetServerDataPathResp } from "@shared/otherTypes"
import { useOpenConfirmDialog } from "@/hooks/dialogs"
import { useAtom } from "jotai"
import { multiHostingEnabledAtom } from "@/hooks/status"
import { useTranslation } from "@/hooks/translator"



// Remove duplicates and sort times
function sanitizeTimes(times: string[]): string[] {
    const uniqueTimes = Array.from(new Set(times));
    return uniqueTimes.sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number);
        const [bHours, bMinutes] = b.split(':').map(Number);
        return aHours - bHours || aMinutes - bMinutes;
    });
}


type RestartScheduleBoxProps = {
    restartTimes: string[] | undefined;
    setRestartTimes: (val: PageConfigReducerAction<string[]|undefined>['configValue']) => void;
    disabled?: boolean;
};

function RestartScheduleBox({ restartTimes, setRestartTimes, disabled }: RestartScheduleBoxProps) {
    const { t } = useTranslation();
    const [isTimeInputOpen, setIsTimeInputOpen] = useState(false);
    const [animationParent] = useAutoAnimate();

    const addTime = (time: string) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(prev => sanitizeTimes([...prev ?? [], time]));
    };
    const removeTime = (index: number) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(prev => sanitizeTimes((prev ?? []).filter((_, i) => i !== index)));
    };
    const applyPreset = (presetTimes: string[]) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(presetTimes);
    };
    const clearTimes = () => {
        if (disabled) return;
        setRestartTimes([]);
    };

    const presetSpanClasses = cn(
        'text-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
    )

    return (
        <div className="py-3 px-2 min-h-[4.5rem] flex items-center border rounded-lg">
            <div className={cn("w-full flex items-center gap-2", disabled && 'cursor-not-allowed')}>
                <div className="flex flex-wrap gap-2 grow" ref={animationParent} >
                    {restartTimes && restartTimes.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                            <span>
                                {t('web.settings.fxserver.no_schedule')}
                            </span>
                            <p>
                                {t('web.settings.fxserver.presets')}
                                <a
                                    onClick={() => applyPreset(['00:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    1x<span className={presetSpanClasses}>{t('web.settings.fxserver.per_day')}</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '12:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    2x<span className={presetSpanClasses}>{t('web.settings.fxserver.per_day')}</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '08:00', '16:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    3x<span className={presetSpanClasses}>{t('web.settings.fxserver.per_day')}</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '06:00', '12:00', '18:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    4x<span className={presetSpanClasses}>{t('web.settings.fxserver.per_day')}</span>
                                </a>
                            </p>
                        </div>
                    )}
                    {restartTimes && restartTimes.map((time, index) => (
                        <div key={time} className="flex items-center space-x-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-md select-none">
                            <span className="font-mono">{time}</span>
                            {!disabled && <button
                                onClick={() => removeTime(index)}
                                className="ml-2 text-secondary-foreground/50 hover:text-destructive"
                                aria-label="Remove"
                                disabled={disabled}
                            >
                                <XIcon className="size-4" />
                            </button>}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsTimeInputOpen(true)}
                        variant="secondary"
                        size={'xs'}
                        className="w-10 hover:bg-primary hover:text-primary-foreground"
                        aria-label="Add"
                        disabled={disabled}
                    >
                        <PlusIcon className="h-4" />
                    </Button>
                    <Button
                        onClick={() => clearTimes()}
                        variant="muted"
                        size={'xs'}
                        className="w-10 hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Clear"
                        disabled={disabled || !restartTimes || restartTimes.length === 0}
                    >
                        <TrashIcon className="h-3.5" />
                    </Button>
                </div>
            </div>
            <TimeInputDialog
                title={t('web.settings.fxserver.add_time_title')}
                isOpen={isTimeInputOpen}
                onClose={() => setIsTimeInputOpen(false)}
                onSubmit={addTime}
            />
        </div>
    )
}


const getServerDataPlaceholder = (hostSuggested?: string) => {
    if (hostSuggested) {
        const withoutTailSlash = hostSuggested.replace(/\/$/, '');
        return `${withoutTailSlash}/CFXDefault`;
    } else if (window.txConsts.isWindows) {
        return 'C:/Users/Admin/Desktop/CFXDefault';
    } else {
        return '/root/fivem/txData/CFXDefault';
    }
}

// Check if the browser timezone is different from the server timezone
function TimeZoneWarning() {
    const { t } = useTranslation();
    try {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (window.txConsts.serverTimezone !== browserTimezone) {
            return (
                <SettingItemDesc className="text-destructive-inline">
                    <strong>{t('web.settings.fxserver.timezone_warn1')}</strong>{t('web.settings.fxserver.timezone_warn2')}<InlineCode>{window.txConsts.serverTimezone}</InlineCode>{t('web.settings.fxserver.timezone_warn3')}<InlineCode>{browserTimezone}</InlineCode>{t('web.settings.fxserver.timezone_warn4')}
                </SettingItemDesc>
            );
        }
    } catch (error) {
        console.error(error);
    }
    return null;
}


export const pageConfigs = {
    dataPath: getPageConfig('server', 'dataPath'),
    restarterSchedule: getPageConfig('restarter', 'schedule'),
    quietMode: getPageConfig('server', 'quiet'),

    cfgPath: getPageConfig('server', 'cfgPath', true),
    startupArgs: getPageConfig('server', 'startupArgs', true),
    onesync: getPageConfig('server', 'onesync', true),
    autoStart: getPageConfig('server', 'autoStart', true),
    resourceTolerance: getPageConfig('restarter', 'resourceStartingTolerance', true),
} as const;

export default function ConfigCardFxserver({ cardCtx, pageCtx }: SettingsCardProps) {
    const { t } = useTranslation();
    const [isMultiHostingEnabled, setIsMultiHostingEnabled] = useAtom(multiHostingEnabledAtom);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isResettingServerData, setIsResettingServerData] = useState(false);
    const { hasPerm } = useAdminPerms();
    const setLocation = useLocation()[1];
    const openConfirmDialog = useOpenConfirmDialog();
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

    //Refs for configs that don't use state
    const dataPathRef = useRef<HTMLInputElement | null>(null);
    const cfgPathRef = useRef<HTMLInputElement | null>(null);
    const startupArgsRef = useRef<HTMLInputElement | null>(null);
    const forceQuietMode = pageCtx.apiData?.forceQuietMode;

    //Marshalling Utils
    const selectNumberUtil = {
        toUi: (num?: number) => num ? num.toString() : undefined,
        toCfg: (str?: string) => str ? parseInt(str) : undefined,
    }
    const inputArrayUtil = {
        toUi: (args?: string[]) => args ? args.join(' ') : '',
        toCfg: (str?: string) => str ? str.trim().split(/\s+/) : [],
    }
    const emptyToNull = (str?: string) => {
        if (str === undefined) return undefined;
        const trimmed = str.trim();
        return trimmed.length ? trimmed : null;
    };

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        let currStartupArgs;
        if (startupArgsRef.current) {
            currStartupArgs = inputArrayUtil.toCfg(startupArgsRef.current.value);
        }
        let currDataPath;
        if (dataPathRef.current?.value) {
            currDataPath = dataPathRef.current.value.replace(/\\/g, '/').replace(/\/\/+/, '/');
            if (currDataPath.endsWith('/')) {
                currDataPath = currDataPath.slice(0, -1);
            }
        }
        const overwrites = {
            dataPath: emptyToNull(dataPathRef.current?.value),
            cfgPath: cfgPathRef.current?.value,
            startupArgs: currStartupArgs,
        };

        const res = getConfigDiff(cfg, states, overwrites, showAdvanced);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (!localConfigs.server?.dataPath) {
            return txToast.error({
                title: t('web.settings.fxserver.data_folder_required'),
                md: true,
                msg: t('web.settings.fxserver.data_folder_setup'),
            });
        }
        if (localConfigs.server.cfgPath !== undefined && !localConfigs.server.cfgPath) {
            return txToast.error({
                title: t('web.settings.fxserver.cfg_path_required'),
                md: true,
                msg: t('web.settings.fxserver.cfg_path_suggested'),
            });
        }
        if (
            Array.isArray(localConfigs.server?.startupArgs)
            && localConfigs.server.startupArgs.some((arg) => arg.toLowerCase() === 'onesync')
        ) {
            return txToast.error({
                title: t('web.settings.fxserver.onesync_err_title'),
                md: true,
                msg: t('web.settings.fxserver.onesync_err_msg'),
            });
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    //Card content stuff
    const serverDataPlaceholder = useMemo(
        () => getServerDataPlaceholder(pageCtx.apiData?.dataPath),
        [pageCtx.apiData]
    );

    //Reset server server data button
    const resetServerDataApi = useBackendApi<ResetServerDataPathResp>({
        method: 'POST',
        path: `/settings/resetServerDataPath`,
        throwGenericErrors: true,
    });
    const handleResetServerData = () => {
        openConfirmDialog({
            title: t('web.settings.fxserver.reset_data_title'),
            message: (<>
                {t('web.settings.fxserver.reset_data_msg1')} <br />
                <br />
                <strong>{t('web.settings.fxserver.reset_data_msg2')}</strong>{t('web.settings.fxserver.reset_data_msg3')} <br />
                {t('web.settings.fxserver.reset_data_msg4')} <br />
                <br />
                <strong className="text-warning-inline">{t('web.settings.fxserver.reset_data_msg5')}</strong>{t('web.settings.fxserver.reset_data_msg6')}
                <Input value={cfg.dataPath.initialValue} className="mt-2" readOnly />
            </>),
            onConfirm: () => {
                setIsResettingServerData(true);
                resetServerDataApi({
                    toastLoadingMessage: t('web.settings.fxserver.resetting_data'),
                    success: (data, toastId) => {
                        if (data.type === 'success') {
                            setLocation('/server/setup');
                        }
                    },
                    finally: () => setIsResettingServerData(false),
                });
            },
        });

    }

    // cfg.restarterSchedule.state.set(['00:00', '12:00'])
    // cfg.restarterSchedule.state.set([])
    // cfg.restarterSchedule.state.set(undefined)

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
            advancedVisible={showAdvanced}
            advancedSetter={setShowAdvanced}
        >
            <SettingItem label={t('web.settings.fxserver.data_folder_label')} htmlFor={cfg.dataPath.eid} required>
                <div className="flex gap-2">
                    <Input
                        id={cfg.dataPath.eid}
                        ref={dataPathRef}
                        defaultValue={cfg.dataPath.initialValue}
                        placeholder={serverDataPlaceholder}
                        onInput={updatePageState}
                        disabled={pageCtx.isReadOnly}
                        required
                    />
                    <Button
                        className="grow border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        variant="outline"
                        disabled={pageCtx.isReadOnly || !hasPerm('all_permissions') || isResettingServerData}
                        onClick={handleResetServerData}
                    >
                        <Undo2Icon className="mr-2 h-4 w-4" /> {t('web.settings.discord.reset_default')}
                    </Button>
                </div>
                <SettingItemDesc>
                    {t('web.settings.fxserver.data_folder_desc1')}<strong>{t('web.settings.fxserver.data_folder_desc2')}</strong>{t('web.settings.fxserver.data_folder_desc3')}<InlineCode>resources</InlineCode>{t('web.settings.fxserver.data_folder_desc4')}<InlineCode>server.cfg</InlineCode>. <br />
                    {t('web.settings.fxserver.data_folder_desc5')}
                    {pageCtx.apiData?.dataPath && pageCtx.apiData?.hasCustomDataPath && (<>
                        <br />
                        <span className="text-warning-inline">
                            {window.txConsts.hostConfigSource}: {t('web.settings.fxserver.data_folder_desc6')} <InlineCode>{pageCtx.apiData.dataPath}</InlineCode> .
                        </span>
                    </>)}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.fxserver.restart_schedule_label')} showOptional>
                <RestartScheduleBox
                    restartTimes={states.restarterSchedule}
                    setRestartTimes={cfg.restarterSchedule.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <TimeZoneWarning />
                <SettingItemDesc>
                    {t('web.settings.fxserver.restart_schedule_desc1')} <br />
                    <strong>{t('web.settings.fxserver.restart_schedule_desc2')}</strong>{t('web.settings.fxserver.restart_schedule_desc3')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.fxserver.quiet_mode_label')}>
                <SwitchText
                    id={cfg.quietMode.eid}
                    checkedLabel={t('web.settings.enabled')}
                    uncheckedLabel={t('web.settings.disabled')}
                    checked={forceQuietMode || states.quietMode}
                    onCheckedChange={cfg.quietMode.state.set}
                    disabled={pageCtx.isReadOnly || forceQuietMode}
                />
                <SettingItemDesc>
                    {t('web.settings.fxserver.quiet_mode_desc1')} <br />
                    {t('web.settings.fxserver.quiet_mode_desc2')}
                    {forceQuietMode && (<>
                        <br />
                        <span className="text-warning-inline">{window.txConsts.hostConfigSource}: {t('web.settings.fxserver.quiet_mode_locked')}</span>
                    </>)}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.fxserver.multi_hosting_label')}>
                <SwitchText
                    id="settings-multi-hosting"
                    checkedLabel={t('web.settings.enabled')}
                    uncheckedLabel={t('web.settings.disabled')}
                    checked={isMultiHostingEnabled}
                    onCheckedChange={setIsMultiHostingEnabled}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.fxserver.multi_hosting_desc')}
                </SettingItemDesc>
            </SettingItem>

            {showAdvanced && <AdvancedDivider />}

            <SettingItem label={t('web.settings.fxserver.cfg_path_label')} htmlFor={cfg.cfgPath.eid} showIf={showAdvanced} required>
                <Input
                    id={cfg.cfgPath.eid}
                    ref={cfgPathRef}
                    defaultValue={cfg.cfgPath.initialValue}
                    placeholder="server.cfg"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    required
                />
                <SettingItemDesc>
                    {t('web.settings.fxserver.cfg_path_desc1')}<InlineCode>server.cfg</InlineCode>. <br />
                    {t('web.settings.fxserver.cfg_path_desc2')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.fxserver.startup_args_label')} htmlFor={cfg.startupArgs.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.startupArgs.eid}
                    ref={startupArgsRef}
                    defaultValue={inputArrayUtil.toUi(cfg.startupArgs.initialValue)}
                    placeholder="--trace-warning"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.fxserver.startup_args_desc1')} <br />
                    <strong>{t('web.settings.fxserver.timezone_warn1')}</strong>{t('web.settings.fxserver.startup_args_desc2')}<InlineCode>server.cfg</InlineCode>{t('web.settings.fxserver.startup_args_desc3')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.fxserver.onesync_label')} htmlFor={cfg.onesync.eid} showIf={showAdvanced}>
                <Select
                    value={states.onesync}
                    onValueChange={cfg.onesync.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.onesync.eid}>
                        <SelectValue placeholder={t('web.settings.fxserver.onesync_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="on">{t('web.settings.fxserver.onesync_on')}</SelectItem>
                        <SelectItem value="legacy">{t('web.settings.fxserver.onesync_legacy')}</SelectItem>
                        <SelectItem value="off">{t('web.settings.fxserver.onesync_off')}</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    {t('web.settings.fxserver.onesync_desc1')}<strong>{t('web.settings.fxserver.onesync_desc2')}</strong>. <br />
                    {t('web.settings.fxserver.onesync_desc3')}<TxAnchor href="https://docs.fivem.net/docs/scripting-reference/onesync/" >{t('web.settings.fxserver.onesync_desc4')}</TxAnchor>.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.fxserver.autostart_label')} showIf={showAdvanced}>
                <SwitchText
                    id={cfg.autoStart.eid}
                    checkedLabel={t('web.settings.enabled')}
                    uncheckedLabel={t('web.settings.disabled')}
                    checked={states.autoStart}
                    onCheckedChange={cfg.autoStart.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    {t('web.settings.fxserver.autostart_desc1')}<strong>vibeSM</strong>{t('web.settings.fxserver.autostart_desc2')}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label={t('web.settings.fxserver.tolerance_label')} htmlFor={cfg.resourceTolerance.eid} showIf={showAdvanced}>
                <Select
                    value={selectNumberUtil.toUi(states.resourceTolerance)}
                    onValueChange={(val) => cfg.resourceTolerance.state.set(selectNumberUtil.toCfg(val))}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.resourceTolerance.eid}>
                        <SelectValue placeholder={t('web.settings.fxserver.tolerance_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="90">{t('web.settings.fxserver.tolerance_opt1')}</SelectItem>
                        <SelectItem value="180">{t('web.settings.fxserver.tolerance_opt2')}</SelectItem>
                        <SelectItem value="300">{t('web.settings.fxserver.tolerance_opt3')}</SelectItem>
                        <SelectItem value="600">{t('web.settings.fxserver.tolerance_opt4')}</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    {t('web.settings.fxserver.tolerance_desc1')} <br />
                    <strong>{t('web.settings.fxserver.restart_schedule_desc2')}</strong>{t('web.settings.fxserver.tolerance_desc3')}<InlineCode>failed to start in time</InlineCode>{t('web.settings.fxserver.tolerance_desc4')}
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
