/** ランクごとのシンボルロゴ (SVG)
 * モチーフは日本史/中国神話 — 鏃 → 銅鐸 → 三種の神器 → 龍 → 四神 → 鳳凰
 * ランクが上がるほど線数が増え、装飾が荘厳になる。
 * すべて viewBox 0 0 32 32、currentColor で着色。
 */

import type { IconKey } from "@/lib/ranks";

interface Props {
  iconKey: IconKey;
  className?: string;
  size?: number;
}

export function RankIcon({ iconKey, className = "", size = 28 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    className,
  } as const;

  const stroke = "currentColor";
  const fill = "currentColor";

  switch (iconKey) {
    // =========================================================
    // 1. 鏃 (やじり) — Iron — 最も簡素な鉄器
    // =========================================================
    case "yajiri":
      return (
        <svg {...common} fill={fill}>
          {/* 三角の鏃 */}
          <path d="M16 4 L22 16 L18 16 L18 28 L14 28 L14 16 L10 16 Z" />
          {/* 中央の溝 */}
          <path d="M16 8 L16 16" stroke="white" strokeWidth={1} opacity={0.5} />
        </svg>
      );

    // =========================================================
    // 2. 銅鐸 (どうたく) — Bronze — 弥生の祭器
    // =========================================================
    case "dotaku":
      return (
        <svg {...common} fill={fill}>
          {/* 上部の吊り環 */}
          <path
            d="M14 4 Q16 2 18 4"
            stroke={stroke}
            strokeWidth={1.5}
            fill="none"
          />
          <circle cx="16" cy="5" r="0.8" />
          {/* 鐘本体 (台形) */}
          <path d="M12 7 L20 7 L22 27 L10 27 Z" />
          {/* 横帯 (装飾) */}
          <line
            x1="11"
            y1="13"
            x2="21"
            y2="13"
            stroke="white"
            strokeWidth={0.7}
            opacity={0.6}
          />
          <line
            x1="11"
            y1="19"
            x2="21"
            y2="19"
            stroke="white"
            strokeWidth={0.7}
            opacity={0.6}
          />
          {/* 中央の文様 */}
          <path
            d="M14 15 L18 15 M14 17 L18 17"
            stroke="white"
            strokeWidth={0.5}
            opacity={0.5}
          />
        </svg>
      );

    // =========================================================
    // 3. 八咫鏡 (やたのかがみ) — Silver — 三種の神器・鏡
    // =========================================================
    case "kagami":
      return (
        <svg {...common} fill={fill}>
          {/* 円形の鏡面 */}
          <circle cx="16" cy="13" r="9" />
          {/* 鏡の縁取り (銀の輪) */}
          <circle
            cx="16"
            cy="13"
            r="9"
            fill="none"
            stroke="white"
            strokeWidth={0.8}
            opacity={0.7}
          />
          {/* 中央の八咫紋 (光の四方放射) */}
          <path
            d="M16 7 L16 19 M10 13 L22 13 M11.5 8.5 L20.5 17.5 M11.5 17.5 L20.5 8.5"
            stroke="white"
            strokeWidth={0.6}
            opacity={0.5}
          />
          <circle cx="16" cy="13" r="1.5" fill="white" opacity={0.85} />
          {/* 台座 */}
          <path d="M14 22 L18 22 L19 24 L13 24 Z" />
          <rect x="12" y="24" width="8" height="2" rx="0.5" />
        </svg>
      );

    // =========================================================
    // 4. 八尺瓊勾玉 (やさかにのまがたま) — Gold — 三種の神器・玉
    // 大胆な巴形 + 大きな穿孔 + 翡翠の輝き
    // =========================================================
    case "magatama":
      return (
        <svg {...common}>
          {/* 勾玉本体 (viewBox の大半を占める大きな巴形) */}
          <path
            d="
              M 24 4
              C 12 4, 3 13, 3 21
              C 3 28, 11 31, 17 30
              C 26 28, 30 21, 28 14
              C 26 9, 22 7, 18 9
              C 14 11, 13 16, 16 19
              C 19 22, 23 19, 22 16
              C 21 14, 19 14, 18 15
              Z
            "
            fill={fill}
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          {/* 上部の大きな穿孔 (紐通し) */}
          <circle
            cx="22"
            cy="8"
            r="3"
            fill="white"
            stroke="currentColor"
            strokeWidth={1}
          />
          <circle cx="22" cy="8" r="1.5" fill={fill} opacity={0.85} />
          {/* 翡翠の輝き ハイライト (左上の光) */}
          <ellipse
            cx="11"
            cy="14"
            rx="3"
            ry="5"
            fill="white"
            opacity={0.35}
            transform="rotate(-30 11 14)"
          />
          <circle cx="9" cy="11" r="1.2" fill="white" opacity={0.75} />
          {/* 内側の弧装飾 */}
          <path
            d="M 9 22 Q 14 20, 18 23"
            stroke="white"
            strokeWidth={0.7}
            fill="none"
            opacity={0.45}
          />
        </svg>
      );

    // =========================================================
    // 5. 草薙剣 (くさなぎのつるぎ) — Ruby — 三種の神器・剣
    // =========================================================
    case "kusanagi":
      return (
        <svg {...common} fill={fill}>
          {/* 刀身 */}
          <path d="M16 2 L17.5 4 L17.5 19 L14.5 19 L14.5 4 Z" />
          {/* 刃の中心線 */}
          <line
            x1="16"
            y1="4"
            x2="16"
            y2="19"
            stroke="white"
            strokeWidth={0.5}
            opacity={0.7}
          />
          {/* 鍔 */}
          <rect x="10" y="19" width="12" height="2" rx="0.5" />
          {/* 柄 */}
          <rect x="14.5" y="21" width="3" height="6" />
          {/* 柄頭 */}
          <circle cx="16" cy="29" r="1.5" />
          {/* 柄の編み目 */}
          <line
            x1="14.5"
            y1="23.5"
            x2="17.5"
            y2="23.5"
            stroke="white"
            strokeWidth={0.4}
            opacity={0.5}
          />
          <line
            x1="14.5"
            y1="25.5"
            x2="17.5"
            y2="25.5"
            stroke="white"
            strokeWidth={0.4}
            opacity={0.5}
          />
          {/* 雲をなびかせる装飾 (草薙=雲を薙ぐ) */}
          <path
            d="M9 7 Q12 5, 14 8"
            stroke={stroke}
            strokeWidth={0.8}
            fill="none"
            opacity={0.6}
          />
          <path
            d="M23 7 Q20 5, 18 8"
            stroke={stroke}
            strokeWidth={0.8}
            fill="none"
            opacity={0.6}
          />
        </svg>
      );

    // =========================================================
    // 6. 水晶玉 (すいしょう) — Diamond — 神器の集約・八角
    // =========================================================
    case "suishou":
      return (
        <svg {...common} fill={fill}>
          {/* 八角形の宝玉 */}
          <path d="M11 4 L21 4 L27 10 L27 22 L21 28 L11 28 L5 22 L5 10 Z" />
          {/* 内部のカットライン */}
          <path
            d="M11 4 L21 28 M21 4 L11 28 M5 10 L27 22 M27 10 L5 22 M5 16 L27 16 M16 4 L16 28"
            stroke="white"
            strokeWidth={0.5}
            fill="none"
            opacity={0.5}
          />
          {/* 中央の輝点 */}
          <circle cx="16" cy="16" r="2" fill="white" opacity={0.8} />
        </svg>
      );

    // =========================================================
    // 7. 黄龍 (こうりゅう) — Master — 五爪の龍
    // =========================================================
    case "ryu":
      return (
        <svg {...common} stroke={stroke} strokeWidth={1.6} fill="none" strokeLinejoin="round" strokeLinecap="round">
          {/* 龍の蛇行する身体 — S 字 */}
          <path d="M3 22 Q5 14, 11 14 Q14 14, 13 18 Q12 22, 16 22 Q20 22, 19 17 Q18 14, 22 14 Q26 14, 27 19" />
          {/* 龍の頭 */}
          <path
            d="M27 19 Q29 18, 29 16 Q29 13, 26 13 Q25 13, 25 14"
            fill={fill}
          />
          {/* 鬚 */}
          <path d="M28 17 L30 16 M28 18 L30 19" strokeWidth={1} />
          {/* 鋭い目 */}
          <circle cx="27.5" cy="15" r="0.6" fill="white" stroke="none" />
          {/* 背の鱗 (ジグザグ) */}
          <path
            d="M5 20 L6 18 L7 21 L8 19 L9 22 L10 19"
            strokeWidth={0.9}
          />
          <path
            d="M14 18 L15 16 L16 19 L17 16 L18 18"
            strokeWidth={0.9}
          />
          <path
            d="M22 16 L23 14 L24 17 L25 14 L26 16"
            strokeWidth={0.9}
          />
          {/* 雲 (龍の足元) */}
          <path
            d="M3 26 Q5 24, 7 26 Q9 24, 11 26"
            strokeWidth={0.9}
            opacity={0.6}
          />
          <path
            d="M15 27 Q18 25, 21 27 Q24 25, 27 27"
            strokeWidth={0.9}
            opacity={0.6}
          />
        </svg>
      );

    // =========================================================
    // 8. 朱雀 (すざく) — Crown I — 南方の霊鳥
    // =========================================================
    case "suzaku":
      return (
        <svg {...common} fill={fill} stroke={stroke} strokeWidth={0.5}>
          {/* 翼を広げた鳥の本体 */}
          <path d="M16 8 L20 11 L24 12 L26 14 L23 14 L25 17 L21 15 L20 17 L19 14 L16 16 L13 14 L12 17 L11 15 L7 17 L9 14 L6 14 L8 12 L12 11 Z" />
          {/* 頭の冠羽 */}
          <path d="M16 8 L14 4 L16 6 L18 4 Z" />
          {/* 尾羽 (3 本) */}
          <path
            d="M16 16 L13 26 L14 22 L11 28"
            stroke={stroke}
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M16 16 L16 26 L16 28"
            stroke={stroke}
            strokeWidth={1.4}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M16 16 L19 26 L18 22 L21 28"
            stroke={stroke}
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
          {/* 翼の羽紋 */}
          <path
            d="M11 13 L13 14 M21 13 L19 14"
            stroke="white"
            strokeWidth={0.5}
            opacity={0.6}
          />
          {/* 目 */}
          <circle cx="16" cy="10" r="0.7" fill="white" stroke="none" />
        </svg>
      );

    // =========================================================
    // 9. 麒麟 (きりん) — Crown II — 瑞獣
    // =========================================================
    case "kirin":
      return (
        <svg {...common} fill={fill} stroke={stroke} strokeWidth={0.6}>
          {/* 体 (馬体) */}
          <path d="M9 18 Q9 15, 12 15 L20 15 Q23 15, 23 18 L23 22 L21 22 L21 24 L19 24 L19 22 L13 22 L13 24 L11 24 L11 22 L9 22 Z" />
          {/* 首と頭 */}
          <path d="M9 15 Q7 13, 7 10 Q7 8, 9 8 L11 8 Q11 11, 10 13 L9 15" />
          {/* 一本角 */}
          <path
            d="M9 8 L8 4"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          {/* 角の枝 */}
          <path
            d="M8 5 L7 4 M8 5 L9 4"
            stroke={stroke}
            strokeWidth={1}
            strokeLinecap="round"
          />
          {/* たてがみ (炎のように) */}
          <path
            d="M12 14 L11 11 L13 13 L13 10 L15 13 L15 11 L17 13"
            stroke={stroke}
            strokeWidth={0.9}
            fill="none"
          />
          {/* 尾 */}
          <path
            d="M23 18 Q26 16, 26 12 Q26 10, 24 10"
            stroke={stroke}
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
          {/* 鱗の文様 */}
          <path
            d="M14 17 L14 19 M16 17 L16 19 M18 17 L18 19 M20 17 L20 19"
            stroke="white"
            strokeWidth={0.4}
            opacity={0.5}
          />
          {/* 目 */}
          <circle cx="9" cy="10.5" r="0.5" fill="white" stroke="none" />
        </svg>
      );

    // =========================================================
    // 10. 玄武 (げんぶ) — Crown III — 北方の亀蛇
    // =========================================================
    case "genbu":
      return (
        <svg {...common} fill={fill} stroke={stroke} strokeWidth={0.6}>
          {/* 亀甲 (六角形のドーム) */}
          <ellipse cx="16" cy="20" rx="11" ry="6" />
          {/* 亀甲の六角形パターン */}
          <path
            d="M11 18 L14 16 L17 18 L17 22 L14 24 L11 22 Z M14 16 L17 14 L20 16 L20 18 L17 18 M17 18 L20 16 L20 18 L17 18 M17 22 L20 22 L20 18 M21 18 L21 22"
            stroke="white"
            strokeWidth={0.5}
            fill="none"
            opacity={0.65}
          />
          {/* 亀の頭 */}
          <ellipse cx="6" cy="20" rx="2" ry="1.6" />
          {/* 亀の足 */}
          <ellipse cx="9" cy="26" rx="1.5" ry="1" />
          <ellipse cx="23" cy="26" rx="1.5" ry="1" />
          <ellipse cx="25" cy="22" rx="1.3" ry="0.9" />
          {/* 蛇 (甲羅の上で巻いている) */}
          <path
            d="M9 14 Q11 8, 16 10 Q21 12, 23 8 Q25 4, 27 7"
            stroke={stroke}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          {/* 蛇の頭 */}
          <circle cx="27" cy="7" r="1.3" />
          {/* 蛇の目 (光る) */}
          <circle cx="27.5" cy="6.5" r="0.4" fill="white" stroke="none" />
          {/* 亀の目 */}
          <circle cx="5" cy="19.5" r="0.4" fill="white" stroke="none" />
        </svg>
      );

    // =========================================================
    // 11. 鳳凰 (ほうおう) — Crown Max — 帝の象徴・最高位
    // =========================================================
    case "houou":
      return (
        <svg {...common} fill={fill} stroke={stroke} strokeWidth={0.5}>
          {/* 頭の冠羽 (3 本) */}
          <path d="M16 5 L14 1 L16 3 L17 0 L17.5 3 L19 1 L18 5 Z" />
          {/* 頭部 */}
          <ellipse cx="16" cy="7" rx="2" ry="2.2" />
          {/* 嘴 */}
          <path d="M14 8 L11 8 L14 9.5 Z" />
          {/* 翼 (左) */}
          <path d="M14 9 L8 8 L4 11 L7 12 L3 14 L7 14 L5 17 L9 16 L8 19 L13 16 L11 13 L14 13 Z" />
          {/* 翼 (右) */}
          <path d="M18 9 L24 8 L28 11 L25 12 L29 14 L25 14 L27 17 L23 16 L24 19 L19 16 L21 13 L18 13 Z" />
          {/* 体 */}
          <path d="M14 13 L18 13 L18 19 L14 19 Z" />
          {/* 長い尾羽 (5 本) */}
          <path
            d="M16 19 L13 30"
            stroke={stroke}
            strokeWidth={1.2}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M16 19 L11 28"
            stroke={stroke}
            strokeWidth={1.0}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M16 19 L16 30"
            stroke={stroke}
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M16 19 L21 28"
            stroke={stroke}
            strokeWidth={1.0}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M16 19 L19 30"
            stroke={stroke}
            strokeWidth={1.2}
            strokeLinecap="round"
            fill="none"
          />
          {/* 尾羽の宝玉文様 */}
          <circle cx="13" cy="26" r="0.6" fill="white" stroke="none" />
          <circle cx="16" cy="27" r="0.7" fill="white" stroke="none" />
          <circle cx="19" cy="26" r="0.6" fill="white" stroke="none" />
          {/* 翼の羽紋 (光る) */}
          <path
            d="M6 12 L9 13 M26 12 L23 13 M5 14 L8 15 M27 14 L24 15"
            stroke="white"
            strokeWidth={0.4}
            opacity={0.7}
          />
          {/* 目 (鋭い) */}
          <circle cx="15.5" cy="6.5" r="0.5" fill="white" stroke="none" />
          {/* 紫雲 (鳳凰の足元、Crown Max のみ) */}
          <path
            d="M10 22 Q12 21, 14 22 M18 22 Q20 21, 22 22"
            stroke={stroke}
            strokeWidth={0.6}
            fill="none"
            opacity={0.5}
          />
        </svg>
      );
  }
}
