import * as React from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiTimeout, useBackendApi } from '@/hooks/fetch';
import { txToast } from '@/components/TxToaster';
import { useTranslation } from '@/hooks/translator';
import { ServerIcon, PlayIcon, SquareIcon, Trash2Icon, PlusIcon, Edit3Icon, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminPerms } from '@/hooks/auth';
import { SYM_RESET_CONFIG } from './Settings/utils';
import ConfigCardDiscord from './Settings/tabCards/discord';
import ConfigCardBans from './Settings/tabCards/bans';
import ConfigCardWhitelist from './Settings/tabCards/whitelist';
import type { GetConfigsResp, SaveConfigsReq, SaveConfigsResp } from '@shared/otherTypes';
import { useAtom } from 'jotai';
import { selectedServerIdAtom } from '@/hooks/status';
import { useLocation } from 'wouter';

interface ServerConfig {
    id: string;
    name: string;
    port: number;
    dataPath: string;
    cfgPath: string;
    isRunning?: boolean;
    status?: 'offline' | 'starting' | 'online';
    joinLink?: string | null;
}

export default function MultiHosting() {
    const { t } = useTranslation();
    const { hasPerm } = useAdminPerms();
    const [servers, setServers] = React.useState<ServerConfig[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [selectedServerId, setSelectedServerId] = useAtom(selectedServerIdAtom);
    const [, setLocation] = useLocation();

    // Form states
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [isCreatingNew, setIsCreatingNew] = React.useState(false);
    const [formName, setFormName] = React.useState('');
    const [formPort, setFormPort] = React.useState('30120');
    const [formDataPath, setFormDataPath] = React.useState('');
    const [formCfgPath, setFormCfgPath] = React.useState('');

    const [cardPendingSave, setCardPendingSave] = React.useState<any | null>(null);
    const [isSavingConfig, setIsSavingConfig] = React.useState(false);

    const listApi = useBackendApi({ method: 'GET', path: '/multi-hosting/servers' });
    const saveApi = useBackendApi({ method: 'POST', path: '/multi-hosting/servers' });
    const deleteApi = useBackendApi({ method: 'DELETE', path: '/multi-hosting/servers/:id' });
    const controlApi = useBackendApi({ method: 'POST', path: '/multi-hosting/servers/:id/control' });

    const configQueryApi = useBackendApi<GetConfigsResp>({
        method: 'GET',
        path: `/settings/configs`,
        throwGenericErrors: true,
    });
    const configSaveApi = useBackendApi<SaveConfigsResp, SaveConfigsReq>({
        method: 'POST',
        path: `/settings/configs/:card`,
        throwGenericErrors: true,
    });

    const configSwr = useSWR(editingId ? `/settings/configs?serverId=${editingId}` : null, async () => {
        const data = await configQueryApi({
            queryParams: { serverId: editingId! }
        });
        if (!data) throw new Error('No data returned');
        return data;
    }, {
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    const saveConfigChanges = async (source: any, changes: any) => {
        if (isSavingConfig || !editingId) return;
        const toastId = txToast.loading(t('web.multi_hosting.saving_settings', { card: source.cardTitle }), { id: 'settingsSave' });
        setIsSavingConfig(true);
        try {
            const resetKeys: string[] = [];
            for (const [scopeName, scopeData] of Object.entries(changes)) {
                for (const [configKey, configValue] of Object.entries(scopeData as any)) {
                    if (configValue === SYM_RESET_CONFIG) {
                        resetKeys.push(`${scopeName}.${configKey}`);
                    }
                }
            }
            const saveResp = await configSaveApi({
                pathParams: { card: source.cardId },
                queryParams: { serverId: editingId },
                data: { resetKeys, changes },
                timeout: source.cardId === 'discord'
                    ? ApiTimeout.REALLY_REALLY_LONG
                    : ApiTimeout.LONG,
                toastId,
            });
            if (!saveResp) throw new Error('empty_response');
            if (saveResp.type === 'error') return;
            if (!saveResp.stored) throw new Error('no_stored_data');
            configSwr.mutate({
                ...configSwr.data!,
                storedConfigs: saveResp.stored,
                changelog: saveResp.changelog || [],
            }, false);
            setCardPendingSave(null);
        } catch (error) {
            txToast.error({
                title: t('web.multi_hosting.err_saving_settings', { card: source.cardTitle }),
                msg: (error as any).message,
            }, { id: toastId });
        } finally {
            setIsSavingConfig(false);
        }
    };

    const fetchServers = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await listApi({});
            if (Array.isArray(data)) {
                setServers(data);
            }
        } catch (err) {
            txToast.error(t('web.multi_hosting.loading'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    React.useEffect(() => {
        fetchServers();
    }, []);

    const handleOpenAdd = () => {
        setEditingId(null);
        setIsCreatingNew(false);
        setFormName('');
        setFormPort('30120');
        setFormDataPath('');
        setFormCfgPath('');
        setCardPendingSave(null);
        setIsFormOpen(true);
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setIsCreatingNew(true);
        setFormName('');
        setFormPort('30120');
        setFormDataPath('');
        setFormCfgPath('');
        setCardPendingSave(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (server: ServerConfig) => {
        setEditingId(server.id);
        setIsCreatingNew(false);
        setFormName(server.name);
        setFormPort(server.port.toString());
        setFormDataPath(server.dataPath);
        setFormCfgPath(server.cfgPath);
        setCardPendingSave(null);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const toastId = txToast.loading(t('web.multi_hosting.saving_server_config'));
        try {
            const result = await saveApi({
                toastId,
                data: {
                    id: editingId || undefined,
                    name: formName,
                    port: Number(formPort),
                    dataPath: formDataPath,
                    cfgPath: isCreatingNew ? undefined : formCfgPath,
                    isCreatingNew,
                }
            });
            if (result && result.type === 'success') {
                setIsFormOpen(false);
                fetchServers();
                txToast.success(result.msg || t('web.multi_hosting.save_success'), { id: toastId });
                if (isCreatingNew && (result as any).id) {
                    setSelectedServerId((result as any).id);
                    window.location.href = `/server/setup?serverId=${(result as any).id}`;
                }
            } else if (result && result.type === 'error') {
                txToast.error(result.msg || t('web.multi_hosting.err_fields'), { id: toastId });
            } else {
                txToast.dismiss(toastId);
            }
        } catch (err) {
            txToast.error(t('web.multi_hosting.err_fields'), { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('web.multi_hosting.delete_confirm'))) return;
        try {
            const result = await deleteApi({ pathParams: { id } });
            if (result && result.type === 'success') {
                fetchServers();
                txToast.success(t('web.multi_hosting.delete_success'));
            }
        } catch (err) {
            txToast.error(t('web.multi_hosting.delete_success'));
        }
    };

    const handleControl = async (id: string, action: 'start' | 'stop') => {
        try {
            const result = await controlApi({
                pathParams: { id },
                data: { action }
            });
            if (result && result.type === 'success') {
                fetchServers();
                txToast.success(action === 'start' ? t('web.multi_hosting.start_success') : t('web.multi_hosting.stop_success'));
            }
        } catch (err) {
            txToast.error(action === 'start' ? t('web.multi_hosting.start_success') : t('web.multi_hosting.stop_success'));
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-6 px-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">{t('web.multi_hosting.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('web.multi_hosting.description')}</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleOpenAdd} variant="outline" className="gap-2 font-semibold">
                        <PlusIcon className="size-4" /> {t('web.multi_hosting.add_server')}
                    </Button>
                    <Button onClick={handleOpenCreate} className="gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
                        <PlusIcon className="size-4" /> {t('web.multi_hosting.create_server')}
                    </Button>
                </div>
            </div>

            {isFormOpen && (
                <div className="glass-card p-6 border border-border/40 rounded-xl bg-foreground/5 backdrop-blur-md animate-toastbar-enter">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">
                        {editingId ? t('web.multi_hosting.edit_server') : (isCreatingNew ? t('web.multi_hosting.create_and_deploy') : t('web.multi_hosting.new_server'))}
                    </h2>
                    {editingId ? (
                        <Tabs defaultValue="base" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="base">{t('web.multi_hosting.base_settings')}</TabsTrigger>
                                <TabsTrigger value="discord">{t('web.multi_hosting.discord_bot')}</TabsTrigger>
                                <TabsTrigger value="bans">{t('web.multi_hosting.bans')}</TabsTrigger>
                                <TabsTrigger value="whitelist">{t('web.multi_hosting.whitelist')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="base">
                                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('web.multi_hosting.server_name')}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                            placeholder="e.g. Test / Dev Server"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('web.multi_hosting.port')}</label>
                                        <input
                                            type="number"
                                            required
                                            value={formPort}
                                            onChange={(e) => setFormPort(e.target.value)}
                                            className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                            placeholder="e.g. 30120"
                                        />
                                        <p className="text-2xs text-warning-inline mt-1 leading-relaxed flex items-center gap-1.5 font-semibold">
                                            <AlertTriangle className="size-3.5 shrink-0" />
                                            {t('web.multi_hosting.port_info')}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('web.multi_hosting.data_path')}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formDataPath}
                                            onChange={(e) => setFormDataPath(e.target.value)}
                                            className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                            placeholder="C:/FXServer/txData/dev"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('web.multi_hosting.cfg_path')}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formCfgPath}
                                            onChange={(e) => setFormCfgPath(e.target.value)}
                                            className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                            placeholder="C:/FXServer/txData/dev/server.cfg"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 md:col-span-2 mt-2">
                                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-muted-foreground">
                                            {t('web.multi_hosting.cancel')}
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
                                            {isSubmitting ? t('web.multi_hosting.saving') : t('web.multi_hosting.save')}
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>
                            <TabsContent value="discord">
                                {configSwr.isLoading ? (
                                    <div className="text-center py-6 text-muted-foreground">{t('web.multi_hosting.loading_configs')}</div>
                                ) : configSwr.error ? (
                                    <div className="text-center py-6 text-destructive">{t('web.multi_hosting.err_loading_configs', { error: configSwr.error.message })}</div>
                                ) : (
                                    <ConfigCardDiscord
                                        cardCtx={{
                                            tabId: 'discord',
                                            tabName: 'Discord',
                                            cardId: 'discord',
                                            cardName: 'Discord',
                                            cardTitle: 'Discord Integration'
                                        }}
                                        pageCtx={{
                                            apiData: configSwr.data,
                                            isReadOnly: configSwr.isLoading || isSavingConfig || !configSwr.data || !hasPerm('settings.write'),
                                            isLoading: configSwr.isLoading,
                                            isSaving: isSavingConfig,
                                            swrError: configSwr.error ? configSwr.error.message : undefined,
                                            cardPendingSave,
                                            setCardPendingSave,
                                            saveChanges: saveConfigChanges
                                        }}
                                    />
                                )}
                            </TabsContent>
                            <TabsContent value="bans">
                                {configSwr.isLoading ? (
                                    <div className="text-center py-6 text-muted-foreground">{t('web.multi_hosting.loading_configs')}</div>
                                ) : configSwr.error ? (
                                    <div className="text-center py-6 text-destructive">{t('web.multi_hosting.err_loading_configs', { error: configSwr.error.message })}</div>
                                ) : (
                                    <ConfigCardBans
                                        cardCtx={{
                                            tabId: 'bans',
                                            tabName: 'Bans',
                                            cardId: 'bans',
                                            cardName: 'Bans',
                                            cardTitle: 'Bans'
                                        }}
                                        pageCtx={{
                                            apiData: configSwr.data,
                                            isReadOnly: configSwr.isLoading || isSavingConfig || !configSwr.data || !hasPerm('settings.write'),
                                            isLoading: configSwr.isLoading,
                                            isSaving: isSavingConfig,
                                            swrError: configSwr.error ? configSwr.error.message : undefined,
                                            cardPendingSave,
                                            setCardPendingSave,
                                            saveChanges: saveConfigChanges
                                        }}
                                    />
                                )}
                            </TabsContent>
                            <TabsContent value="whitelist">
                                {configSwr.isLoading ? (
                                    <div className="text-center py-6 text-muted-foreground">{t('web.multi_hosting.loading_configs')}</div>
                                ) : configSwr.error ? (
                                    <div className="text-center py-6 text-destructive">{t('web.multi_hosting.err_loading_configs', { error: configSwr.error.message })}</div>
                                ) : (
                                    <ConfigCardWhitelist
                                        cardCtx={{
                                            tabId: 'whitelist',
                                            tabName: 'Whitelist',
                                            cardId: 'whitelist',
                                            cardName: 'Whitelist',
                                            cardTitle: 'Whitelist'
                                        }}
                                        pageCtx={{
                                            apiData: configSwr.data,
                                            isReadOnly: configSwr.isLoading || isSavingConfig || !configSwr.data || !hasPerm('settings.write'),
                                            isLoading: configSwr.isLoading,
                                            isSaving: isSavingConfig,
                                            swrError: configSwr.error ? configSwr.error.message : undefined,
                                            cardPendingSave,
                                            setCardPendingSave,
                                            saveChanges: saveConfigChanges
                                        }}
                                    />
                                )}
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('web.multi_hosting.server_name')}</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                    placeholder="e.g. Test / Dev Server"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('web.multi_hosting.port')}</label>
                                <input
                                    type="number"
                                    required
                                    value={formPort}
                                    onChange={(e) => setFormPort(e.target.value)}
                                    className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                    placeholder="e.g. 30120"
                                />
                                <p className="text-2xs text-warning-inline mt-1 leading-relaxed flex items-center gap-1.5 font-semibold">
                                    <AlertTriangle className="size-3.5 shrink-0" />
                                    {t('web.multi_hosting.port_info')}
                                </p>
                            </div>
                             <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                    {isCreatingNew ? t('web.multi_hosting.base_dir_path') : t('web.multi_hosting.data_path')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formDataPath}
                                    onChange={(e) => setFormDataPath(e.target.value)}
                                    className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                    placeholder={isCreatingNew ? "C:/FXServer/txData/my-new-server" : "C:/FXServer/txData/dev"}
                                />
                            </div>
                            {!isCreatingNew && (
                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('web.multi_hosting.cfg_path')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formCfgPath}
                                        onChange={(e) => setFormCfgPath(e.target.value)}
                                        className="bg-background border border-border/40 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition"
                                        placeholder="C:/FXServer/txData/dev/server.cfg"
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-3 md:col-span-2 mt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-muted-foreground">
                                    {t('web.multi_hosting.cancel')}
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
                                    {isSubmitting ? t('web.multi_hosting.saving') : t('web.multi_hosting.save')}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">{t('web.multi_hosting.loading')}</div>
            ) : servers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl bg-foreground/5 backdrop-blur-md">
                    <ServerIcon className="size-10 mx-auto text-muted-foreground/60 mb-3" />
                    <h3 className="text-base font-semibold text-foreground">{t('web.multi_hosting.no_servers')}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        {t('web.multi_hosting.no_servers_desc')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {servers.map((server) => (
                        <Card key={server.id} className="p-5 border border-border/40 bg-foreground/5 backdrop-blur-md flex flex-col justify-between hover:bg-foreground/10 transition-all duration-300">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <ServerIcon className="size-5 text-primary" />
                                        <h3 className="font-semibold text-foreground text-base tracking-wide">{server.name}</h3>
                                    </div>
                                    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-sm uppercase ${
                                        server.status === 'online' ? 'bg-success/20 text-success-foreground' :
                                        server.status === 'starting' ? 'bg-warning/20 text-warning-foreground animate-pulse' :
                                        'bg-secondary text-secondary-foreground'
                                    }`}>
                                        {server.status === 'online' ? t('web.multi_hosting.online') :
                                         server.status === 'starting' ? t('web.multi_hosting.starting') :
                                         t('web.multi_hosting.offline')}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1.5 border-t border-border/20 pt-3">
                                    <div className="flex justify-between">
                                        <span>{t('web.multi_hosting.running_port')}:</span>
                                        <span className="font-semibold text-foreground font-mono">{server.port}</span>
                                    </div>
                                    {server.joinLink && (
                                        <div className="flex justify-between">
                                            <span>{t('web.multi_hosting.join_link')}</span>
                                            <a href={server.joinLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold font-mono truncate max-w-[200px]">
                                                {server.joinLink}
                                            </a>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-0.5">
                                        <span>{t('web.multi_hosting.data_path')}:</span>
                                        <span className="font-mono text-2xs truncate text-foreground/80">{server.dataPath}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-5 border-t border-border/20 pt-3">
                                <div className="flex gap-2">
                                    {server.isRunning ? (
                                        <Button
                                            size="sm"
                                            onClick={() => handleControl(server.id, 'stop')}
                                            className="bg-destructive/20 hover:bg-destructive/30 border border-destructive/30 text-destructive-foreground font-semibold"
                                        >
                                            <SquareIcon className="size-3.5 mr-1" /> {t('web.multi_hosting.stop')}
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleControl(server.id, 'start')}
                                            className="bg-success/20 hover:bg-success/30 border border-success/30 text-success-foreground font-semibold"
                                        >
                                            <PlayIcon className="size-3.5 mr-1" /> {t('web.multi_hosting.start')}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleOpenEdit(server)}
                                        className="text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                                    >
                                        <Edit3Icon className="size-3.5 mr-1" /> {t('web.multi_hosting.edit')}
                                    </Button>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(server.id)}
                                    className="text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2Icon className="size-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
