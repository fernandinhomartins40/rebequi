type BrandLogoProps = { className?: string; loading?: 'eager' | 'lazy' };

/** Official artwork shared by the storefront, authentication and dashboards. */
export function BrandLogo({ className, loading = 'eager' }: BrandLogoProps) {
  return (
    <img
      src="/brand/rebequi-logo.webp"
      srcSet="/brand/rebequi-logo-350.webp 350w, /brand/rebequi-logo-700.webp 700w"
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
