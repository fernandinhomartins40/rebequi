import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const slides = [
    {
      image: hero1,
      title: "Materiais de Qualidade",
      subtitle: "Os melhores preços em materiais de construção",
      cta: "Ver Produtos",
    },
    {
      image: hero2,
      title: "Ferramentas Profissionais",
      subtitle: "Equipamentos para todos os tipos de obra",
      cta: "Explorar",
    },
    {
      image: hero3,
      title: "Entrega Rápida",
      subtitle: "Receba seus materiais no local da obra",
      cta: "Fazer Pedido",
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section 
      className="relative h-[420px] overflow-hidden sm:h-[500px] xl:h-[600px]"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Slides Container */}
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className="relative w-full h-full flex-shrink-0"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto flex h-full items-center px-4 sm:px-6">
              <div className="max-w-xl text-white lg:max-w-2xl">
                <h2 className="mb-4 text-3xl font-bold animate-fade-in sm:text-4xl lg:text-6xl">
                  {slide.title}
                </h2>
                <p className="mb-6 text-base animate-fade-in sm:text-xl lg:mb-8 lg:text-2xl">
                  {slide.subtitle}
                </p>
                <Button size="lg" className="h-10 px-5 text-sm animate-fade-in sm:h-11 sm:px-8 sm:text-base">
                  {slide.cta}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 hidden -translate-y-1/2 text-white hover:bg-white/20 sm:inline-flex"
        onClick={goToPrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-white hover:bg-white/20 sm:inline-flex"
        onClick={goToNext}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 space-x-2 sm:bottom-4">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-colors duration-200 ${
              index === currentSlide ? "bg-white" : "bg-white/50"
            }`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
