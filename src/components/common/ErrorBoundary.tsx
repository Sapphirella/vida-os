// 错误边界：任何渲染期异常都不再变成白屏，而是给出可操作的恢复界面。
//
// 用法：
//   <ErrorBoundary variant="fullscreen">…整个应用…</ErrorBoundary>   ← 最外层兜底
//   <ErrorBoundary variant="inline" resetKey={pathname}>…页面…</ErrorBoundary>
// resetKey 变化（例如切换路由）时会自动清除错误状态，避免一直卡在错误页。
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 该值变化时自动复位（通常传 location.pathname） */
  resetKey?: string;
  /** fullscreen：整屏兜底（最外层）；inline：嵌在页面区域内（单个路由） */
  variant?: 'fullscreen' | 'inline';
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string;
  copied: boolean;
  copyFailed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    componentStack: '',
    copied: false,
    copyFailed: false,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 同时留一份到控制台，便于排查
    console.error('[VidaOS] 渲染出错：', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? '' });
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  private reset = () => {
    this.setState({ error: null, componentStack: '', copied: false, copyFailed: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.hash = '#/desk';
    this.reset();
  };

  private buildReport = () => {
    const { error, componentStack } = this.state;
    return [
      'VidaOS 错误报告',
      `时间：${new Date().toISOString()}`,
      `地址：${window.location.href}`,
      `错误：${error?.name ?? 'Error'}: ${error?.message ?? '(无信息)'}`,
      '',
      '— 堆栈 —',
      error?.stack ?? '(无)',
      '',
      '— 组件栈 —',
      componentStack || '(无)',
    ].join('\n');
  };

  private handleCopy = async () => {
    const text = this.buildReport();
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true, copyFailed: false });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // 剪贴板不可用（如非 HTTPS 或未授权）时退化为控制台输出，信息不至于丢失
      console.error(text);
      this.setState({ copyFailed: true });
      setTimeout(() => this.setState({ copyFailed: false }), 2500);
    }
  };

  render() {
    const { error, componentStack, copied, copyFailed } = this.state;
    if (!error) return this.props.children;

    const fullscreen = (this.props.variant ?? 'fullscreen') === 'fullscreen';

    const card = (
      <div
        className={`w-full max-w-xl glass-card glass-card-elevated p-6 sm:p-8 ${
          fullscreen ? '' : 'my-6'
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--wine-light)', boxShadow: '0 0 10px var(--wine-light)' }}
          />
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            something went wrong
          </p>
        </div>

        <h1 className="font-serif text-moon text-2xl leading-snug">这一页出了点问题</h1>
        <p className="font-serif text-bronze text-sm mt-2 leading-relaxed">
          界面渲染时遇到了错误。你的内容仍然保存在本地，不会因此丢失。
          可以点「重试」再试一次，或回到桌面继续使用其它部分。
        </p>

        <div className="mt-5 rounded-card border border-bronze/15 bg-bronze/5 px-3 py-2.5">
          <p className="font-mono text-[11px] text-wine-light break-words">
            {error.message || String(error)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button onClick={this.reset} className="btn-primary">
            重试
          </button>
          <button onClick={this.handleHome} className="btn-ghost">
            回到桌面
          </button>
          <button onClick={this.handleReload} className="btn-ghost">
            重新加载页面
          </button>
          <button onClick={this.handleCopy} className="btn-text ml-auto">
            {copied ? '已复制 ✓' : copyFailed ? '已输出到控制台' : '复制错误详情'}
          </button>
        </div>

        <details className="mt-5 group">
          <summary className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase cursor-pointer hover:text-bronze transition-colors">
            技术详情
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded-card p-3 font-mono text-[10px] leading-relaxed text-bronze whitespace-pre-wrap break-words"
            style={{ background: 'rgba(20, 18, 22, 0.65)' }}
          >
            {error.stack || '(无堆栈)'}
            {componentStack ? `\n\n— 组件栈 —${componentStack}` : ''}
          </pre>
        </details>
      </div>
    );

    if (!fullscreen) {
      return (
        <div className="px-4 sm:px-6 flex items-center justify-center min-h-[60vh]">{card}</div>
      );
    }

    return (
      <div
        className="fixed inset-0 z-[100] overflow-y-auto"
        style={{ background: 'var(--ink)' }}
      >
        <div className="min-h-full flex items-center justify-center p-4 sm:p-6">{card}</div>
      </div>
    );
  }
}
