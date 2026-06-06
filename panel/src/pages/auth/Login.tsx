import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, LockIcon, Mail, Eye, EyeOff, Globe } from "lucide-react";
import { ApiOauthRedirectResp, ApiVerifyPasswordReq, ApiVerifyPasswordResp } from '@shared/authApiTypes';
import { useAuth } from '@/hooks/auth';
import './cfxreLoginButton.css';
import { useLocation } from "wouter";
import { fetchWithTimeout } from '@/hooks/fetch';
import { processFetchError } from './errors';
import { useTranslation } from '@/hooks/translator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export enum LogoutReasonHash {
    NONE = '',
    LOGOUT = '#logout',
    EXPIRED = '#expired',
    UPDATED = '#updated',
    MASTER_ALREADY_SET = '#master_already_set',
    SHUTDOWN = '#shutdown',
}

export default function Login() {
    const { t } = useTranslation();
    const { setAuthData } = useAuth();
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [isFetching, setIsFetching] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const setLocation = useLocation()[1];

    const server = window.txConsts.server;
    const serverName = server?.name || 'vibeSM';

    const locales = window.txConsts.locales || [];
    const activeLang = window.txConsts.language || 'en';

    const handleLanguageChange = (code: string) => {
        document.cookie = `vibeSM-language=${code}; path=/; max-age=${365 * 24 * 60 * 60}`;
        window.location.reload();
    };

    const onError = (error: any) => {
        const { errorTitle, errorMessage } = processFetchError(error);
        setErrorMessage(`${errorTitle}:\n${errorMessage}`);
    }

    const onErrorResponse = (error: string) => {
        if (error === 'no_admins_setup') {
            setErrorMessage('No admins set up.\nRedirecting...');
            setLocation('/addMaster/pin');
        } else {
            setErrorMessage(error);
        }
    }

    const handleLogin = async () => {
        try {
            setIsFetching(true);
            const data = await fetchWithTimeout<ApiVerifyPasswordResp, ApiVerifyPasswordReq>(
                `/auth/password?uiVersion=${encodeURIComponent(window.txConsts.vibeVersion)}`,
                {
                    method: 'POST',
                    body: {
                        username: usernameRef.current?.value ?? '',
                        password: passwordRef.current?.value ?? '',
                    },
                }
            );
            if ('error' in data) {
                if (data.error === 'refreshToUpdate') {
                    window.location.href = `/login${LogoutReasonHash.UPDATED}`;
                    window.location.reload();
                } else {
                    onErrorResponse(data.error);
                }
            } else {
                setAuthData(data);
            }
        } catch (error) {
            onError(error);
        } finally {
            setIsFetching(false);
        }
    }

    const handleRedirect = async () => {
        try {
            setIsFetching(true);
            const data = await fetchWithTimeout<ApiOauthRedirectResp>(
                `/auth/cfxre/redirect?origin=${encodeURIComponent(window.location.origin)}`
            );
            if ('error' in data) {
                onErrorResponse(data.error);
                setIsFetching(false);
            } else {
                console.log('Redirecting to', data.authUrl);
                window.location.href = data.authUrl;
            }
        } catch (error) {
            onError(error);
            setIsFetching(false);
        }
    }

    useEffect(() => {
        try {
            const rawLocalStorageStr = localStorage.getItem('authCredsAutofill');
            if (rawLocalStorageStr) {
                const [user, pass] = JSON.parse(rawLocalStorageStr);
                usernameRef.current!.value = user ?? '';
                passwordRef.current!.value = pass ?? '';
            }
        } catch (error) {
            console.error('Username/Pass autofill failed', error);
        }
    }, []);

    useEffect(() => {
        const hash = window.location.hash;
        if (!hash) return;
        if (hash === LogoutReasonHash.LOGOUT) {
            setErrorMessage('Logged Out.');
        } else if (hash === LogoutReasonHash.EXPIRED) {
            setErrorMessage('Session Expired.');
        } else if (hash === LogoutReasonHash.UPDATED) {
            setErrorMessage('vibeSM updated!\nPlease login again.');
        } else if (hash === LogoutReasonHash.MASTER_ALREADY_SET) {
            setErrorMessage('Master account already configured.');
        } else if (hash === LogoutReasonHash.SHUTDOWN) {
            setErrorMessage('The vibeSM server shut down.\nPlease start it again to be able to login.');
        }
        window.location.hash = '';
    }, []);

    return (
        <div className="w-full bg-transparent p-0 space-y-6 text-center">
            {/* Language Selector */}
            {locales.length > 0 && (
                <div className="fixed top-4 right-4 z-50">
                    <Select
                        value={activeLang}
                        onValueChange={handleLanguageChange}
                    >
                        <SelectTrigger className="w-[140px] h-9 text-xs bg-[#111214]/60 backdrop-blur-md border-[#222326] text-white hover:bg-[#16171a]/85 transition-all">
                            <Globe className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Language..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {locales.map((locale) => (
                                <SelectItem key={locale.code} value={locale.code} className="text-xs">
                                    {locale.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Header info */}
            <div className="space-y-1.5 select-none">
                <h1 className="text-[26px] font-semibold tracking-tight text-white font-display">
                    {t('web.login.welcome_back')}
                </h1>
                <p className="text-xs text-[#8a8b8d]">
                    {t('web.login.enter_credentials', { servername: serverName })}
                </p>
            </div>

            {/* Cfx.re Login option */}
            <div className="space-y-3">
                <button
                    type="button"
                    className="w-full h-11 flex items-center justify-center gap-2.5 rounded-lg bg-[#111214] border border-[#222326] hover:bg-[#16171a] hover:border-[#323337] active:scale-[0.98] transition-all text-white font-semibold text-sm shadow-sm"
                    disabled={isFetching}
                    onClick={handleRedirect}
                >
                    {isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <img 
                            src="https://www.chezzastudios.com/images/brands/cfx.png" 
                            alt="Cfx.re login" 
                            className="h-6 w-auto object-contain select-none"
                        />
                    )}
                </button>
            </div>

            <div className="relative flex py-2 items-center select-none justify-center">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#1f2023]"></div>
                </div>
                <div className="relative z-10 px-3.5 py-1 text-[9px] font-bold text-[#8a8b8d] bg-[#161719] border border-[#242528] rounded-md tracking-wider uppercase">
                    {t('web.login.or_continue')}
                </div>
            </div>

            {errorMessage && (
                <div className="text-center text-sm whitespace-pre-wrap text-destructive-inline bg-destructive/10 border border-destructive/25 rounded-lg p-2.5">
                    {errorMessage}
                </div>
            )}

            <form
                onSubmit={(e) => { e.preventDefault(); handleLogin();}}
                className='space-y-4 text-left'
            >
                <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/45" />
                    <Input
                        id="frm-login"
                        ref={usernameRef}
                        type="text"
                        placeholder={t('web.login.username_placeholder')}
                        autoCapitalize='off'
                        autoComplete='off'
                        className="h-11 pl-11 bg-[#111214] border-[#222326] hover:border-[#323337] focus:border-primary focus:ring-primary/20 text-sm placeholder:text-muted-foreground/35 rounded-lg w-full transition-all text-white"
                        required
                    />
                </div>

                <div className="relative">
                    <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/45" />
                    <Input
                        id="frm-password"
                        ref={passwordRef}
                        type={showPassword ? "text" : "password"}
                        placeholder={t('web.login.password_placeholder')}
                        autoCapitalize='off'
                        autoComplete='off'
                        className="h-11 pl-11 pr-11 bg-[#111214] border-[#222326] hover:border-[#323337] focus:border-primary focus:ring-primary/20 text-sm placeholder:text-muted-foreground/35 rounded-lg w-full transition-all text-white"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8b8d] hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                </div>

                <div className="pt-3">
                    <Button
                        type="submit"
                        disabled={isFetching}
                        className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-11 active:scale-[0.98] transition-all shadow-md text-sm rounded-lg"
                    >
                        {isFetching ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t('web.login.anmelden')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
