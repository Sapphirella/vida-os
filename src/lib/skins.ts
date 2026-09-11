// 皮肤（配色方案）
//
// 每套皮肤有固定的 key 与中文名，用户可以直接按名字要求增删。
// 具体颜色在 src/styles/globals.css 里用 :root[data-skin='<key>'] 覆盖。

export interface Skin {
  key: string;
  /** 用户可见的名字（用于设置页与口头指代） */
  name: string;
  desc: string;
  /** 预览用：卡片底色 */
  cardBg: string;
  /** 预览用：文字色 */
  textColor: string;
}

export const DEFAULT_SKIN = 'dark-study';

export const SKINS: Skin[] = [
  {
    key: 'dark-study',
    name: '暗夜书房',
    desc: '默认皮肤：深色卡片、暗色优先，长时间看不刺眼',
    cardBg: '#2A292E',
    textColor: '#BCAEAA',
  },
  {
    key: 'candle-paper',
    name: '烛光纸页',
    desc: '卡片换成烛光米色 #E8C39E，卡片内文字转为深色，全局明显提亮',
    cardBg: '#E8C39E',
    textColor: '#2A2118',
  },
  {
    key: 'parchment',
    name: '旧羊皮',
    desc: '卡片换成旧羊皮 #D8C3A8，比「烛光纸页」柔和一档',
    cardBg: '#D8C3A8',
    textColor: '#2A2118',
  },
];

export function getSkin(key?: string): Skin {
  return SKINS.find((s) => s.key === key) ?? SKINS.find((s) => s.key === DEFAULT_SKIN)!;
}
