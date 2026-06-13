import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent, DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/auth";
import { memo, useEffect, useState } from "react";
import { TabsTrigger, TabsList, TabsContent, Tabs } from "@/components/ui/tabs";
import { ApiChangeIdentifiersReq, ApiChangePasswordReq } from "@shared/authApiTypes";
import { useAccountModal, useCloseAccountModal } from "@/hooks/dialogs";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { ApiTimeout, fetchWithTimeout, useAuthedFetcher, useBackendApi } from "@/hooks/fetch";
import consts from "@shared/consts";
import { txToast } from "./TxToaster";
import useSWR from 'swr';
import TxAnchor from "./TxAnchor";
import { useTranslation } from "@/hooks/translator";


/**
 * Change Password tab
 */
const ChangePasswordTab = memo(function () {
    const { authData, setAuthData } = useAuth();
    const { setAccountModalTab } = useAccountModal();
    const closeAccountModal = useCloseAccountModal();
    const changePasswordApi = useBackendApi<GenericApiOkResp, ApiChangePasswordReq>({
        method: 'POST',
        path: '/auth/changePassword'
    });

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!authData) return;
        setError('');

        if (newPassword.length < consts.adminPasswordMinLength || newPassword.length > consts.adminPasswordMaxLength) {
            setError(`The password must be between ${consts.adminPasswordMinLength} and ${consts.adminPasswordMaxLength} digits long.`);
            return;
        } else if (newPassword !== newPasswordConfirm) {
            setError('The passwords do not match.');
            return;
        }

        setIsSaving(true);
        changePasswordApi({
            data: {
                newPassword,
                oldPassword: authData.isTempPassword ? undefined : oldPassword,
            },
            error: (error) => {
                setIsSaving(false);
                setError(error);
            },
            success: (data) => {
                setIsSaving(false);
                if ('success' in data) {
                    if (authData.isTempPassword) {
                        setAccountModalTab('identifiers');
                        setAuthData({
                            ...authData,
                            isTempPassword: false,
                        });
                    } else {
                        txToast.success('Password changed successfully!');
                        closeAccountModal();
                    }
                } else {
                    setError(data.error)
                }
            }
        });
    };

    if (!authData) return;
    return (
        <TabsContent value="password" tabIndex={undefined}>
            <form onSubmit={handleSubmit}>
                {authData.isTempPassword ? (<p className="text-sm text-warning-inline">
                    Your account has a temporary password that needs to be changed before you can use this web panel. <br />
                    <strong>Make sure to take note of your new password before saving.</strong>
                </p>) : (<p className="text-sm text-muted-foreground">
                    You can use your password to login to the vibeSM inferface even without using the Cfx.re login button.
                </p>)}
                <div className="space-y-3 pt-2 pb-6">
                    {!authData.isTempPassword && (
                        <div className="space-y-1">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input
                                id="current-password"
                                placeholder="Enter current password"
                                type="password"
                                value={oldPassword}
                                autoComplete="current-password"
                                autoFocus
                                required
                                onChange={(e) => {
                                    setOldPassword(e.target.value);
                                    setError('');
                                }}
                            />
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            type="password"
                            value={newPassword}
                            autoFocus={authData.isTempPassword}
                            required
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                setError('');
                            }}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            autoComplete="new-password"
                            placeholder="Repeat new password"
                            type="password"
                            required
                            onChange={(e) => {
                                setNewPasswordConfirm(e.target.value);
                                setError('');
                            }}
                        />
                    </div>
                </div>

                {error && <p className="text-destructive text-center -mt-2 mb-4">{error}</p>}
                <Button
                    className="w-full"
                    type="submit"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : authData.isTempPassword ? 'Save & Next' : 'Change Password'}
                </Button>
            </form>
        </TabsContent>
    );
})


/**
 * Change Identifiers tab
 */
