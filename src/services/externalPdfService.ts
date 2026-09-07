/**
 * externalPdfService.ts — Handles system intent & local file PDF opening for GoStudy.
 * Enables GoStudy to act as a system-wide PDF Reader on mobile devices (Android/iOS).
 */

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";

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

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Check if launched with intent URL on fresh startup
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        this.handleIncomingUrl(launchUrl.url);
      }
    }).catch((err) => {
      console.warn("[ExternalPdfService] Error getting launch URL:", err);
    });

    // 2. Listen for app opened from background via file intent / deep link
    App.addListener("appUrlOpen", (data) => {
      if (data?.url) {
        this.handleIncomingUrl(data.url);
      }
    });
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

    // 3. Android Content URIs (content://...)
    if (uri.startsWith("content://")) {
      try {
        const res = await Filesystem.readFile({ path: uri });
        if (typeof res.data === "string") {
          return { pdfData: res.data, fileName };
        }
      } catch (err) {
        console.warn("⚠️ [ExternalPdfService] Content URI readFile warning, trying convertFileSrc:", err);
        const converted = Capacitor.convertFileSrc(uri);
        return { pdfUrl: converted, fileName };
      }
    }

    // Fallback convert
    const converted = Capacitor.convertFileSrc(uri);
    return { pdfUrl: converted, fileName };
  }
}

export const externalPdfService = new ExternalPdfService();
