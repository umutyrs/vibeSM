import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ShieldAlertIcon } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/hooks/translator";

function PermissionTooltip({ permission }: { permission: string }) {
    const { t } = useTranslation();
    return (
        <Tooltip>
            <TooltipTrigger className="underline decoration-dotted cursor-help tracking-wider">
                {t('web.unauthorized.permission')}
            </TooltipTrigger>
            <TooltipContent>
                {permission}
            </TooltipContent>
        </Tooltip>
    );
}

type UnauthorizedPageProps = {
    pageName: string;
    permission: string;
};

export default function UnauthorizedPage({ pageName, permission }: UnauthorizedPageProps) {
    const { t } = useTranslation();
    let messageNode;
    if (permission === 'master') {
        messageNode = (
            <>
                {t('web.unauthorized.master_required', { page: pageName })}
            </>
        );
    } else {
        messageNode = (
            <>
                {t('web.unauthorized.perms_required_prefix')}
                <PermissionTooltip permission={permission} />
                {t('web.unauthorized.perms_required_suffix', { page: pageName })}
                <br />
                {t('web.unauthorized.contact_owner')}
            </>
        );
    }
    return (
        <div className="w-full px-4 pt-[7.5vh] flex items-start justify-center bg-background">
            <div className="mx-auto max-w-xl text-center border border-destructive/50 rounded-lg p-6 bg-destructive-hint/15 space-y-4">
                <h1 className="text-2xl font-bold tracking-tight text-destructive">
                    <ShieldAlertIcon className="size-6 mr-2 mt-0.5 inline align-text-top" />
                    {t('web.unauthorized.access_denied')}
                </h1>
                <p className="mt-4 text-sm text-primary/90 tracking-wide">
                    {messageNode}
                </p>
                <Button variant="outline" size='sm' asChild>
                    <Link href="/">{t('web.unauthorized.return')}</Link>
                </Button>
            </div>
        </div>
    );
}