function ChangeIdentifiersTab() {
    const authedFetcher = useAuthedFetcher();
    const [cfxreId, setCfxreId] = useState('');
    const [discordId, setDiscordId] = useState('');
    const [error, setError] = useState('');
    const [isConvertingFivemId, setIsConvertingFivemId] = useState(false);
    const closeAccountModal = useCloseAccountModal();
    const [isSaving, setIsSaving] = useState(false);

    const currIdsResp = useSWR<ApiChangeIdentifiersReq>(
        '/auth/getIdentifiers',
        () => authedFetcher<ApiChangeIdentifiersReq>('/auth/getIdentifiers'),
        {
            //the data min interval is 5 mins, so we can safely cache for 1 min
            revalidateOnMount: true,
            revalidateOnFocus: false,
        }
    );

    useEffect(() => {
        if (!currIdsResp.data) return;
        setCfxreId(currIdsResp.data.citizenfx ?? '');
        setDiscordId(currIdsResp.data.discord ?? '');
    }, [currIdsResp.data]);

    const changeIdentifiersApi = useBackendApi<GenericApiOkResp, ApiChangeIdentifiersReq>({
        method: 'POST',
        path: '/auth/changeIdentifiers'
    });

    const handleSearchFivemName = async () => {
        if (!cfxreId || cfxreId.includes(':') || isNaN(Number(cfxreId))) {
            return;
        }
        setIsConvertingFivemId(true);
        setError('');
        try {
            const res = await fetchWithTimeout<any>(`/auth/cfxre/convertId/${cfxreId}`);
            if (res.error) {
                setError(res.error);
            } else if (res.username) {
                setCfxreId(res.username);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to convert CitizenFX ID');
        } finally {
            setIsConvertingFivemId(false);
        }
    }

    const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        setError('');
        setIsSaving(true);

        changeIdentifiersApi({
            data: {
                citizenfx: cfxreId.trim() ? cfxreId.trim() : undefined,
                discord: discordId.trim() ? discordId.trim() : undefined,
            },
            error: (error) => {
                setIsSaving(false);
                setError(error);
            },
            success: (data) => {
                setIsSaving(false);
                if ('success' in data) {
                    txToast.success('Identifiers updated successfully!');
                    closeAccountModal();
                } else {
                    setError(data.error)
                }
            }
        });
    };

    return (
        <TabsContent value="identifiers" tabIndex={undefined}>
            <form onSubmit={handleSubmit}>
                <p className="text-sm text-muted-foreground pb-4">
                    These identifiers are used to associate your game/discord accounts with this master admin account.
                </p>
                <div className="space-y-4 pb-6">
                    <div className="space-y-1">
                        <Label htmlFor="cfxre-id">CitizenFX Username or Forum ID</Label>
                        <div className="flex gap-2">
                            <Input
                                id="cfxre-id"
                                placeholder="e.g. Tabarra or 123456"
                                value={cfxreId}
                                disabled={!currIdsResp.data || isSaving}
                                onChange={(e) => {
                                    setCfxreId(e.target.value);
                                    setError('');
                                }}
                            />
                            {cfxreId && !cfxreId.includes(':') && !isNaN(Number(cfxreId)) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSearchFivemName}
                                    disabled={isConvertingFivemId || isSaving}
                                >
                                    {isConvertingFivemId ? 'Searching...' : 'Resolve name'}
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="discord-id">Discord User ID</Label>
                        <Input
                            id="discord-id"
                            placeholder="e.g. 272801155986161664"
                            value={discordId}
                            disabled={!currIdsResp.data || isSaving}
                            onChange={(e) => {
                                setDiscordId(e.target.value);
                                setError('');
                            }}
                        />
                    </div>
                </div>

                {error && <p className="text-destructive text-center -mt-2 mb-4">{error}</p>}
                <Button
                    className="w-full"
                    type="submit"
                    disabled={!currIdsResp.data || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </TabsContent>
    );
}


/**
 * Two Factor Authentication tab
 */
function TwoFactorAuthTab() {
    const { authData, setAuthData } = useAuth();
    const [qrCodeData, setQrCodeData] = useState<{ secret: string; qrCode: string } | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation();
    const authedFetcher = useAuthedFetcher();

    if (!authData) return null;

    const handleStartSetup = async () => {
        setError('');
        setIsLoading(true);
        try {
            const res = await authedFetcher<any>('/auth/2fa/setup', { method: 'GET' });
            if (res.error) {
                setError(res.error);
            } else {
                setQrCodeData(res);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to start 2FA setup');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAndEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await authedFetcher<any>('/auth/2fa/enable', {
                method: 'POST',
                body: { code: verificationCode }
            });
            if (res.error) {
                setError(res.error);
            } else {
                txToast.success('Two-factor authentication enabled successfully!');
                setAuthData({
                    ...authData,
                    twoFactorEnabled: true
                });
                setQrCodeData(null);
                setVerificationCode('');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to enable 2FA');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await authedFetcher<any>('/auth/2fa/disable', {
                method: 'POST',
                body: { code: verificationCode }
            });
            if (res.error) {
                setError(res.error);
            } else {
                txToast.success('Two-factor authentication disabled successfully!');
                setAuthData({
                    ...authData,
                    twoFactorEnabled: false
                });
                setVerificationCode('');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to disable 2FA');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TabsContent value="2fa" tabIndex={undefined}>
            {authData.twoFactorEnabled ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {t('web.2fa.active')}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">
                            {t('web.2fa.enabled_msg')}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('web.2fa.secured_msg')}
                    </p>
                    <form onSubmit={handleDisable} className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <Label htmlFor="disable-2fa-code">{t('web.2fa.verification_code')}</Label>
                            <Input
                                id="disable-2fa-code"
                                placeholder={t('web.2fa.disable_placeholder')}
                                type="text"
                                maxLength={6}
                                pattern="\d*"
                                value={verificationCode}
                                required
                                onChange={(e) => {
                                    setVerificationCode(e.target.value);
                                    setError('');
                                }}
                            />
                        </div>
                        {error && <p className="text-destructive text-sm font-medium">{error}</p>}
                        <Button
                            className="w-full"
                            type="submit"
                            variant="destructive"
                            disabled={isLoading}
                        >
                            {isLoading ? t('web.2fa.disabling') : t('web.2fa.disable_btn')}
                        </Button>
                    </form>
                </div>
            ) : (
                <div className="space-y-4">
                    {!qrCodeData ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {t('web.2fa.intro_msg')}
                            </p>
                            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
                            <Button
                                className="w-full"
                                type="button"
                                onClick={handleStartSetup}
                                disabled={isLoading}
                            >
                                {isLoading ? t('web.2fa.generating') : t('web.2fa.setup_btn')}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleVerifyAndEnable} className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {t('web.2fa.scan_msg')}
                            </p>
                            <div className="flex flex-col items-center justify-center p-3 bg-white border border-border rounded-lg">
                                <img
                                    src={qrCodeData.qrCode}
                                    alt="QR Code"
                                    className="w-44 h-44 object-contain"
                                />
                                <div className="mt-2 text-xs text-slate-800 font-mono select-all select-text bg-slate-100 px-2.5 py-1 rounded border">
                                    {t('web.2fa.key', { key: qrCodeData.secret })}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="verify-2fa-code">{t('web.2fa.verification_code')}</Label>
                                <Input
                                    id="verify-2fa-code"
                                    placeholder={t('web.2fa.placeholder')}
                                    type="text"
                                    maxLength={6}
                                    pattern="\d*"
                                    value={verificationCode}
                                    required
                                    onChange={(e) => {
                                        setVerificationCode(e.target.value);
                                        setError('');
                                    }}
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    type="button"
                                    variant="outline"
                                    onClick={() => setQrCodeData(null)}
                                    disabled={isLoading}
                                >
                                    {t('web.2fa.cancel')}
                                </Button>
                                <Button
                                    className="flex-1"
                                    type="submit"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('web.2fa.verifying') : t('web.2fa.verify_enable')}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </TabsContent>
    );
}


