/**
 * externalPdfService.ts — Handles system intent & local file PDF opening for GoStudy.
 * Enables GoStudy to act as a system-wide PDF Reader on mobile devices (Android/iOS).
 */

import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { toast } from "sonner";
import { cacheService } from "@/services/cacheService";
import { EXAM_PAPERS_DIR } from "@/lib/filesystem";
import type { CachedPaper } from "@/types/exam-library";

const IncomingPdf = registerPlugin<{
  consumeLaunchPdf(): Promise<{ found: boolean; path?: string; fileName?: string; size?: number }>;
  readUri(options: { uri: string }): Promise<{ path: string; fileName: string; size?: number }>;
  pickPdf(): Promise<{ cancelled?: boolean; files?: { path: string; fileName: string; size?: number }[] }>;
}>("IncomingPdf");

export interface ExternalPdfPayload {
  pdfUrl?: string;
  pdfData?: string;
  fileName: string;
}

type ExternalPdfListener = (payload: ExternalPdfPayload | null) => void;

class ExternalPdfService {
  private activePayload: ExternalPdfPayload | null = null;
  private listeners: Set<ExternalPdfListener> = new Set();
  private initialized = false;
  private launchConsumed = false;

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    this.consumeNativeLaunchPdf();

    window.addEventListener("gostudy-incoming-pdf", () => {
      void this.consumeNativeLaunchPdf();
    });

    // 1. Check if launched with intent URL on fresh startup
    App.getLaunchUrl().then((launchUrl) => {
      if (this.launchConsumed) return;
      if (launchUrl?.url) {
        void this.handleIncomingUrl(launchUrl.url);
      }
    }).catch((err) => {
      console.warn("[ExternalPdfService] Error getting launch URL:", err);
    });

