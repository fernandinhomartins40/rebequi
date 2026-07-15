import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slides = [
    {
      image: hero1,
      title: "Materiais de Qualidade",
      subtitle: "Os melhores preços em materiais de construção para sua obra",
      cta: "Ver Produtos",
      ctaHref: "/categorias",
    },
    {
      image: hero2,
      title: "Ferramentas Profissionais",
      subtitle: "Equipamentos de alta performance para todos os tipos de obra",
      cta: "Explorar",
      ctaHref: "/categorias/ferramentas",
    },
    {
      image: hero3,
      title: "Entrega Rápida",
      subtitle: "Receba seus materiais no local da obra com total agilidade",
      cta: "Fazer Pedido",
      ctaHref: "/solicitar-orçamento",
    },
  ];

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const goToPrevious = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  }, [currentSlide, goToSlide, slides.length]);

  const goToNext = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length);
  }, [currentSlide, goToSlide, slides.length]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      goToNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, goToNext]);

  return (
    <section
      className="relative h-[380px] overflow-hidden sm:h-[480px] lg:h-[580px] xl:h-[640px]"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Slides Container */}
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className="relative w-full h-full flex-shrink-0"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-linear"
              style={{
                backgroundImage: `url(${slide.image})`,
                transform: currentSlide === index ? "scale(1.05)" : "scale(1)",
              }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Content */}
            <div className="relative z-10 container mx-auto flex h-full items-center px-4 sm:px-6">
              <div className="max-w-xl text-white lg:max-w-2xl">
                <div
                  className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    currentSlide === index
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: "100ms" }}
                >
                  <span className="mb-3 inline-block rounded-full bg-brand-yellow/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground shadow-sm sm:text-sm">
                    Rebequi Materiais
                  </span>
                </div>

                <h2
                  className={`mt-4 text-3xl font-extrabold leading-tight tracking-tight transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-5xl lg:text-6xl xl:text-7xl ${
                    currentSlide === index
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: "200ms" }}
                >
                  {slide.title}
                </h2>

                <p
                  className={`mt-4 text-base leading-relaxed text-white/85 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-xl lg:mt-6 lg:text-2xl ${
                    currentSlide === index
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: "300ms" }}
                >
                  {slide.subtitle}
                </p>

                <div
                  className={`mt-6 flex flex-col gap-3 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:flex-row lg:mt-8 ${
                    currentSlide === index
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: "400ms" }}
                >
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-xl bg-brand-red px-8 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-red/90 hover:shadow-xl sm:h-14 sm:px-10 sm:text-base"
                  >
                    <Link to={slide.ctaHref}>{slide.cta}</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl border-2 border-white/30 bg-white/10 px-8 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:border-white/50 sm:h-14 sm:px-10 sm:text-base"
                  >
                    <Link to="/solicitar-orçamento">Solicitar orçamento</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20 sm:inline-flex"
        onClick={goToPrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20 sm:inline-flex"
        onClick={goToNext}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Progress Bar Dots */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 sm:bottom-8">
        {slides.map((_, index) => (
          <button
            key={index}
            className="group relative h-2 overflow-hidden rounded-full transition-all duration-500"
            style={{ width: index === currentSlide ? "48px" : "12px" }}
            onClick={() => goToSlide(index)}
            aria-label={`Ir para slide ${index + 1}`}
          >
            <div className="absolute inset-0 rounded-full bg-white/30" />
            {index === currentSlide && (
              <div
                className="absolute inset-0 rounded-full bg-brand-yellow transition-all duration-500"
                style={{
                  animation: isAutoPlaying ? "progress-fill 5s linear forwards" : "none",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 animate-bounce lg:block">
        <div className="h-6 w-4 rounded-full border-2 border-white/40">
          <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
        </div>
      </div>

      <style>{`
        @keyframes progress-fill {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
};

export default Hero;