/**
 * Account Dialog
 */
export default function AccountDialog() {
    const { authData } = useAuth();
    const {
        isAccountModalOpen, setAccountModalOpen,
        accountModalTab, setAccountModalTab
    } = useAccountModal();
    const { t } = useTranslation();

    useEffect(() => {
        if (!authData) return;
        if (authData.isTempPassword) {
            setAccountModalOpen(true);
            setAccountModalTab('password');
        }
    }, []);

    const dialogSetIsClose = (newState: boolean) => {
        if (!newState && authData && !authData.isTempPassword) {
            setAccountModalOpen(false);
            setTimeout(() => {
                setAccountModalTab('password');
            }, 500);
        }
    }

    if (!authData) return;
    return (
        <Dialog
            open={isAccountModalOpen}
            onOpenChange={dialogSetIsClose}
        >
            <DialogContent className="sm:max-w-lg" tabIndex={undefined}>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {authData.isTempPassword ? 'Welcome to vibeSM!' : `Your Account - ${authData.name}`}
                    </DialogTitle>
                </DialogHeader>
                <Tabs
                    defaultValue="password"
                    value={accountModalTab}
                    onValueChange={setAccountModalTab}
                >
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="password">Password</TabsTrigger>
                        <TabsTrigger value="identifiers" disabled={authData.isTempPassword}>Identifiers</TabsTrigger>
                        <TabsTrigger value="2fa" disabled={authData.isTempPassword}>{t('web.2fa.title')}</TabsTrigger>
                    </TabsList>
                    <ChangePasswordTab />
                    <ChangeIdentifiersTab />
                    <TwoFactorAuthTab />
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
