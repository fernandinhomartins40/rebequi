import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeliveryNavigation({ address }: { address: string | null }) {
  if (!address?.trim()) return null;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', address.trim());
  url.searchParams.set('travelmode', 'driving');
  // Maps URLs are limited to 2048 characters; never truncate an address to fit.
  if (url.href.length > 2048) return null;
  return <Button asChild variant="outline" size="sm" className="mt-2">
    <a href={url.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="Como chegar — abrir Google Maps">
      <Navigation className="mr-2 h-4 w-4" aria-hidden="true" />Como chegar
    </a>
  </Button>;
}
