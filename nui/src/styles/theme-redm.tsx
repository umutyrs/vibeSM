export default {
  name: 'redm',
  logo: 'images/vibesm-redm.png',
  palette: {
    mode: "dark",
    primary: {
      main: "#5e6ad2", // Linear lavender-blue
      light: "#828fff",
      dark: "#5e69d1",
    },
    success: {
      main: "#27a644", // Linear success green
    },
    warning: {
      main: "#f59e0b",
    },
    error: {
      main: "#ef4444",
    },
    info: {
      main: "#3b82f6",
    },
    background: {
      default: "#010102", // Linear canvas
      paper: "#0a0b0d", // Linear surface-1
    },
    action: {
      selected: "#181b21", // Linear surface-2
      hover: "#181b21",
    },
    secondary: {
      main: "#8a8f98", // Linear ink-subtle
    },
    text: {
      primary: "#f7f8f8", // Linear ink
      secondary: "#8a8f98", // Linear ink-subtle
    },
  },
  components: {
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          border: "1px solid #23252a", // Hairline border
          marginBottom: "6px",
          backgroundColor: "#0a0b0d",
          transition: "all 0.15s ease",
          "&.Mui-selected": {
            backgroundColor: "#181b21",
            border: "1px solid #383c48",
          },
          "&:hover": {
            backgroundColor: "#181b21",
            border: "1px solid #383c48",
          }
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          border: "1px solid transparent",
          transition: "all 0.15s ease",
          "&.Mui-selected": {
            backgroundColor: "#181b21",
            border: "1px solid #383c48",
          },
          "&:hover": {
            backgroundColor: "#181b21",
          }
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          textTransform: "none",
          boxShadow: "none",
          fontWeight: 500,
          border: "1px solid transparent",
          transition: "all 0.15s ease",
          "&:hover": {
            boxShadow: "none",
          },
          "&:active": {
            boxShadow: "none",
          }
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          border: "1px solid #23252a",
          borderRadius: "12px",
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          backgroundColor: "#0a0b0d",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#23252a",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#383c48",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#5e6ad2",
            borderWidth: "1px",
          },
        },
      },
    },
  },
} as const;
