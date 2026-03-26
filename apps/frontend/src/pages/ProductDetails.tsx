import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Package,
  Ruler,
  ShieldCheck,
  Tag,
  Truck,
  Weight,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductSection from "@/components/ProductSection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProductBySlug, fetchProductsByCategory } from "@/services/api/products";
import { ApiError } from "@/services/api/client";

const PRODUCT_PLACEHOLDER = "https://via.placeholder.com/1200x1200?text=Produto";

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ProductDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-5 w-48" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-3xl" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug as string),
    enabled: Boolean(slug),
    retry: false,
  });

  const { data: relatedProductsResponse } = useQuery({
    queryKey: ["products", "related", product?.category?.slug, product?.id],
    queryFn: () => fetchProductsByCategory(product?.category?.slug || "", 1, 4),
    enabled: Boolean(product?.category?.slug),
  });

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  if (!slug) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Produto invalido</AlertTitle>
            <AlertDescription>O identificador do produto nao foi informado.</AlertDescription>
          </Alert>
        </div>
        <Footer />
      </main>
    );
  }

  if (isLoading) {
    return <ProductDetailsSkeleton />;
  }

  if (!product || error) {
    const isNotFound = error instanceof ApiError && error.status === 404;

    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{isNotFound ? "Produto nao encontrado" : "Falha ao carregar produto"}</AlertTitle>
            <AlertDescription>
              {isNotFound
                ? "O produto solicitado nao esta disponivel ou foi removido."
                : error instanceof Error
                  ? error.message
                  : "Nao foi possivel carregar este produto agora."}
            </AlertDescription>
          </Alert>

          <Button asChild variant="outline" className="mt-6">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a pagina inicial
            </Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  const images =
    product.images?.length
      ? product.images
      : [{ url: PRODUCT_PLACEHOLDER, alt: product.name, order: 0, isPrimary: true }];
  const selectedImage = images[selectedImageIndex] || images[0];
  const relatedProducts = (relatedProductsResponse?.products || []).filter((item) => item.id !== product.id);
  const hasStock = product.stock > 0;

  const detailItems = [
    product.sku
      ? {
          icon: Tag,
          label: "SKU",
          value: product.sku,
        }
      : null,
    product.weight
      ? {
          icon: Weight,
          label: "Peso",
          value: `${product.weight} kg`,
        }
      : null,
    product.dimensions
      ? {
          icon: Ruler,
          label: "Dimensoes",
          value: product.dimensions,
        }
      : null,
    {
      icon: Package,
      label: "Estoque",
      value: hasStock ? `${product.stock} unidades disponiveis` : "Sem estoque no momento",
    },
  ].filter(Boolean) as Array<{
    icon: typeof Tag;
    label: string;
    value: string;
  }>;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {product.category?.name ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">{product.category.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : null}
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
          <section className="space-y-4">
            <div className="overflow-hidden rounded-[2rem] border border-[#e7dcc3] bg-white shadow-[0_35px_80px_-50px_rgba(15,23,42,0.35)]">
              <img
                src={selectedImage.url}
                alt={selectedImage.alt || product.name}
                className="aspect-square w-full object-cover"
              />
            </div>

            {images.length > 1 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                  <button
                    key={image.id || `${image.url}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border bg-white transition ${
                      index === selectedImageIndex
                        ? "border-primary shadow-[0_18px_32px_-26px_rgba(15,23,42,0.45)]"
                        : "border-black/10 hover:border-primary/45"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || `${product.name} ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {product.category?.name ? <Badge variant="outline">{product.category.name}</Badge> : null}
              {product.isNew ? <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Novo</Badge> : null}
              {product.isOffer && product.discount ? (
                <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                  <BadgePercent className="mr-1 h-3.5 w-3.5" />
                  {product.discount}% OFF
                </Badge>
              ) : null}
              {product.isFeatured ? <Badge className="bg-amber-500 text-black hover:bg-amber-500">Destaque</Badge> : null}
            </div>

            <div>
              <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {product.name}
              </h1>
              {product.shortDesc ? (
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{product.shortDesc}</p>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-[#e7dcc3] bg-white px-4 py-4 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)] sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.originalPrice ? (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <div
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
                    hasStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {hasStock ? "Disponivel para venda" : "Consulte disponibilidade"}
                </div>

                {product.minStock > 0 ? (
                  <div className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                    Estoque minimo: {product.minStock}
                  </div>
                ) : null}
              </div>

              <Separator className="my-5" />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    Entrega local
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Consulte prazos e disponibilidade para a sua regiao.
                  </p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Produto catalogado
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Dados vindos da API publica, sem necessidade de login para consulta.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {detailItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-2xl border border-black/5 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[2rem] border border-[#e7dcc3] bg-white px-4 py-4 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)] sm:px-6 sm:py-5">
              <h2 className="text-lg font-semibold text-foreground">Descricao</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {product.description || product.shortDesc || "Sem descricao detalhada cadastrada para este produto."}
              </p>
            </div>

            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para a vitrine
              </Link>
            </Button>
          </section>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <ProductSection title="Produtos relacionados" products={relatedProducts} showViewAll={false} />
      ) : null}

      <Footer />
    </main>
  );
}
