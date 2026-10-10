import { useRef, useState } from 'react';
import { User, Image as ImageIcon, BookOpen, History, Trash2, Bot } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Switch } from '@/components/common/Switch';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { putFile, deleteFile, db } from '@/lib/db';
import { uid, compressImage } from '@/lib/utils';
import { humanBytes } from '@/lib/snapshot';
import { collectFileIds } from '@/lib/exportImport';
import { setThemeMode, readThemeMode, resolveTheme, type ThemeMode } from '@/lib/theme';

const THEME_OPTIONS: { key: ThemeMode; label: string; hint: string }[] = [
  { key: 'system', label: '跟随系统', hint: '随系统颜色自动切换' },
  { key: 'day', label: '日间', hint: '白昼书房 · 晨光米面' },
  { key: 'night', label: '夜间', hint: '暗夜书房 · 暖炭墨色' },
];

// 主题皮肤预览色：用真实主题色（页面底 + 卡面），色块区纯色展示，
// 与下方文字区分离——文字永远落在当前主题实色卡面上，不叠色块
const PREVIEW_COLORS: Record<'day' | 'night' | 'scarlet', { bg: string; card: string }> = {
  day:  { bg: '#fdf2e1', card: '#fce8dd' },   // 真实页面底 / 真实卡面
  night: { bg: '#171A1B', card: '#32302B' },
  scarlet: { bg: '#17121A', card: '#312B2F' }, // 猩红书房独立主题的底色 / 紫调卡面
};

/** 主题预览卡：上部色块区（页面底 | 卡面）+ 下部文字区（当前主题实色底，永不叠色块） */
function ThemePreviewCard({
  label,
  hint,
  active,
  onClick,
  swatches,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  /** 色块区内容（任意 JSX，如 双色 / 四色 / 渐变） */
  swatches: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`theme-toggle text-left rounded-card overflow-hidden border-2 transition-all ${
        active ? 'scale-[0.97]' : 'border-bronze/15'
      }`}
    >
      {/* 色块预览区：固定在顶部，纯色展示主题层次 */}
      <div className="h-12 flex overflow-hidden">{swatches}</div>
      {/* 文字区：当前主题实色卡面底 + 主题文字色，保证任何主题下都清晰可读 */}
      <div className="px-2.5 py-1.5 border-t border-bronze/10" style={{ background: 'var(--card-bg)' }}>
        <div
          className="font-mono text-[10px] tracking-wider uppercase font-semibold leading-tight"
          style={{ color: 'var(--paper)' }}
        >
          {label}
        </div>
        <div className="settings-hint text-[9px] leading-tight mt-0.5">
          {hint}
        </div>
      </div>
    </button>
  );
}

