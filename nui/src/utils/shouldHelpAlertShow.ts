interface TxAdminHelpData {
  date: Date;
}

const VIBESM_HELP_DATA_KEY = "vibeSMHelpData";

const dayInMs = 24 * 60 * 60 * 1000;

export const shouldHelpAlertShow = (): boolean => {
  const rawLocalStorageStr = localStorage.getItem(VIBESM_HELP_DATA_KEY);

  const setNewItemDate = JSON.stringify({ date: new Date() });

  if (rawLocalStorageStr) {
    const data: TxAdminHelpData = JSON.parse(rawLocalStorageStr);
    const oneDayAgo = new Date(Date.now() - dayInMs);

    // If the last time message was shown was over a day ago
    if (data.date > oneDayAgo) {
      localStorage.setItem(VIBESM_HELP_DATA_KEY, setNewItemDate);
      return true;
    }

    return false;
  }

  localStorage.setItem(VIBESM_HELP_DATA_KEY, setNewItemDate);
  return true;
};
