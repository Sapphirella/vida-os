// 全局背景层：纯色 + 烛光晕染 + 噪点
export function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      {/* 主体深色 */}
      <div className="absolute inset-0 bg-ink" />

      {/* 烛光晕染：左下 */}
      <div
        className="absolute bottom-0 left-0 w-[60vw] h-[60vh] opacity-60 animate-breathe"
        style={{
          background:
            'radial-gradient(ellipse at bottom left, rgba(232, 195, 158, 0.10) 0%, rgba(232, 195, 158, 0.03) 30%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      {/* 烛光晕染：右下 */}
      <div
        className="absolute bottom-0 right-0 w-[60vw] h-[60vh] opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at bottom right, rgba(106, 8, 14, 0.12) 0%, rgba(106, 8, 14, 0.03) 30%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      {/* 顶部木色光 */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(52, 25, 21, 0.25) 0%, transparent 60%)',
          filter: 'blur(30px)',
        }}
      />

      {/* 极淡噪点纹理（增加质感） */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}
