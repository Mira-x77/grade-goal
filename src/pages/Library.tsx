import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Upload, FileText, Filter, LogIn, Search, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CLASS_LEVELS, LYCEE_SERIES, getSubjectsForLevel } from "@/lib/subjects-data";
import TaskBar from "@/components/TaskBar";
import { toast } from "sonner";

interface LibraryDoc {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  serie: string | null;
  doc_type: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
  uploader_id: string | null;
}

const DOC_TYPES = [
  { value: "exam", label: "Exam" },
  { value: "class_test", label: "Class Test" },
];

const Library = () => {
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSerie, setFilterSerie] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload form
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadLevel, setUploadLevel] = useState("");
  const [uploadSerie, setUploadSerie] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadDocType, setUploadDocType] = useState("exam");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Auth form
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [filterLevel, filterSerie, filterSubject, searchQuery]);

  const fetchDocs = async () => {
    setLoading(true);
    let query = supabase.from("library_documents").select("*").order("created_at", { ascending: false });
    if (filterLevel) query = query.eq("class_level", filterLevel);
    if (filterSerie) query = query.eq("serie", filterSerie);
    if (filterSubject) query = query.eq("subject", filterSubject);
    if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);
    const { data, error } = await query;
    if (error) { toast.error("Failed to load documents"); }
    setDocs((data as LibraryDoc[]) || []);
    setLoading(false);
  };

  const handleAuth = async () => {
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) toast.error(error.message);
      else { toast.success("Account created! Check your email to confirm."); setShowAuth(false); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) toast.error(error.message);
      else { toast.success("Logged in!"); setShowAuth(false); }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle || !uploadSubject || !uploadLevel) {
      toast.error("Please fill all fields and select a file");
      return;
    }
    if (!user) { toast.error("Please log in first"); return; }

    setUploading(true);
    const ext = uploadFile.name.split(".").pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: storageError } = await supabase.storage.from("library-pdfs").upload(filePath, uploadFile);
    if (storageError) { toast.error("Upload failed: " + storageError.message); setUploading(false); return; }

    const { error: dbError } = await supabase.from("library_documents").insert({
      uploader_id: user.id,
      title: uploadTitle,
      subject: uploadSubject,
      class_level: uploadLevel,
      serie: uploadSerie || null,
      doc_type: uploadDocType,
      file_path: filePath,
      file_size: uploadFile.size,
    });

    if (dbError) { toast.error("Failed to save: " + dbError.message); setUploading(false); return; }

    toast.success("Document uploaded!");
    setShowUpload(false);
    setUploadTitle(""); setUploadFile(null); setUploadSubject(""); setUploadLevel(""); setUploadSerie("");
    setUploading(false);
    fetchDocs();
  };

  const handleDelete = async (doc: LibraryDoc) => {
    await supabase.storage.from("library-pdfs").remove([doc.file_path]);
    await supabase.from("library_documents").delete().eq("id", doc.id);
    toast.success("Deleted");
    fetchDocs();
  };

  const getPublicUrl = (filePath: string) => {
    return supabase.storage.from("library-pdfs").getPublicUrl(filePath).data.publicUrl;
  };

  const isLycee = (level: string) => CLASS_LEVELS.lycee.includes(level as any);
  const allLevels = [...CLASS_LEVELS.college, ...CLASS_LEVELS.lycee];
  const availableSubjects = filterLevel ? getSubjectsForLevel(filterLevel, filterSerie || undefined) : [];
  const uploadSubjects = uploadLevel ? getSubjectsForLevel(uploadLevel, uploadSerie || undefined) : [];

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-black text-primary">Library</h1>
          </div>
          <div className="flex gap-2">
            {user ? (
              <button onClick={() => setShowUpload(true)} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                <Upload className="h-4 w-4" /> Upload
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                <LogIn className="h-4 w-4" /> Login to Upload
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-card pl-10 pr-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setFilterSerie(""); setFilterSubject(""); }} className="rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none">
            <option value="">All Levels</option>
            {allLevels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {filterLevel && isLycee(filterLevel) && (
            <select value={filterSerie} onChange={(e) => { setFilterSerie(e.target.value); setFilterSubject(""); }} className="rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none">
              <option value="">All Séries</option>
              {LYCEE_SERIES.map((s) => <option key={s} value={s}>Série {s}</option>)}
            </select>
          )}
          {filterLevel && availableSubjects.length > 0 && (
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none">
              <option value="">All Subjects</option>
              {availableSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Document List */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground font-semibold">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-semibold">
            No documents found 📚<br />
            <span className="text-xs">Be the first to upload!</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {docs.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl bg-card p-4 card-shadow flex flex-col gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{doc.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="rounded-lg bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">{doc.class_level}</span>
                        {doc.serie && <span className="rounded-lg bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Série {doc.serie}</span>}
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{doc.subject}</span>
                        <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground capitalize">{doc.doc_type.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(doc.created_at).toLocaleDateString()}
                      {doc.file_size && ` · ${(doc.file_size / 1024).toFixed(0)} KB`}
                    </span>
                    <div className="flex gap-2">
                      <a
                        href={getPublicUrl(doc.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary"
                      >
                        <Download className="h-3 w-3" /> View
                      </a>
                      {user && doc.uploader_id === user.id && (
                        <button onClick={() => handleDelete(doc)} className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setShowUpload(false)}>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full max-w-md rounded-t-3xl bg-card p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-foreground">Upload Document</h3>

            <input type="text" placeholder="Document title" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />

            <select value={uploadLevel} onChange={(e) => { setUploadLevel(e.target.value); setUploadSerie(""); setUploadSubject(""); }} className="rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none">
              <option value="">Select class level</option>
              {allLevels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            {uploadLevel && isLycee(uploadLevel) && (
              <select value={uploadSerie} onChange={(e) => { setUploadSerie(e.target.value); setUploadSubject(""); }} className="rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none">
                <option value="">Select série</option>
                {LYCEE_SERIES.map((s) => <option key={s} value={s}>Série {s}</option>)}
              </select>
            )}

            {uploadLevel && uploadSubjects.length > 0 && (
              <select value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none">
                <option value="">Select subject</option>
                {uploadSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} className="rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground focus:border-primary focus:outline-none">
              {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>

            <div>
              <input ref={fileRef} type="file" accept=".pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-border bg-background px-4 py-6 text-center font-semibold text-muted-foreground hover:border-primary transition-colors">
                {uploadFile ? `📄 ${uploadFile.name}` : "Tap to select PDF file"}
              </button>
            </div>

            <button onClick={handleUpload} disabled={uploading} className="w-full rounded-2xl bg-primary py-4 text-lg font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 active:shadow-none transition-all disabled:opacity-50">
              {uploading ? "Uploading..." : "UPLOAD →"}
            </button>
          </motion.div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setShowAuth(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm mx-6 rounded-3xl bg-card p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-foreground">{authMode === "login" ? "Log In" : "Sign Up"}</h3>
            <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="rounded-xl border-2 border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            <button onClick={handleAuth} className="w-full rounded-2xl bg-primary py-3 text-base font-extrabold text-primary-foreground card-shadow-primary active:translate-y-1 transition-all">
              {authMode === "login" ? "LOG IN" : "SIGN UP"}
            </button>
            <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} className="text-sm font-bold text-muted-foreground text-center">
              {authMode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </motion.div>
        </div>
      )}

      <TaskBar />
    </div>
  );
};

export default Library;
