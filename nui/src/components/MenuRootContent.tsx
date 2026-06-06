import React from "react";
import { Box, Collapse, styled, Typography, useTheme } from "@mui/material";
import { PageTabs} from "@nui/src/components/misc/PageTabs";
import { vibeSMMenuPage, usePageValue } from "@nui/src/state/page.state";
import { MainPageList } from "@nui/src/components/MainPage/MainPageList";
import { useServerCtxValue } from "@nui/src/state/server.state";
import { useDebounce } from "@nui/src/hooks/useDebouce";

interface TxAdminLogoProps {
  themeName: string;
}

const TxAdminLogo: React.FC<TxAdminLogoProps> = ({ themeName }) => {
  return (
    <Box my={1.5} display="flex" justifyContent="center">
      <svg
        style={{ overflow: "visible", height: 26, width: "auto" }}
        fill="none"
        viewBox="8 94 234 66"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m28.68 98.01c-2.77 0-3.9 2.17-3.9 3.8v19.05c0 2.95 1.73 4.03 3.75 4.03s3.64-1.37 3.64-3.83v-19.25c0-2.17-1.23-3.8-3.49-3.8z" fill="url(#vibesm-nui-grad-0)"/>
        <path d="m14.31 108.3c-5.61 5.07-8.31 10.97-8.31 17.52 0 11.61 9.57 22.25 22.41 22.25 13.17 0 23.77-11.24 23.77-22.84 0-6.55-3.19-12.95-8.76-17.27-2.34-1.7-6.34-0.17-6.29 3.02 0.03 1.66 0.92 2.64 1.86 3.5 4.09 3.86 5.62 7.32 5.62 11.31 0 8.48-7.45 14.83-15.84 14.66-8.61-0.18-15.66-6.52-15.66-15.36 0-4.16 2.32-8.97 5.27-11.47 1.63-1.37 1.98-2.7 1.75-4.22-0.41-2.62-3.48-3.05-5.82-1.1z" fill="url(#vibesm-nui-grad-1)"/>
        <path d="m58.68 101.6h6.87v7.44h-6.87v-7.44zm0 11.03h6.64v32.75h-6.64v-32.75z" fill="url(#vibesm-nui-grad-2)"/>
        <path d="m71.79 101.4h7.39v11.49h17.23c6.11 0 8.73 5.11 8.73 8.98v15c0 5.98-4.13 8.54-8.26 8.54h-25.09v-44.01zm7.56 18.2v18.87h17.67c0.63 0 0.8-0.34 0.8-1.03v-17.1c0-0.63-0.17-0.97-0.97-0.97h-16.9c-0.48 0-0.6 0.11-0.6 0.23z" fill="url(#vibesm-nui-grad-3)"/>
        <path d="m117.8 112.6h15.96c6.25 0 8.93 4.64 8.96 8.05v11.99h-26.06v5c0 0.54 0.22 0.77 1.03 0.77h24.97v6.94h-24.57c-5.58 0-8.43-4.33-8.43-8.2v-16.58c0-4.64 3.81-7.97 8.14-7.97zm-1.14 7.85v5.28h18.78v-5.56c0-0.63-0.34-0.97-1.11-0.97h-16.53c-0.86 0-1.14 0.54-1.14 1.25z" fill="url(#vibesm-nui-grad-4)"/>
        <path d="m156.7 104.4h22.15c6.95 0 8.76 5.81 8.76 8.96v2.34h-7.11v-2.71c0-0.85-0.28-1.25-1.31-1.25h-21.86c-0.86 0-1.26 0.4-1.26 1.25v6.85c0 0.86 0.29 1.25 1.2 1.25h22.69c5.27 0 7.65 4.7 7.65 8.11v7.8c0 4.81-3.62 8.34-8.42 8.34h-21.58c-6.4 0-9.19-4.27-9.19-8.2v-2.9h7.22v2.56c0 0.97 0.35 1.37 1.2 1.37h22.07c0.85 0 1.25-0.4 1.25-1.26v-7.31c0-0.86-0.34-1.2-1.31-1.2h-22.09c-5.12 0-8.48-3.17-8.48-8.36v-7.05c0-4.95 3.31-8.59 8.42-8.59z" fill="url(#vibesm-nui-grad-5)"/>
        <path d="m194.5 104.2h7.91l14.42 17.83 15.79-17.83h7.38v41.11h-7.06v-30.08l-16.22 19.49-15-19.38v29.97h-7.22v-41.11z" fill="url(#vibesm-nui-grad-6)"/>
        <defs>
          <linearGradient id="vibesm-nui-grad-0" x1="13.51" x2="237.4" y1="100.8" y2="148" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F19324" offset="0"/>
            <stop stopColor="#EA592F" offset=".3333"/>
            <stop stopColor="#C6194A" offset="1"/>
          </linearGradient>
          <linearGradient id="vibesm-nui-grad-1" x1="10.17" x2="234" y1="111.4" y2="158.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F19324" offset="0"/>
            <stop stopColor="#EA592F" offset=".3333"/>
            <stop stopColor="#C6194A" offset="1"/>
          </linearGradient>
          <linearGradient id="vibesm-nui-grad-2" x1="12.01" x2="235.8" y1="102.9" y2="150.1" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F19324" offset="0"/>
            <stop stopColor="#EA592F" offset=".3333"/>
            <stop stopColor="#C6194A" offset="1"/>
          </linearGradient>
          <linearGradient id="vibesm-nui-grad-3" x1="13.53" x2="237.4" y1="95.7" y2="142.9" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F19324" offset="0"/>
            <stop stopColor="#EA592F" offset=".3333"/>
            <stop stopColor="#C6194A" offset="1"/>
          </linearGradient>
          <linearGradient id="vibesm-nui-grad-4" x1="15.29" x2="239.1" y1="87.39" y2="134.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F19324" offset="0"/>
            <stop stopColor="#EA592F" offset=".3333"/>
            <stop stopColor="#C6194A" offset="1"/>
          </linearGradient>
          <linearGradient id="vibesm-nui-grad-5" x1="17.26" x2="241.1" y1="78.35" y2="125.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F19324" offset="0"/>
            <stop stopColor="#EA592F" offset=".3333"/>
            <stop stopColor="#C6194A" offset="1"/>
          </linearGradient>
          <linearGradient id="vibesm-nui-grad-6" x1="19" x2="242.8" y1="69.66" y2="116.8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F19324" offset="0"/>
            <stop stopColor="#EA592F" offset=".3333"/>
            <stop stopColor="#C6194A" offset="1"/>
          </linearGradient>
        </defs>
      </svg>
    </Box>
  )
};

const StyledRoot = styled(Box)(({ theme }) => ({
  height: "fit-content",
  background: theme.palette.background.default,
  width: 325,
  borderRadius: 16,
  border: "1px solid #23252a",
  boxShadow: "none",
  display: "flex",
  flexDirection: "column",
  userSelect: "none",
}));

export const MenuRootContent: React.FC = React.memo(() => {
  const theme = useTheme();
  const serverCtx = useServerCtxValue();
  const curPage = usePageValue()
  const padSize = Math.max(0, 9 - serverCtx.vibeSMVersion.length);
  const versionPad = "\u0020\u205F".repeat(padSize);

  // Hack to prevent collapse transition from breaking
  // In some cases, i.e, when setting target player from playerModal
  // Collapse transition can break due to multiple page updates within a short
  // time frame
  const debouncedCurPage = useDebounce(curPage, 50)

  return (
    <StyledRoot p={2} pb={1}>
      <TxAdminLogo themeName={theme.name}/>
      <Typography
        color="textSecondary"
        style={{
          fontWeight: 500,
          marginTop: -20,
          textAlign: "right",
          fontSize: 12,
        }}
      >
        v{serverCtx.vibeSMVersion}
        {versionPad}
      </Typography>
      <PageTabs />
      <Collapse
        in={debouncedCurPage === vibeSMMenuPage.Main}
        unmountOnExit
        mountOnEnter
      >
        <MainPageList />
      </Collapse>
    </StyledRoot>)
});
