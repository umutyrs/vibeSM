import { Route, Switch } from "wouter";
import Login from "../pages/auth/Login";
import CfxreCallback from "../pages/auth/CfxreCallback";
import AddMasterPin from "../pages/auth/AddMasterPin";
import AddMasterCallback from "../pages/auth/AddMasterCallback";
import { Card } from "../components/ui/card";
import { LogoFullSquareGreen } from "@/components/Logos";
import { useThemedImage } from "@/hooks/theme";
import { handleExternalLinkClick } from "@/lib/navigation";
import { AuthError } from "@/pages/auth/errors";
import AdModal from "@/components/AdModal";
import { useAdModal } from "@/hooks/sheets";

function AuthContentWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-center">
            {children}
        </div>
    );
}


export default function AuthShell() {
    const customLogoUrl = useThemedImage(window.txConsts.providerLogo);
    const { setIsModalOpen } = useAdModal();
    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Atmospheric breathing cosmic glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-glow-purple pointer-events-none z-0 animate-pulse-glow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-glow-rose pointer-events-none z-0 animate-pulse-glow" style={{ animationDelay: '-7s' }}></div>
            <div className="absolute top-[40%] right-[20%] w-[25rem] h-[25rem] rounded-full bg-glow-orange pointer-events-none z-0 animate-pulse-glow" style={{ animationDelay: '-14s' }}></div>

            <div className="w-full min-w-[20rem] xs:max-w-[25rem] my-4 xs:mx-4 z-10 relative">
                {customLogoUrl ? (
                    <img
                        className='max-w-36 xs:max-w-56 max-h-16 xs:max-h-24 m-auto filter drop-shadow-[0_0_15px_rgba(188,94,255,0.3)]'
                        src={customLogoUrl}
                        alt={window.txConsts.providerName}
                    />
                ) : (
                    <LogoFullSquareGreen className="w-36 xs:w-52 mx-auto filter drop-shadow-[0_0_15px_rgba(234,89,47,0.35)] hover:scale-105 transition-all duration-300" />
                )}

                <div className="min-h-80 mt-4 xs:mt-8 mb-4 w-full flex items-center justify-center bg-transparent">
                    <Switch>
                        <Route path="/login">
                            <Login />
                        </Route>
                        <Route path="/login/callback">
                            <AuthContentWrapper>
                                <CfxreCallback />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/addMaster/pin">
                            <AuthContentWrapper>
                                <AddMasterPin />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/addMaster/callback">
                            <AuthContentWrapper>
                                <AddMasterCallback />
                            </AuthContentWrapper>
                        </Route>
                        <Route path="/:fullPath*">
                            <AuthContentWrapper>
                                <AuthError
                                    error={{
                                        errorTitle: '404 | Not Found',
                                        errorMessage: 'Something went wrong.',
                                    }}
                                />
                            </AuthContentWrapper>
                        </Route>
                    </Switch>
                </div>

                <div className="mx-auto flex flex-wrap gap-4 justify-center mb-2">
                    {window.txConsts.adsData.login ? (
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setIsModalOpen(true);
                            }}
                            className='w-48 h-16 relative group'
                        >
                            <img
                                className='rounded-lg max-w-48 max-h-16 m-auto border border-border'
                                src={window.txConsts.adsData.login.img}
                            />
                        </a>
                    ) : null}
                    <a
                        href='https://discord.gg/uAmsGa2'
                        onClick={handleExternalLinkClick}
                        target='_blank'
                        className='w-48 h-16 relative group'
                    >
                        <img
                            className='rounded-lg max-w-48 max-h-16 m-auto border border-border'
                            src="img/discord.png"
                        />
                    </a>
                </div>

                <div className="text-center text-muted-foreground text-xs font-semibold select-none mt-1">
                    vibeSM beta 0.1 | Windows
                </div>
            </div>
            <AdModal />
        </div>
    );
}
