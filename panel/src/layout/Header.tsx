import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { openExternalLink } from '@/lib/navigation';
import { KeyRoundIcon, LogOutIcon, Menu, Monitor, MoonIcon, PersonStanding, SunIcon } from "lucide-react";
import DesktopNavbar from "./DesktopNavbar";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/hooks/auth";
import { useGlobalMenuSheet, usePlayerlistSheet, useServerSheet } from "@/hooks/sheets";
import { useTheme } from "@/hooks/theme";
import { FaDiscord } from "react-icons/fa";
import { useAtomValue } from "jotai";
import { serverNameAtom } from "@/hooks/status";
import { playerCountAtom } from "@/hooks/playerlist";
import { useAccountModal } from "@/hooks/dialogs";
import { LogoSquareGreen, LogoFullSquareGreen } from "@/components/Logos";
import { NavLink } from "@/components/MainPageLink";
import { useTranslation } from "@/hooks/translator";


function ServerTitle() {
    const playerCount = useAtomValue(playerCountAtom);
    const serverName = useAtomValue(serverNameAtom);

    return (
        <div className="flex justify-start">
            <h1 className="line-clamp-1 text-base break-all">
                {serverName}
            </h1>
            <span>
                :&nbsp;
                <span className="font-mono" title="players connected">{playerCount}</span>
            </span>
        </div>
    );
}


type NavButtonProps = {
    className?: string;
};
const navButtonClasses = `h-11 w-11 sm:h-10 sm:min-w-max sm:px-2 lg:px-3
    flex justify-center items-center gap-2
    transition-all duration-300 ring-offset-background 
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    rounded-lg text-sm border border-white/10
   
    bg-card/40 backdrop-blur-md text-secondary-foreground hover:bg-white/10 hover:border-primary/40 active:scale-[0.97]
`;

function ButtonToggleServerSheet({ className }: NavButtonProps) {
    const { setIsSheetOpen } = useServerSheet();
    const { t } = useTranslation();
    return (
        <button
            className={cn(navButtonClasses, className)}
            title={t('web.header.server')}
            onClick={() => setIsSheetOpen(true)}
        >
            <Monitor className="h-6 w-6 sm:h-5 sm:w-5" />
            <div className="hidden sm:flex flex-row min-w-max align-middle">
                {t('web.header.server')}
            </div>
        </button>
    );
}

function ButtonToggleGlobalMenu({ className }: NavButtonProps) {
    const { setIsSheetOpen } = useGlobalMenuSheet();
    const { t } = useTranslation();
    return (
        <button
            className={cn(navButtonClasses, className)}
            title={t('web.header.menu')}
            onClick={() => setIsSheetOpen(true)}
        >
            <Menu className="h-6 w-6 sm:h-5 sm:w-5" />
            <div className="hidden sm:flex flex-row min-w-max">
                {t('web.header.menu')}
            </div>
        </button>
    );
}

function ButtonTogglePlayerlistSheet({ className }: NavButtonProps) {
    const { setIsSheetOpen } = usePlayerlistSheet();
    const playerCount = useAtomValue(playerCountAtom);
    const { t } = useTranslation();

    return (
        <button
            className={cn(navButtonClasses, className)}
            title={t('web.header.menu')}
            onClick={() => setIsSheetOpen(true)}
        >
            <PersonStanding className="h-6 w-6 sm:h-5 sm:w-5" />
            <div className="hidden sm:flex flex-row min-w-max">
                {t('web.header.players')}
                <span className="hidden lg:inline-block font-mono">: {playerCount}</span>
            </div>
        </button>
    );
}

//Segmenting this into a component prevents full header rerenders
function AuthedHeaderFragment() {
    const { authData, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { setAccountModalOpen } = useAccountModal();
    const { t } = useTranslation();
    if (!authData) return null;
    const switchTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }
    const openAccountModal = () => {
        setAccountModalOpen(true);
    }
    const gotoSupportDiscord = () => {
        openExternalLink('https://discord.gg/uAmsGa2');
    }
    const doLogout = () => logout();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-row items-center gap-2 sm:gap-3 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
                <span className="hidden xl:block text-muted-foreground">{authData.name}</span>
                <Avatar
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-md text-2xl 
                        transition-all focus-visible:outline-none
                        hover:border-muted-foreground hover:border"
                    username={authData.name}
                    profilePicture={authData.profilePicture}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {/* <DropdownMenuLabel>Your Account</DropdownMenuLabel>
                <DropdownMenuSeparator /> */}

                {/* Don't show theme selector if on NUI, as it is broken */}
                {/* TODO: remove this when remaking the ingame menu */}
                {window.txConsts.isWebInterface && (
                    <DropdownMenuItem className="cursor-pointer" onClick={switchTheme}>
                        <span className="hidden dark:flex items-center">
                            <SunIcon className="mr-2 h-4 w-4" />
                            {t('web.header.light_mode')}
                        </span>
                        <span className="flex dark:hidden items-center">
                            <MoonIcon className="mr-2 h-4 w-4" />
                            {t('web.header.dark_mode')}
                        </span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer" onClick={openAccountModal}>
                    <KeyRoundIcon className="mr-2 h-4 w-4" />
                    {t('web.header.account')}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={gotoSupportDiscord}>
                    <FaDiscord size="14" className="mr-2" />
                    {t('web.header.support')}
                </DropdownMenuItem>

                {/* Don't show logout if on NUI */}
                {window.txConsts.isWebInterface && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={doLogout}>
                            <LogOutIcon className="mr-2 h-4 w-4" />
                            {t('web.header.logout')}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function Header() {
    return (
        <header className="sticky top-0 z-20 flex flex-col items-center justify-center
            border-b border-white/10 bg-background/60 backdrop-blur-lg text-foreground shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <div className="h-16 lg:px-3 px-2 w-full max-w-[1920px] flex flex-row justify-between transition-all">
                <div className="flex flex-row items-center flex-grow gap-5 mr-5">
                    <div className="w-sidebar hidden xl:flex justify-center">
                        <NavLink href="/">
                            {/* <h2 className="text-4xl font-bold text-pink-500 saturate-150">Option XYZ</h2> */}
                            <LogoFullSquareGreen className="h-9 hover:scale-105 hover:brightness-110" />
                        </NavLink>
                    </div>
                    <NavLink href="/" className="hidden sm:max-xl:block">
                        <LogoSquareGreen className="h-8 w-8 lg:h-10 lg:w-10 hover:scale-105 hover:brightness-110" />
                    </NavLink>

                    <div className="lg:hidden">
                        <ServerTitle />
                    </div>
                    <nav className="hidden lg:block flex-grow">
                        <DesktopNavbar />
                    </nav>
                </div>

                <div className="flex flex-row items-center gap-2 sm:gap-3">
                    <ButtonToggleServerSheet className="lg:hidden" />
                    <ButtonToggleGlobalMenu className="lg:hidden" />
                    <ButtonTogglePlayerlistSheet className="xl:hidden" />
                    <AuthedHeaderFragment />
                </div>
            </div>
        </header>
    );
}