    // 2. Listen for app opened from background via file intent / deep link
    App.addListener("appUrlOpen", (data) => {
      if (data?.url) {
        void this.handleIncomingUrl(data.url);
      }
    });
  }

  /** Alias for browsePhoneFolders for compatibility */
  public pickMultiplePdfs = () => this.browsePhoneFolders();

  /** Opens the Android folder browser and adds the chosen PDFs to My Downloads. */
  public async browsePhoneFolders(): Promise<number> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      throw new Error("USE_FILE_INPUT");
    }
    const result = await IncomingPdf.pickPdf();
    if (!result || result.cancelled || !result.files?.length) return 0;

    let opened = false;
    let added = 0;
    for (const file of result.files) {
      if (!file?.path) continue;
      try {
        await this.importPhonePdf(file.path, file.fileName || "Document.pdf", file.size ?? 0);
        added += 1;
        if (!opened) {
          opened = true;
          await this.openCopiedFile(file.path, file.fileName || "Document.pdf");
        }
      } catch (err) {
        console.warn("[ExternalPdfService] import failed:", err);
      }
    }
    if (added > 0) {
      window.dispatchEvent(new CustomEvent("gostudy-downloads-updated"));
      toast.success(added === 1 ? "PDF added to My Downloads" : `${added} PDFs added to My Downloads`);
    } else {
      toast.error("Could not add that PDF from your phone.");
    }
    return added;
  }

  public subscribe(listener: ExternalPdfListener): () => void {
    this.listeners.add(listener);
    // Immediately inform subscriber if a payload is pending
    if (this.activePayload) {
      listener(this.activePayload);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setPayload(payload: ExternalPdfPayload | null) {
    this.activePayload = payload;
    this.listeners.forEach((fn) => fn(payload));
  }

  public close() {
    this.setPayload(null);
  }

  private async consumeNativeLaunchPdf() {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    try {
      const result = await IncomingPdf.consumeLaunchPdf();
      if (result?.found && result.path) {
        this.launchConsumed = true;
        await this.openCopiedFile(result.path, result.fileName || "Document.pdf");
      }
    } catch (err) {
      console.warn("[ExternalPdfService] Native launch PDF:", err);
    }
  }

  private async importPhonePdf(path: string, fileName: string, size: number) {
    const res = await Filesystem.readFile({ path });
    if (typeof res.data !== "string" || res.data.length === 0) {
      throw new Error("Empty PDF");
    }
    const safeName = fileName.replace(/[^\w.\- ()]/g, "_");
    const storedName = `${Date.now()}-${safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`}`;
    await Filesystem.mkdir({ path: EXAM_PAPERS_DIR, directory: Directory.Data, recursive: true }).catch(() => {});
    await Filesystem.writeFile({
      path: `${EXAM_PAPERS_DIR}/${storedName}`,
      data: res.data,
      directory: Directory.Data,
    });
    const now = new Date().toISOString();
    const bytes = size > 0 ? size : Math.floor((res.data.length * 3) / 4);
    const paper: CachedPaper = {
      id: `phone-${storedName}`,
      title: fileName.replace(/\.pdf$/i, ""),
      subject: "Phone",
      classLevel: "Autre",
      year: new Date().getFullYear(),
      examType: "Devoir",
      session: "Regular",
      fileSize: bytes,
      fileSizeFormatted: bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`,
      uploadDate: now,
      downloads: 0,
      tags: ["phone"],
      isDownloaded: true,
      localPath: `${EXAM_PAPERS_DIR}/${storedName}`,
      downloadedAt: now,
      lastFetched: now,
    };
    await cacheService.saveImportedPaper(paper);
  }

  private async openCopiedFile(path: string, fileName: string) {
    const res = await Filesystem.readFile({ path });
    if (typeof res.data === "string" && res.data.length > 0) {
      this.setPayload({ pdfData: res.data, fileName });
      return;
    }
    const fileUri = path.startsWith("file://") ? path : `file://${path}`;
    this.setPayload({ pdfUrl: Capacitor.convertFileSrc(fileUri), fileName });
  }

  public async handleIncomingUrl(urlStr: string) {
    console.log("📄 [ExternalPdfService] Incoming PDF URL/Intent:", urlStr);

    // Ignore OAuth / auth callback deep links — those are handled by AuthContext.
    // Bail out for any URL that looks like an auth redirect (old or new scheme).
    if (
      urlStr.includes("auth/callback") ||
      urlStr.includes("access_token") ||
      urlStr.includes("code=") ||
      urlStr.startsWith("com.scoretarget.app://") ||
      urlStr.startsWith("com.gostudy.student://")
    ) {
      console.log("🔒 [ExternalPdfService] Ignoring auth deep link:", urlStr);
      return;
    }

    try {
      const payload = await this.resolvePdfFromUri(urlStr);
      if (payload) {
        this.setPayload(payload);
      }
    } catch (err) {
      console.error("❌ [ExternalPdfService] Failed to resolve PDF from URI:", err);
      toast.error("Could not open this PDF from your phone.");
    }
  }

  public async handleFileInput(file: File): Promise<ExternalPdfPayload> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Result is data:application/pdf;base64,xxxx
        const base64Data = result.split(",")[1] || result;
        const payload: ExternalPdfPayload = {
          pdfData: base64Data,
          fileName: file.name || "Local_Document.pdf",
        };
        this.setPayload(payload);
        resolve(payload);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  public async resolvePdfFromUri(uri: string): Promise<ExternalPdfPayload | null> {
    if (!uri) return null;

    let fileName = "External_Document.pdf";
    try {
      const decoded = decodeURIComponent(uri);
      const parts = decoded.split("/");
      const last = parts[parts.length - 1];
      if (last && last.length > 0) {
        // Strip query params if any
        const cleanName = last.split("?")[0];
        if (cleanName.toLowerCase().endsWith(".pdf")) {
          fileName = cleanName;
        } else if (cleanName.trim().length > 0) {
          fileName = `${cleanName}.pdf`;
        }
      }
    } catch {
      fileName = "Document.pdf";
    }

    // 1. HTTP / HTTPS / Blob URLs
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("blob:")) {
      return { pdfUrl: uri, fileName };
    }

    // 2. File scheme URIs (file://...)
    if (uri.startsWith("file://")) {
      const converted = Capacitor.convertFileSrc(uri);
      return { pdfUrl: converted, fileName };
    }

    // 3. Android Content URIs — copy into app cache, then serve via convertFileSrc.
    if (uri.startsWith("content://")) {
      if (Capacitor.isNativePlatform()) {
        try {
          const copied = await IncomingPdf.readUri({ uri });
          if (copied?.path) {
            const res = await Filesystem.readFile({ path: copied.path });
            if (typeof res.data === "string" && res.data.length > 0) {
              return { pdfData: res.data, fileName: copied.fileName || fileName };
            }
          }
        } catch (err) {
          console.warn("[ExternalPdfService] IncomingPdf.readUri failed:", err);
        }
      }
      try {
        const res = await Filesystem.readFile({ path: uri });
        if (typeof res.data === "string" && res.data.length > 0) {
          return { pdfData: res.data, fileName };
        }
      } catch (err) {
        console.warn("[ExternalPdfService] content:// readFile failed:", err);
      }
      throw new Error("Could not read this PDF from phone storage.");
    }

    // Fallback convert
    const converted = Capacitor.convertFileSrc(uri);
    return { pdfUrl: converted, fileName };
  }
}

export const externalPdfService = new ExternalPdfService();
