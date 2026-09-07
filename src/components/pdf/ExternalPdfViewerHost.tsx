import { useEffect, useState } from "react";
import { externalPdfService, ExternalPdfPayload } from "@/services/externalPdfService";
import { InAppPDFViewer } from "@/components/exam/InAppPDFViewer";

export function ExternalPdfViewerHost() {
  const [payload, setPayload] = useState<ExternalPdfPayload | null>(null);

  useEffect(() => {
    // Initialize intent listeners
    externalPdfService.init();

    // Subscribe to incoming PDF open events
    const unsubscribe = externalPdfService.subscribe((newPayload) => {
      setPayload(newPayload);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!payload) return null;

  return (
    <InAppPDFViewer
      pdfUrl={payload.pdfUrl}
      pdfData={payload.pdfData}
      fileName={payload.fileName}
      onClose={() => externalPdfService.close()}
      showShare={true}
      onShare={() => {
        // Native share if supported
      }}
    />
  );
}
