import { PwaControls } from '@/components/dashboard/PwaControls';
export function PartnerPwaControls({ canUpdate, showInstall }: { canUpdate: boolean; showInstall: boolean }) {
  return <PwaControls canUpdate={canUpdate} showInstall={showInstall} manifestPath="/parceiros/manifest.webmanifest" workerPath="/parceiros/sw.js" scope="/parceiros/" updateMessage="PARTNERS_APPLY_UPDATE" />;
}