type BrandLogoProps = { className?: string; loading?: 'eager' | 'lazy'; variant?: 'original' | 'white' };

/** Official artwork shared by the storefront, authentication and dashboards. */
export function BrandLogo({ className, loading = 'eager', variant = 'original' }: BrandLogoProps) {
  const name = variant === 'white' ? 'rebequi-logo-white' : 'rebequi-logo';
  return (
    <img
      src={`/brand/${name}.webp`}
      srcSet={`/brand/${name}-350.webp 350w, /brand/${name}-700.webp 700w`}
      sizes="(max-width: 640px) 120px, 160px"
      width={342}
      height={112}
      alt="Rebequi"
      className={className}
      loading={loading}
      decoding="async"
    />
  );
}
