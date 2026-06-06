import { useEffect, useRef, useState } from "react";
import { hotkeyEventListener } from "@/lib/hotkeyEventListener";
import { useTheme, getThemeStyleObject } from "@/hooks/theme";
import { useAtomValue } from "jotai";
import { selectedServerIdAtom } from "@/hooks/status";

type Props = {
    legacyUrl: string;
};

export default function Iframe({ legacyUrl }: Props) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { theme } = useTheme();

    // Track search and hash params in state so that URL changes trigger a re-render
    const [searchParams, setSearchParams] = useState(window.location.search ?? '');
    const [hashParams, setHashParams] = useState(window.location.hash ?? '');

    useEffect(() => {
        const handleLocationChange = () => {
            setSearchParams(window.location.search ?? '');
            setHashParams(window.location.hash ?? '');
        };

        window.addEventListener('popstate', handleLocationChange);
        return () => {
            window.removeEventListener('popstate', handleLocationChange);
        };
    }, []);

    const injectStyles = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        // 1. Get active theme style HSL variables
        const activeStyles = getThemeStyleObject(theme);
        if (!activeStyles) return;

        // 2. Generate CSS variable declarations
        const cssVariables = Object.entries(activeStyles)
            .map(([k, v]) => `--${k}: ${v};`)
            .join("\n");

        // 3. Define all custom styles to override legacy elements
        const customStyleCss = `
            :root {
                ${cssVariables}
                --destructive: 0 84.5% 59.6%;
            }

            body, html, .c-app, .c-main {
                background: transparent !important;
                color: hsl(var(--foreground)) !important;
                font-family: 'Space Grotesk', -apple-system, sans-serif !important;
            }

            /* Card overrides */
            .card, .modal-content {
                background: hsl(var(--card) / 0.55) !important;
                backdrop-filter: blur(16px) !important;
                -webkit-backdrop-filter: blur(16px) !important;
                border: 1px solid hsl(var(--border) / 0.35) !important;
                border-radius: 16px !important;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15) !important;
                transition: all 0.3s ease !important;
            }

            .card-header, .card-footer, .modal-header, .modal-footer {
                background: hsl(var(--card) / 0.7) !important;
                color: hsl(var(--card-foreground)) !important;
                border-bottom: 1px solid hsl(var(--border) / 0.4) !important;
                border-top: 1px solid hsl(var(--border) / 0.4) !important;
            }

            .card-body, .modal-body {
                background: transparent !important;
                color: hsl(var(--card-foreground)) !important;
            }

            /* Table elements override */
            .table {
                background: transparent !important;
                color: hsl(var(--foreground)) !important;
                border-collapse: separate !important;
                border-spacing: 0 8px !important;
            }

            .table tr {
                background: hsl(var(--card) / 0.4) !important;
                transition: all 0.25s ease !important;
            }

            .table tr:hover {
                background: hsl(var(--card) / 0.8) !important;
                transform: translateX(3px) !important;
            }

            .table td {
                color: hsl(var(--foreground)) !important;
                border: none !important;
                border-top: 1px solid hsl(var(--border) / 0.3) !important;
                border-bottom: 1px solid hsl(var(--border) / 0.3) !important;
                padding: 14px 18px !important;
                vertical-align: middle !important;
            }

            .table td:first-child {
                border-top-left-radius: 8px !important;
                border-bottom-left-radius: 8px !important;
                border-left: 3px solid transparent !important;
            }

            .table tr:hover td:first-child {
                border-left-color: hsl(var(--primary)) !important;
            }

            .table td:last-child {
                border-top-right-radius: 8px !important;
                border-bottom-right-radius: 8px !important;
            }

            .table thead th {
                background: transparent !important;
                border: none !important;
                color: hsl(var(--muted-foreground)) !important;
                font-weight: 600 !important;
                font-size: 0.75rem !important;
                text-transform: uppercase !important;
                letter-spacing: 0.08em !important;
                padding: 8px 18px !important;
            }

            .table .thead-light th {
                background-color: transparent !important;
            }

            /* Inputs & selects override */
            .form-control, select, textarea, .input-group-text {
                background: hsl(var(--background)) !important;
                border: 1px solid hsl(var(--border)) !important;
                color: hsl(var(--foreground)) !important;
                border-radius: 8px !important;
                padding: 8px 12px !important;
                transition: all 0.2s ease !important;
            }

            .form-control:focus, select:focus, textarea:focus {
                border-color: hsl(var(--primary)) !important;
                box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25) !important;
                outline: none !important;
            }

            /* Buttons style adaptation */
            .btn {
                border-radius: 8px !important;
                font-family: 'Space Grotesk', sans-serif !important;
                font-weight: 600 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
                font-size: 0.75rem !important;
                padding: 8px 16px !important;
                transition: all 0.2s ease !important;
            }

            .btn:active {
                transform: scale(0.97) !important;
            }

            .btn-primary, .btn-success {
                background: hsl(var(--primary)) !important;
                border: 1px solid hsl(var(--primary)) !important;
                color: #ffffff !important;
                box-shadow: 0 4px 12px 0 hsl(var(--primary) / 0.15) !important;
            }

            .btn-primary:hover, .btn-success:hover {
                background: hsl(var(--primary) / 0.85) !important;
                border-color: hsl(var(--primary) / 0.85) !important;
                box-shadow: 0 6px 20px 0 hsl(var(--primary) / 0.25) !important;
            }

            .btn-outline-primary, .btn-outline-success {
                background: transparent !important;
                border: 1px solid hsl(var(--primary)) !important;
                color: hsl(var(--primary)) !important;
            }

            .btn-outline-primary:hover, .btn-outline-success:hover {
                background: hsl(var(--primary) / 0.15) !important;
                color: hsl(var(--primary)) !important;
            }

            .btn-danger, .btn-outline-danger {
                background: hsl(var(--destructive) / 0.15) !important;
                border: 1px solid hsl(var(--destructive) / 0.3) !important;
                color: hsl(var(--destructive)) !important;
            }

            .btn-danger:hover, .btn-outline-danger:hover {
                background: hsl(var(--destructive)) !important;
                color: #ffffff !important;
            }

            /* Badges */
            .badge {
                padding: 5px 8px !important;
                border-radius: 4px !important;
                font-weight: 600 !important;
                font-family: 'Space Grotesk', sans-serif !important;
            }

            .badge-success {
                background: rgba(16, 185, 129, 0.15) !important;
                color: rgb(52, 211, 153) !important;
                border: 1px solid rgba(16, 185, 129, 0.25) !important;
            }

            .badge-danger {
                background: rgba(239, 68, 68, 0.15) !important;
                color: rgb(248, 113, 113) !important;
                border: 1px solid rgba(239, 68, 68, 0.25) !important;
            }

            .badge-warning {
                background: rgba(245, 158, 11, 0.15) !important;
                color: rgb(251, 191, 36) !important;
                border: 1px solid rgba(245, 158, 11, 0.25) !important;
            }

            /* Scrollbars */
            ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            ::-webkit-scrollbar-track {
                background: hsl(var(--background));
            }
            ::-webkit-scrollbar-thumb {
                background: hsl(var(--secondary) / 0.4);
                border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: hsl(var(--primary));
            }
        `;

        // 4. Inject style element
        let styleTag = iframeDoc.getElementById('vibe-iframe-custom-theme') as HTMLStyleElement;
        if (!styleTag) {
            styleTag = iframeDoc.createElement('style');
            styleTag.id = 'vibe-iframe-custom-theme';
            iframeDoc.head.appendChild(styleTag);
        }
        styleTag.innerHTML = customStyleCss;
    };

    const handleLoad = () => {
        injectStyles();
        if (iframeRef.current?.contentWindow) {
            try {
                iframeRef.current.contentWindow.removeEventListener('keydown', hotkeyEventListener);
                iframeRef.current.contentWindow.addEventListener('keydown', hotkeyEventListener);
            } catch (e) {
                // Ignore cross-origin error if applicable
            }
        }
    };

    useEffect(() => {
        injectStyles();
    }, [theme]);

    const selectedServerId = useAtomValue(selectedServerIdAtom);

    // Resolve path relative to <base> tag to support subfolder routes and dev mode routing
    const baseElement = document.getElementsByTagName('base')[0];
    const baseHref = baseElement ? baseElement.getAttribute('href') : '/';
    const cleanBase = baseHref && baseHref.endsWith('/') ? baseHref : `${baseHref ?? '/'}/`;
    
    let finalSearchParams = searchParams;
    if (selectedServerId) {
        const params = new URLSearchParams(searchParams);
        params.set('serverId', selectedServerId);
        finalSearchParams = '?' + params.toString();
    }
    const iframeSrc = `${cleanBase}legacy/${legacyUrl}${finalSearchParams}${hashParams}`;

    return (
        <iframe
            key={`${legacyUrl}-${selectedServerId}`}
            ref={iframeRef}
            id="legacyPageIframe" //required for the theme switcher
            src={iframeSrc}
            className="w-full"
            onLoad={handleLoad}
        ></iframe>
    );
}

