import {
  atom,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";

export enum vibeSMMenuPage {
  Main,
  Players,
  IFrame,
  PlayerModalOnly,
}

const pageState = atom<vibeSMMenuPage>({
  default: 0,
  key: "menuPage",
});

export const usePage = () => useRecoilState(pageState);

export const useSetPage = () => useSetRecoilState(pageState);

export const usePageValue = () => useRecoilValue(pageState);
