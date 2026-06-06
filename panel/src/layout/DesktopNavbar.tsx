import * as React from 'react';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { useRoute } from 'wouter';
import MainPageLink from '@/components/MainPageLink';
import { cva } from 'class-variance-authority';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminPerms } from '@/hooks/auth';

const buttonVariants = cva(
    `group inline-flex h-9 w-max items-center justify-center rounded-lg border border-transparent px-3 py-1.5 text-xs font-display font-semibold tracking-wider transition-all duration-300 focus:outline-none disabled:pointer-events-none disabled:opacity-50 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`,
    {
        variants: {
            variant: {
                default: "text-foreground/60 hover:text-primary hover:bg-primary/5",
                secondary: "bg-primary/10 text-primary hover:bg-primary/15",
            },
        },
    }
);

type HeaderMenuLinkProps = {
    href: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
};
function HeaderMenuLink(props: HeaderMenuLinkProps) {
    const [isActive] = useRoute(props.href);
    const getActiveColorClass = (url: string) => {
        return 'text-primary font-bold border border-primary/20 bg-primary/10 shadow-none';
    };

    return (
        <NavigationMenuLink asChild active={isActive}>
            {props.disabled ? (
                <Tooltip>
                    <TooltipTrigger className="cursor-help">
                        <a className={cn(
                            buttonVariants({ variant: 'default' }),
                            "pointer-events-none opacity-50",
                            props.className,
                        )}>
                            {props.children}
                        </a>
                    </TooltipTrigger>
                    <TooltipContent side='bottom' className="text-destructive-inline text-center">
                        You do not have permission <br />
                        to access this page.
                    </TooltipContent>
                </Tooltip>
            ) : (
                <MainPageLink
                    href={props.href}
                    isActive={isActive}
                    className={cn(
                        buttonVariants({ variant: 'default' }),
                        'transition-all duration-300',
                        isActive && getActiveColorClass(props.href),
                        props.className,
                    )}
                >
                    {props.children}
                </MainPageLink>
            )}
        </NavigationMenuLink>
    );
}

import { useTranslation } from '@/hooks/translator';
import { useAtomValue } from 'jotai';
import { multiHostingEnabledAtom } from '@/hooks/status';


//NOTE: breaking NavigationMenuItem into a separate menu because the dropdown is positioned wrong otherwise
export default function DesktopNavbar() {
    const { hasPerm } = useAdminPerms();
    const { t } = useTranslation();
    const isMultiHostingEnabled = useAtomValue(multiHostingEnabledAtom);

    return (
        <div className='space-x-1 flex flex-row select-none'>
            <NavigationMenu>
                <NavigationMenuList>
                    {/* TODO: copypaste for new menu items */}
                    {/* <DynamicNewItem featName='xxxxxxxx' durationDays={7}>
                        <div className="ml-1 mb-2 rounded-md size-2 bg-accent" />
                    </DynamicNewItem> */}
                    <NavigationMenuItem>
                        <HeaderMenuLink href="/players">
                            {t('web.sidebar.players')}
                        </HeaderMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <HeaderMenuLink href="/history">
                            {t('web.sidebar.history')}
                        </HeaderMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <HeaderMenuLink href="/insights/player-drops">
                            {t('web.sidebar.insights')}
                        </HeaderMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <HeaderMenuLink href="/whitelist">
                            {t('web.sidebar.whitelist')}
                        </HeaderMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <HeaderMenuLink href="/admins" disabled={!hasPerm('manage.admins')}>
                            {t('web.sidebar.admins')}
                        </HeaderMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <HeaderMenuLink href="/settings" disabled={!hasPerm('settings.view')}>
                            {t('web.sidebar.settings')}
                        </HeaderMenuLink>
                    </NavigationMenuItem>
                    {isMultiHostingEnabled && (
                        <NavigationMenuItem>
                            <HeaderMenuLink href="/multi-hosting" disabled={!hasPerm('settings.multihosting')}>
                                {t('web.sidebar.multi_hosting')}
                            </HeaderMenuLink>
                        </NavigationMenuItem>
                    )}
                </NavigationMenuList>
            </NavigationMenu>

            <NavigationMenu>
                <NavigationMenuList className='aaaaaaaaaaa'>
                    <NavigationMenuItem>
                        <NavigationMenuTrigger
                            onClick={(e) => {
                                //To prevent very annoying behavior where you go click on the menu 
                                //item and it will close the menu because it just opened on hover
                                if (e.currentTarget.dataset['state'] === 'open') {
                                    e.preventDefault();
                                }
                             }}
                        >
                            {t('web.sidebar.system')}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="flex flex-col gap-2 p-4 list-none">
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/master-actions"
                            >
                                {t('web.sidebar.master_actions')}
                            </HeaderMenuLink>
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/diagnostics"
                            >
                                {t('web.sidebar.diagnostics')}
                            </HeaderMenuLink>
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/console-log"
                                disabled={!hasPerm('vibesm.log.view')}
                            >
                                {t('web.sidebar.console_log')}
                            </HeaderMenuLink>
                            <HeaderMenuLink
                                className="w-36 justify-start"
                                href="/system/action-log"
                                disabled={!hasPerm('vibesm.log.view')}
                            >
                                {t('web.sidebar.action_log')}
                            </HeaderMenuLink>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                </NavigationMenuList>
            </NavigationMenu>
        </div>
    );
}
