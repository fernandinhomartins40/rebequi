export const modalOverlayClassName =
  'fixed inset-0 z-50 bg-slate-950/58 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

export const modalContentBaseClassName =
  'app-scrollbar fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-[1.5rem] border border-border/70 bg-background/95 p-4 shadow-[0_32px_80px_-44px_rgba(15,23,42,0.45)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-6';

export const modalCloseButtonClassName =
  'absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white/90 text-muted-foreground shadow-sm ring-offset-background transition-colors hover:bg-white hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none';

export const modalSurfaceClassName =
  'flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-[1.75rem] border-[#eadfba] bg-[linear-gradient(180deg,rgba(255,254,248,0.98),rgba(255,255,255,0.98))] p-0 shadow-[0_32px_80px_-44px_rgba(15,23,42,0.34)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:p-0';

export const modalPanelClassName =
  'rounded-[1.5rem] border border-[#eadfba]/80 bg-white/92 p-4 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.18)] sm:p-5';

export const modalSizeClassNames = {
  sm: 'sm:max-w-lg',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-5xl',
  '3xl': 'sm:max-w-6xl',
  full: 'sm:max-w-[calc(100vw-3rem)]',
} as const;
