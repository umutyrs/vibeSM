import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBackendApi } from '@/hooks/fetch';
import { txToast } from '@/components/TxToaster';
import { useTranslation } from '@/hooks/translator';
import { ServerIcon, PlayIcon, SquareIcon, Trash2Icon, PlusIcon, Edit3Icon } from 'lucide-react';

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
    const [servers, setServers] = React.useState<ServerConfig[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Form states
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [formName, setFormName] = React.useState('');
    const [formPort, setFormPort] = React.useState('30120');
    const [formDataPath, setFormDataPath] = React.useState('');
    const [formCfgPath, setFormCfgPath] = React.useState('');

    const listApi = useBackendApi({ method: 'GET', path: '/multi-hosting/servers' });
    const saveApi = useBackendApi({ method: 'POST', path: '/multi-hosting/servers' });
    const deleteApi = useBackendApi({ method: 'DELETE', path: '/multi-hosting/servers/:id' });
    const controlApi = useBackendApi({ method: 'POST', path: '/multi-hosting/servers/:id/control' });

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

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormName('');
        setFormPort('30120');
        setFormDataPath('');
        setFormCfgPath('');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (server: ServerConfig) => {
        setEditingId(server.id);
        setFormName(server.name);
        setFormPort(server.port.toString());
        setFormDataPath(server.dataPath);
        setFormCfgPath(server.cfgPath);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const result = await saveApi({
                data: {
                    id: editingId || undefined,
                    name: formName,
                    port: Number(formPort),
                    dataPath: formDataPath,
                    cfgPath: formCfgPath,
                }
            });
            if (result && result.type === 'success') {
                setIsFormOpen(false);
                fetchServers();
                txToast.success(t('web.multi_hosting.save_success'));
            }
        } catch (err) {
            txToast.error(t('web.multi_hosting.err_fields'));
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
                <Button onClick={handleOpenCreate} className="gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
                    <PlusIcon className="size-4" /> {t('web.multi_hosting.add_server')}
                </Button>
            </div>

            {isFormOpen && (
                <div className="glass-card p-6 border border-border/40 rounded-xl bg-foreground/5 backdrop-blur-md animate-toastbar-enter">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">
                        {editingId ? t('web.multi_hosting.edit_server') : t('web.multi_hosting.new_server')}
                    </h2>
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
                            <p className="text-2xs text-muted-foreground/80 mt-0.5 leading-relaxed">
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
                                            <span>Join Link:</span>
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
