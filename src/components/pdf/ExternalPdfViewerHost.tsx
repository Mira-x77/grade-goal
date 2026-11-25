import { useEffect, useState } from "react";
import { externalPdfService, ExternalPdfPayload } from "@/services/externalPdfService";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";

/** Opens PDFs from the phone or “Open with Go Study”. Not gated by library download quota. */
export function ExternalPdfViewerHost() {
  const [payload, setPayload] = useState<ExternalPdfPayload | null>(null);

  useEffect(() => {
    externalPdfService.init();
    return externalPdfService.subscribe(setPayload);
  }, []);

  if (!payload) return null;

  return (
    <InAppPDFViewer
      pdfUrl={payload.pdfUrl}
      pdfData={payload.pdfData}
      fileName={payload.fileName}
      onClose={() => externalPdfService.close()}
    />
  );
}
