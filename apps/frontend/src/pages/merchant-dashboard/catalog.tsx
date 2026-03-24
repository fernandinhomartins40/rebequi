import { BarChart3, Package, PackageSearch, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ADMIN_BASE_PATH } from './config';
import { useMerchantDashboardOutlet } from './data';
import { SectionLeadCard, StatCard, SummarySurface } from './components';

export function MerchantDashboardCatalog() {
  const { productSummary, promotionalProducts, newProducts, categorySummary, products, categories } =
    useMerchantDashboardOutlet();

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Catalogo persistido"
        title="Pagina exclusiva do catalogo"
        description="Aqui fica o recorte operacional do catalogo real, separado do restante do admin e apoiado pelos dados persistidos do backend."
        tone="yellow"
        actions={
          <>
            <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to={`${ADMIN_BASE_PATH}/visao-geral`}>Voltar ao resumo</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={`${ADMIN_BASE_PATH}/estabilidade`}>Ver base estavel</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="border-[#dfe6f7] bg-white/90 shadow-[0_24px_60px_-44px_rgba(37,99,235,0.28)]">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit border-black/10 bg-white text-foreground">
              Snapshot do banco
            </Badge>
            <div>
              <CardTitle className="text-2xl">Leitura real do catalogo</CardTitle>
              <CardDescription>Produtos, ofertas e novidades retornados da API publica da aplicacao.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummarySurface
                value={`${categorySummary?.total ?? 0}`}
                label="Categorias"
                description="consultadas pela rota publica"
              />
              <SummarySurface
                value={`${promotionalProducts.length}`}
                label="Ofertas"
                description="marcadas como promocionais"
              />
              <SummarySurface value={`${newProducts.length}`} label="Novidades" description="sinalizadas no catalogo" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Produtos em destaque nesta base</p>
              <div className="grid gap-3">
                {products.slice(0, 4).map((product) => (
                  <div key={product.id} className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category?.name ?? 'Sem categoria'} | estoque {product.stock}
                        </p>
                      </div>
                      <Badge className="border-none bg-secondary text-secondary-foreground">
                        R$ {product.price.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {products.length === 0 ? (
                  <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
                    Nenhum produto ativo retornado pela API.
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#d8e4fb] bg-[linear-gradient(160deg,rgba(239,246,255,0.94),rgba(255,255,255,0.96)_52%,rgba(255,248,214,0.82)_100%)] shadow-[0_28px_75px_-48px_rgba(37,99,235,0.34)]">
          <CardHeader className="space-y-3">
            <Badge className="w-fit border-none bg-accent text-accent-foreground">Mapa de categorias</Badge>
            <div>
              <CardTitle className="text-2xl">Estrutura pronta para crescer</CardTitle>
              <CardDescription className="text-muted-foreground">
                A pagina do catalogo pode receber CRUD, filtros e operacao de produtos sem misturar estado com outras
                areas.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.slice(0, 4).map((category, index) => (
              <div
                key={category.id}
                className="rounded-2xl border border-primary/10 bg-white/80 px-4 py-4 shadow-[0_18px_40px_-38px_rgba(37,99,235,0.32)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Bloco {index + 1}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">{category.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{category.description || category.slug}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {category.slug}
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 ? (
              <div className="rounded-2xl border border-primary/10 bg-white/80 px-4 py-4 text-sm text-muted-foreground">
                Nenhuma categoria retornada pela API.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<PackageSearch className="h-5 w-5 text-primary" />}
          label="Produtos"
          value={`${productSummary?.total ?? 0}`}
          delta="Base retornada pela API"
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-primary" />}
          label="Categorias"
          value={`${categorySummary?.total ?? 0}`}
          delta="Mapa atual do catalogo"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          label="Ofertas"
          value={`${promotionalProducts.length}`}
          delta="Produtos com promocao"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
          label="Novidades"
          value={`${newProducts.length}`}
          delta="Itens recentes na base"
        />
      </section>
    </div>
  );
}