export function SettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);
  // v4.5.3：Agent 入口开关（缺省 true = 开启，兼容旧数据）
  const agentEnabled = useAppStore((s) => s.settings.agentEnabled !== false);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name);
  const [signature, setSignature] = useState(profile.signature);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readThemeMode());

  /** Agent 开关：只改入口可见性，不动任何已有数据（会话 / 记忆 / 资料库全部保留） */
  const handleToggleAgent = (next: boolean) => {
    updateSettings({ agentEnabled: next });
    showToast(next ? '已开启 Agent' : '已关闭 Agent · 底栏入口已隐藏', 'success');
  };

  // ── 关于 · 使用说明 ──
  const openGuide = () => {
    showModal({
      title: '使用说明',
      content: (
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 text-[13px] leading-relaxed">
          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">VidaOS 是什么</h4>
            <p className="text-paper">
              你的私密生活记录空间。文章、动态、碎片、灵感、日程、待办、馆藏书籍与照片全部存在
              本机（IndexedDB），不上传任何服务器，可离线使用，也能随时整体导出备份。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">主页</h4>
            <p className="text-paper">
              日历：点任意日期，下方「当日产出」会列出这一天写的文章、动态与灵感；
              点条目可直接跳到对应内容。
            </p>
            <p className="text-paper mt-1">
              日程 / 待办：按天安排日程、管理未完成待办，勾选即完成。
              视图：统计你的文章、动态、灵感与书的字数与条数。
            </p>
            <p className="text-paper mt-1">
              音乐：把本地音频文件拖进来就能听。播放器右上角的
              <span className="text-candle"> 顺序 / 随机 / 单曲 / 播完暂停 </span>
              按钮点一下循环切换四种模式——它只决定「一首自然放完之后怎么办」：
              顺序往下走、随机挑一首、单曲反复这一首，「播完暂停」则是<span className="text-candle">
              这首放完就停下</span>、不自动接下一首。上一首 / 下一首永远按你导入的列表顺序走。
              音量在左侧。
            </p>
            <p className="text-paper mt-1">
              特别说明 <span className="text-candle">单曲循环</span>：
              它只让<span className="text-candle">当前这首</span>反复播；
              你点「下一首」，会<span className="text-candle">真的换到下一首</span>
              （然后由那一首继续循环），而不是把本曲从头重来。
              有些音乐软件是后者，这里是<span className="text-candle">有意</span>采用前者
              —— 点了下一首就该换歌才对。
            </p>
            <p className="text-paper mt-1">
              歌单可以拖动排序：歌单面板右上角点「排序」→ 按住歌名上下拖动 →
              「取消」还原、「完成」保存。自动续播与上一首 / 下一首都按这个顺序走。
              曲目的音频文件要是丢了（例如早前清理过缓存），播放时会自动跳过它，
              并在歌单里标出「文件缺失」，重新导入一次即可。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">便签</h4>
            <p className="text-paper">
              <span className="text-candle">碎片</span>（默认落在这一栏）：
              上方月历选日期（点标题可选年 / 月），下方是当天的<span className="text-candle">极简时间轴</span>——
              点右下角加号记一句，<span className="text-candle">自动记录当下时间</span>，按天存放。
              条目可就地编辑、删除，也能加一个轻量标签。输入区的时间入口可以把它补记到别的时刻
              （今天稍晚、或过去某天）。
            </p>
            <p className="text-paper mt-1">
              <span className="text-candle">时间胶囊</span>：把碎片补记到<span className="text-candle">未来</span>
              （晚于此刻 5 分钟以上），就种下一颗时间胶囊——时间轴下方会出现【时间胶囊】栏目。
              没到开封日时它默认折起来（可以点「点开看看」预览）；到了那天它<span className="text-candle">
              仍然留在栏目里</span>，状态变成「今天开启 / 已开启」并把内容铺开。
            </p>
            <p className="text-paper mt-1">
              灵感：像发消息一样随手记碎片；可加图片、星标（标记值得整理）、分类标签
              （点标签筛选，双击重命名，悬停 × 删除）；一条灵感可一键转为文章；
              按最近修改时间排序，有更新会自动提到最前。
            </p>
            <p className="text-paper mt-1">
              日程：按日期与时间安排事项（时间用应用内的选择器挑，日期走系统日历）；
              填了一个标签栏里还没有的分类，保存后<span className="text-candle">会自动加进日程标签栏</span>。
              待办：随时记下要做的事，回车换行、按住可拖动排序、完成后自动置底；
              「隐藏已完成」这个开关会被记住——切到别的分栏再回来，它仍然保持你上次的选择。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">动态</h4>
            <p className="text-paper">
              生活时间线：发动态支持 Markdown 与图片，可评论、收藏；按日期分组展示，
              完全按设置的时间排序（以前的在下，最近的在上）；编辑时可以同时改发布时间。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">空间</h4>
            <p className="text-paper">
              文章：支持 Markdown 长文与双链笔记。写{' '}
              <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[文章标题]]</code>{' '}
              即可互相链接，页面底部会显示反向链接 / 正向链接；图片点击可放大并保存 / 下载。
            </p>
            <p className="text-paper mt-1">
              图片插入：选图会先上传进底部备选区（上传期间提示「正在上传」，此时图片还没插入，预览看不到）。
              点缩略图可预览大图；点缩略图右下角的插入按钮，图片才会写进正文光标处并生效
              （同一张图可以多次插入）；未插入的备选图保存后仍保留在备选区（下次编辑还能看到），
              但不会出现在文章展示里。
            </p>
            <p className="text-paper mt-1">
              <span className="text-candle">标签栏</span>：在合集与文章之间，自动汇总所有文章用到的标签
              （带使用次数，按用得多的排前面）。点标签即可筛选下面的文章；双击改名会把
              <span className="text-candle">所有用到它的文章一起改</span>；点 × 删除会从所有文章上摘掉
              这个标签（文章本身不删，动手前会先确认）。
            </p>
            <p className="text-paper mt-1">
              合集：把文章归到合集里整理。<span className="text-candle">收藏夹</span>：
              收藏的文章与动态统一查看，每条都标了类型（文章 / 动态）；
              点动态会直接<span className="text-candle">定位并高亮</span>到那一条
              （动态没有独立页面，所以是页内跳转）。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">馆藏 · 书架</h4>
            <p className="text-paper">
              导入本地 txt / md 文本当书读。书架按最近阅读排序，可置顶多本，
              支持给书打标签（点标签筛选，双击重命名、悬停 × 删除），进度条按真实阅读位置走。
            </p>
            <p className="text-paper mt-1">
              <span className="text-candle">目录</span>：导入时会自动拆章节 —— md 取
              1~3 级标题，txt 认「第 X 章 / 回 / 节」「Chapter N」这类标题行，
              也认独占一行的短段。识别不准时，在书的右上角「目录」里可以重命名、
              移除，或在当前阅读位置手动新建一章；书架的书籍菜单里也有「重建目录」。
            </p>
            <p className="text-paper mt-1">
              <span className="text-candle">书签</span>：正文里长按选中一段即可划线 / 高亮 / 复制，
              都收进右上角「书签」，点书签会精确跳到标注所在的那一行。
            </p>
            <p className="text-paper mt-1">
              单本建议 5 万字以内，最长 20 万字；超长正文会自动分批渲染，
              首屏先出来、其余在空闲时补齐。
            </p>
            <p className="text-paper mt-1">
              书架上固定有一本<span className="text-candle">《Agent》</span>——
              这是专门留给 Agent 写的书，你在聊天里遇到喜欢的回答，让它存进去就会
              在书末新起一个章节。它不默认置顶、<span className="text-candle">不可删除</span>，
              在设置里关掉 Agent 开关时也会跟着从书架隐藏（内容一个字都不会少）。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">馆藏 · 相册</h4>
            <p className="text-paper">
              收藏照片的地方。先建一个图集，可一次性上传一组最多 30 张照片、
              写一段文案后发布（也可以不选图、只发文字）；编辑一组时照片可长按拖动排序。
              图集按最近阅读排序，组内照片按发布时间排序。
            </p>
            <p className="text-paper mt-1">
              星标集：置顶在最前面的图集，不可改名或删除。文章、动态、灵感里的图片点开大图后都可以存入星标集，
              相册里的照片也能单独星标；星标集按「文章 / 动态 / 灵感 / 相册」四个标签分类，
              图片带双链，可跳回对应的原文。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">Agent</h4>
            <p className="text-paper">
              多会话聊天助手。底栏是入口，进去可以新建 / 切换会话；
              人设、模型配置在配置页里填（Base URL + API Key + 模型名，模型名可以用「拉取」直接选）。
              每个会话都可以<span className="text-candle">重命名</span>，用不上的可以
              <span className="text-candle">归档</span>（归档后收在列表下方，随时能恢复），
              也能把某个会话导出成 txt。
            </p>
            <p className="text-paper mt-1">
              它能读你的空间文章、动态、灵感、便签、馆藏与收藏夹，也能
              <span className="text-candle">直接写</span>：你说「记一下」「加到待办」它就写，
              说「把 X 改成 Y」它会先给一张改动清单、你点了确认才真的改。
              <span className="text-candle">它没有删除能力</span>——要删什么只能你自己动手，
              它最多告诉你东西在哪儿。
            </p>
            <p className="text-paper mt-1">
              遇到写得好的回答，一句「把这段存进书里」就够了，它会在书架那本
              《Agent》里新起一章。已有内容想改，走上面说的查找替换。
            </p>
            <p className="text-paper mt-1">
              输入框左侧有图片按钮，可以附带图片一起发送；不支持图片识别的模型会自动略过图片。
              手机上键盘弹起时底栏会自动收起，不挡输入框。
            </p>
            <p className="text-paper mt-1">
              这里的开关只控制入口可见性：关掉之后底栏从五格变四格，《Agent》书从书架隐藏，
              但已有的会话、记忆、书里的内容全部保留，随时可以重新打开。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">图片</h4>
            <p className="text-paper">
              上传的图片默认压到<span className="text-candle">长边 2560 / JPEG 0.9</span>
              ——手机满屏和放大看都够清楚。需要原始分辨率的，在上传处点一下
              <span className="text-candle">「存原图」</span>（会记住你的选择，文章 / 动态编辑器、
              灵感、相册里都有这个开关）：原图只用在<span className="text-candle">点开大图、保存图片、导出备份</span>，
              正文、列表、相册网格仍然加载轻量预览图，所以不会因为几张原图就变卡。
              小于 500KB 的图片原样保存，不做任何压缩。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">数据与全局</h4>
            <p className="text-paper">
              数据页：JSON 导出 / 导入（导出范围可选文章、动态、便签、收藏夹、个人资料、
              馆藏·书架、馆藏·相册、Agent 全数据，支持多选），也能导出 Markdown 与 PDF、
              用 WebDAV 云备份、备份到本地文件夹、或重置。
            </p>
            <p className="text-paper mt-1">
              <span className="text-candle">云备份保留最近 5 份</span>：最新一份固定覆盖，
              上一份会在同步前自动改名归档；超出 5 份时自动清理最旧的那份。
              点<span className="text-candle">「云端历史」</span>可以看到云端现有的各份（时间与大小），
              并<span className="text-candle">恢复指定的某一份</span>——
              所以「删掉的内容」虽然不在最新备份里了，但更早的份里还留着，可以从那里找回来
              （注意：被挤出最近 5 份的旧版本会被清理，删掉后不可恢复）。云端的备份是明文 JSON
              （除非你开了加密），本地文件夹备份则按时间戳保留最近 10 份。
            </p>
            <p className="text-paper mt-1">
              外观：可切换主题（跟随系统 / 白昼 / 暗夜 / 猩红书房）。
              顶栏搜索按钮或 ⌘K 打开全局查找替换；页面右上角另有页内查找替换。
              这是 PWA，可「添加到主屏幕」当 App 用。
            </p>
            <p className="text-paper mt-1">
              本页下方的<span className="text-candle">清除缓存</span>只删除正文里已经不再引用的图片文件
              （例如编辑时留下的废弃图），文章、动态、灵感、相册、收藏夹等数据一律不动。
            </p>
            <p className="text-paper mt-1">
              <span className="text-candle">关于备份的几句要紧话</span>：
              ・<span className="text-candle">要完整备份就用 JSON 或本地文件夹快照</span>；
              Markdown / TXT / PDF 是「给人读的导出」，不含馆藏书籍、相册、Agent 会话与音乐，不能当备份。
              ・备份文件里<span className="text-candle">不含</span>你的 WebDAV 密码与模型 API Key
              （那两样只存在本机），所以换设备恢复后需要重新填一次；反过来，导入任何备份都
              <span className="text-candle">不会改动</span>本机已保存的这两样。
              ・恢复时如果个别媒体文件写回失败，界面会明确告诉你失败个数，
              <span className="text-candle">不会把「只恢复了一半」说成成功</span>；再恢复一次通常就能补齐。
            </p>
          </section>
        </div>
      ),
    });
  };

  // ── 关于 · 更新日志（占位，暂为空） ──
  const openChangelog = () => {
    showModal({
      title: '更新日志',
      content: (
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 text-[13px] leading-relaxed">
          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">
              1.0.1 · 真机修复
            </h4>
            <ul className="text-paper space-y-1 list-disc pl-5">
              <li>修「文章编辑器的保存键被手机顶部状态栏挡住」（壳里补上系统栏安全区）。</li>
              <li>修「在合集里新建文章没有自动归入该合集」。</li>
              <li>修手机壳里云备份失败（WebDAV 请求改由原生侧发起，不再被同源策略拦截）。</li>
              <li>修「提示备份保存成功、其实没保存」（WebView 不支持 <code>&lt;a download&gt;</code>，改为真正写盘并告知保存位置）。</li>
            </ul>
          </section>
          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">
              1.0.0 · 首个正式版
            </h4>
            <p className="text-paper">
              你的私密生活记录空间。文章、动态、碎片与时间胶囊、灵感、日程、待办、
              馆藏书籍与相册、Agent 助手，全部数据只存在本机，离线可用、随时整体备份。
              这一版把备份链路做成三条（JSON / 云端 / 本地文件夹，云端保留最近 5 份可回滚），
              图片可选存原图，并支持三套书房主题、全局查找替换与音乐播放。
            </p>
          </section>
          <p className="text-bronze-deep text-[11px] leading-relaxed">
            开发期的逐条改动记录保留在项目文档 PROJECT_MEMORY.md 的变更日志里。
          </p>
        </div>
      ),
    });
  };


  /** 清除缓存：删除正文中已不再引用的图片文件（孤儿 blob），不动任何数据 */
  const clearCache = async () => {
    if (
      !(await useUIStore.getState().confirmDialog(
        '清除未使用的图片缓存？\n\n只会删除正文中已经不再引用的图片文件（例如编辑时留下的废弃图片）。文章、动态、灵感、相册、收藏夹等所有数据都不受影响。',
      ))
    ) {
      return;
    }
    try {
      const st = useAppStore.getState();
      const used = collectFileIds(st);
      const all = await db.files.toArray();
      const orphan = all.filter((f) => !used.has(f.id));
      if (orphan.length === 0) {
        showToast('没有需要清理的缓存', 'info');
        return;
      }
      await db.files.bulkDelete(orphan.map((f) => f.id));
      const freed = orphan.reduce((sum, f) => sum + (f.size ?? 0), 0);
      showToast(`已清理 ${orphan.length} 个无引用图片，释放 ${humanBytes(freed)}`, 'success');
    } catch {
      showToast('清理缓存失败，请稍后重试', 'error');
    }
  };

  // 猩红书房：独立外观主题（scarlet）；兼容旧数据（夜间 × 深紫预设 × 无自定义图）
  const isScarletStudy =
    themeMode === 'scarlet' ||
    (resolveTheme(themeMode) === 'night' &&
      !profile.backgroundFileId &&
      profile.backgroundPreset === 'deep');

  const handleTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeModeState(mode);
    // 退出「猩红书房」：旧数据的深紫预设一并清掉，回到按主题实色方案
    if (profile.backgroundPreset === 'deep') {
      updateProfile({ backgroundPreset: 'none' });
    }
    const label = THEME_OPTIONS.find((o) => o.key === mode)?.label ?? '';
    showToast(`已切换：${label}`, 'success');
  };

  const applyScarletStudy = () => {
    // 猩红书房是独立主题：不再依赖「夜间 × 深紫预设」组合配方
    setThemeMode('scarlet');
    setThemeModeState('scarlet');
    updateProfile({ backgroundPreset: 'none', backgroundFileId: undefined });
    showToast('已切换：猩红书房 · 特殊书房主题', 'success');
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImage(f, 512, 0.85);
    const id = uid('avatar_');
    // 删除旧头像
    if (profile.avatarId) await deleteFile(profile.avatarId);
    await putFile({ id, blob: compressed, mime: compressed.type, name: f.name, size: compressed.size });
    updateProfile({ avatarId: id });
    showToast('头像已更新', 'success');
    e.target.value = '';
  };

  const saveName = () => {
    // v4.7.11：以前「名字空着」或「没改动」点保存都毫无反馈，看不出是坏了还是没必要保存
    if (!name.trim()) {
      showToast('名字不能为空', 'error');
      return;
    }
    if (name.trim() === profile.name) {
      showToast('名字没有改动', 'info');
      return;
    }
    updateProfile({ name: name.trim() });
    showToast('已保存', 'success');
  };

  const saveSignature = () => {
    if (signature === profile.signature) {
      showToast('签名没有改动', 'info');
      return;
    }
    updateProfile({ signature });
    showToast('已保存', 'success');
  };

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto pb-6 space-y-4">
        {/* 头像 */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} strokeWidth={1.4} className="text-bronze" />
            <h3 className="font-serif text-headline text-lg">头像</h3>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full overflow-hidden border border-bronze/20 flex items-center justify-center"
              style={{ background: 'var(--wood)' }}
            >
              {profile.avatarId ? (
                <MediaImage fileId={profile.avatarId} className="w-full h-full object-cover" />
              ) : (
                <User size={28} strokeWidth={1.2} className="text-bronze" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => avatarInputRef.current?.click()} className="btn-ghost">
                <ImageIcon size={13} strokeWidth={1.5} /> 更换头像
              </button>
              {profile.avatarId && (
                <button
                  onClick={async () => {
                    if (profile.avatarId) await deleteFile(profile.avatarId);
                    updateProfile({ avatarId: undefined });
                    showToast('已移除头像', 'success');
                  }}
                  className="btn-text wine"
                >
                  移除头像
                </button>
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
          </div>
        </Card>

        {/* 名字 + 签名 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-4">个人信息</h3>
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase block mb-1.5">
                name
              </label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-bronze/8 rounded-card text-paper font-serif outline-none focus:bg-bronze/15 transition"
                />
                <button onClick={saveName} className="btn-primary" style={{ padding: '7px 14px' }}>
                  保存
                </button>
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase block mb-1.5">
                signature · 个性签名
              </label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={3}
                placeholder="在安静的日子里，慢慢写下自己的生活。"
                className="w-full px-3 py-2 bg-bronze/8 rounded-card text-paper font-serif text-sm outline-none focus:bg-bronze/15 transition resize-none"
                style={{ lineHeight: 1.85 }}
              />
              <button onClick={saveSignature} className="btn-primary mt-2" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                保存
              </button>
            </div>

          </div>
        </Card>

        {/* Agent（v4.5.4：独立成卡，不再寄居在「个人信息」里） */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="w-9 h-9 flex items-center justify-center rounded-card flex-none"
              style={{ background: 'var(--agent-accent-soft)' }}
            >
              <Bot size={17} strokeWidth={1.5} style={{ color: 'var(--agent-accent)' }} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-headline text-lg leading-tight">Agent</h3>
              <p className="font-sans text-bronze text-xs leading-relaxed mt-1.5">
                {agentEnabled
                  ? '已开启。底栏保留 Agent 入口，会话、人设、资料库与记忆馆都可用；书架上那本《Agent》也会正常显示。'
                  : '已关闭。底栏的 Agent 入口会隐藏、书架上的《Agent》也会一起隐藏，底栏自动重排为四个图标。已有的会话、记忆与书里的内容都不会被删除，随时可以重新打开。'}
              </p>
            </div>
            <Switch
              checked={agentEnabled}
              onChange={handleToggleAgent}
              label="Agent 入口"
            />
          </div>
        </Card>

        {/* 外观 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-1">外观</h3>
          <p className="font-sans text-bronze-deep text-xs mb-3 flex items-center flex-wrap gap-1.5">
            <span>主题皮肤。当前：</span>
            <span
              className="font-serif font-medium px-2 py-0.5 rounded-pill"
              style={{
                color: 'var(--paper)',
                background: 'rgb(var(--amber-rgb) / 0.18)',
                border: '1px solid rgb(var(--amber-rgb) / 0.4)',
              }}
            >
              {isScarletStudy
                ? '猩红书房'
                : resolveTheme(themeMode) === 'day'
                  ? '白昼书房'
                  : '暗夜书房'}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.key;
              return (
                <ThemePreviewCard
                  key={opt.key}
                  label={opt.label}
                  hint={opt.hint}
                  active={active}
                  onClick={() => handleTheme(opt.key)}
                  swatches={
                    opt.key === 'system' ? (
                      // 跟随系统：左半暗夜书房（bg | card）、右半白昼书房（bg | card）
                      <>
                        <span className="flex-1" style={{ background: PREVIEW_COLORS.night.bg }} />
                        <span
                          className="flex-1"
                          style={{ background: PREVIEW_COLORS.night.card, borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                        />
                        <span
                          className="flex-1"
                          style={{ background: PREVIEW_COLORS.day.bg, borderLeft: '1px solid rgba(87,85,39,0.12)' }}
                        />
                        <span
                          className="flex-1"
                          style={{ background: PREVIEW_COLORS.day.card, borderLeft: '1px solid rgba(87,85,39,0.12)' }}
                        />
                      </>
                    ) : (
                      <>
                        <span className="flex-1" style={{ background: PREVIEW_COLORS[opt.key].bg }} />
                        <span
                          className="flex-1"
                          style={{
                            background: PREVIEW_COLORS[opt.key].card,
                            borderLeft:
                              opt.key === 'day'
                                ? '1px solid rgba(87,85,39,0.12)'
                                : '1px solid rgba(255,255,255,0.08)',
                          }}
                        />
                      </>
                    )
                  }
                />
              );
            })}
          </div>
          {/* 猩红书房：独立外观主题（不限于夜间） */}
          <ThemePreviewCard
            label="猩红书房 · scarlet study"
            hint="特殊书房主题"
            active={isScarletStudy}
            onClick={applyScarletStudy}
            swatches={
              <span
                className="flex-1"
                style={{ background: 'linear-gradient(135deg, #0F0A14 0%, #341915 70%, #6A080E 100%)' }}
              />
            }
          />
        </Card>

        {/* 关于：使用说明 + 更新日志 + 清除缓存 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-3">关于</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={openGuide}
              className="flex items-center justify-center gap-1.5 px-2 py-3 rounded-card border border-bronze/15 text-[13px] font-serif text-paper hover:border-wine/50 hover:bg-wine/5 transition-all"
            >
              <BookOpen size={14} strokeWidth={1.5} className="text-wine-light flex-none" />
              使用说明
            </button>
            <button
              onClick={openChangelog}
              className="flex items-center justify-center gap-1.5 px-2 py-3 rounded-card border border-bronze/15 text-[13px] font-serif text-paper hover:border-wine/50 hover:bg-wine/5 transition-all"
            >
              <History size={14} strokeWidth={1.5} className="text-wine-light flex-none" />
              更新日志
            </button>
            <button
              onClick={() => void clearCache()}
              className="flex items-center justify-center gap-1.5 px-2 py-3 rounded-card border border-bronze/15 text-[13px] font-serif text-paper hover:border-wine/50 hover:bg-wine/5 transition-all"
            >
              <Trash2 size={14} strokeWidth={1.5} className="text-wine-light flex-none" />
              清除缓存
            </button>
          </div>
        </Card>

        {/* 品牌栏 */}
        <Card className="p-5 sm:p-6 text-center">
          <p className="font-serif text-headline text-lg tracking-widest">VidaOS</p>
          <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mt-1">
            v1.0.1 · night study
          </p>
          <p className="font-sans text-bronze text-xs mt-3 leading-relaxed">
            你的私密生活记录空间。
            <br />
            所有数据保存在本地，不上传任何服务器。
          </p>
        </Card>
      </div>
    </div>
  );
}
