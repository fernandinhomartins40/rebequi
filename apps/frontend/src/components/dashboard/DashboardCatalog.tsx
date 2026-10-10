import { useState, type ReactNode } from "react";
import { ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="dashboard-thumbnail">
    {src && !failed ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> :
      <span role="img" aria-label={`Sem foto: ${alt}`}><ImageOff size={21} /><small>Sem foto</small></span>}
  </div>;
}

/** The same record becomes an aligned row on desktop and a compact card on mobile. */
export function DashboardCatalogRecord({ image, title, subtitle, price, stock, status, actions }: {
  image: ReactNode; title: ReactNode; subtitle?: ReactNode; price: ReactNode;
  stock: ReactNode; status: ReactNode; actions: ReactNode;
}) {
  return <article className="dashboard-catalog-record">
    <div className="dashboard-catalog-identity">{image}<div><h3>{title}</h3><div className="dashboard-catalog-meta">{subtitle}</div></div></div>
    <div className="dashboard-catalog-price"><small>Preço</small>{price}</div>
    <div className="dashboard-catalog-stock"><small>Estoque</small>{stock}</div>
    <div className="dashboard-catalog-status">{status}</div>
    <div className="dashboard-catalog-actions">{actions}</div>
  </article>;
}

export function DashboardPagination({ page, total, pageSize, onChange, busy = false }: {
  page: number; total: number; pageSize: number; onChange: (page: number) => void; busy?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav className="dashboard-pagination" aria-label="Páginas da lista">
    <p role="status">{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}` : "0 resultados"}</p>
    <div><Button type="button" variant="outline" size="sm" disabled={page <= 1 || busy} onClick={() => onChange(page - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></Button>
      <span>Página {page} de {pages}</span>
      <Button type="button" variant="outline" size="sm" disabled={page >= pages || busy} onClick={() => onChange(page + 1)} aria-label="Próxima página"><ChevronRight size={16} /></Button></div>
  </nav>;
}
