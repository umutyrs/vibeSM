import InlineCode from "@/components/InlineCode";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ApiOauthCallbackErrorResp } from "@shared/authApiTypes";
import { ArrowLeftIcon } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/hooks/translator";

//Shortcut component
function ErrorText({ children }: { children: React.ReactNode }) {
    return (
        <p className="whitespace-pre-wrap text-secondary-foreground leading-relaxed pb-2">
            {children}
        </p>
    );
}

export type AuthErrorData = ApiOauthCallbackErrorResp & { returnTo?: string };
type AuthErrorProps = {
    error: AuthErrorData;
};

/**
 * Display OAuth errors in a user-friendly way.
 */
export function AuthError({ error }: AuthErrorProps) {
    const { t } = useTranslation();
    error.returnTo = error.returnTo ?? '/login';
    let titleNode: React.ReactNode = null;
    let bodyNode: React.ReactNode = null;
    if ('errorTitle' in error) {
        titleNode = error.errorTitle;
        bodyNode = <ErrorText>{error.errorMessage}</ErrorText>;
    } else if (error.errorCode === 'invalid_session') {
        titleNode = t('web.auth_error.invalid_session_title');
        bodyNode = (
            <ErrorText>
                {t('web.auth_error.invalid_session_desc_1')} <br />
                {t('web.auth_error.invalid_session_desc_2')}
            </ErrorText>
        );
    } else if (error.errorCode === 'clock_desync') {
        titleNode = t('web.auth_error.clock_desync_title');
        bodyNode = (
            <ErrorText>
                {t('web.auth_error.clock_desync_desc')}
            </ErrorText>
        );
    } else if (error.errorCode === 'timeout') {
        titleNode = t('web.auth_error.timeout_title');
        bodyNode = (
            <ErrorText>
                {t('web.auth_error.timeout_desc')}
            </ErrorText>
        );
    } else if (error.errorCode === 'end_user_aborted') {
        titleNode = t('web.auth_error.login_aborted_title');
        bodyNode = (
            <ErrorText>
                {t('web.auth_error.login_aborted_desc_1')} <br />
                {t('web.auth_error.login_aborted_desc_2')}
            </ErrorText>
        );
    } else if (error.errorCode === 'end_user_logout') {
        titleNode = t('web.auth_error.login_aborted_title');
        bodyNode = (
            <ErrorText>
                {t('web.auth_error.login_logout_desc_1')} <br />
                {t('web.auth_error.login_logout_desc_2')}
            </ErrorText>
        );
    } else if (error.errorCode === 'master_already_set') {
        titleNode = t('web.auth_error.master_set_title');
        bodyNode = (
            <ErrorText>
                {t('web.auth_error.master_set_desc')}
            </ErrorText>
        );
    } else if (error.errorCode === 'not_admin') {
        const fivemId = error.errorContext?.identifier ?? 'unknown';
        const fivemName = error.errorContext?.name ?? 'unknown';
        titleNode = t('web.auth_error.not_admin_title', { name: fivemName });
        bodyNode = (
            <ErrorText>
                {t('web.auth_error.not_admin_desc_1')}
                <InlineCode>{fivemId}</InlineCode>
                {t('web.auth_error.not_admin_desc_2')} <br />
                {t('web.auth_error.not_admin_desc_3')}
            </ErrorText>
        );
    } else {
        titleNode = t('web.auth_error.unknown_error_title');
        bodyNode = (
            <div className="text-left rounded-sm text-muted-foreground bg-muted p-1">
                <pre className="text-left whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h3 className="text-2xl font-bold text-destructive-inline mb-4">
                {titleNode}
            </h3>
            {bodyNode}
            <CardFooter className="w-full flex justify-center mt-4 pb-0">
                <Link href={error.returnTo} asChild>
                    <Button className="x">
                        <ArrowLeftIcon className="inline mr-2 h-4 w-4" />
                        {t('web.auth_error.try_again')}
                    </Button>
                </Link>
            </CardFooter>
        </div>
    );
}

/**
 * Check the URL search params for common OAuth errors and return them.
 */
export const checkCommonOauthErrors = () => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    const errorDescription = params.get('error_description');
    if (errorCode === 'access_denied' && errorDescription === 'End-User aborted interaction') {
        return { errorCode: 'end_user_aborted' };
    } else if (errorCode === 'access_denied' && errorDescription === 'End-User aborted interaction (logout)') {
        return { errorCode: 'end_user_logout' };
    }
};

export const processFetchError = (error: any, t: (key: string) => string) => {
    if (error.message?.startsWith('NetworkError')) {
        return {
            errorTitle: t('web.auth_error.network_error'),
            errorMessage: t('web.auth_error.restart_desc'),
        };
    } else {
        return {
            errorTitle: t('web.auth_error.unknown_error'),
            errorMessage: error.message ?? '😵',
        };
    }
};
