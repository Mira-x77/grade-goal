import { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Users, Loader2, Clock, Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { format } from 'date-fns';

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  icon: string | null;
  image_url: string | null;
  action_url: string | null;
  created_at: string;
  expires_at: string | null;
}

const TARGET_OPTIONS = [
  { value: 'all',      label: 'All Users',         color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'apc',      label: 'APC Users',          color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'french',   label: 'French Users',       color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'nigerian', label: 'Nigerian Users',      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

const ICON_OPTIONS = ['📢', '🎉', '📚', '⚠️', '✅', '🔔', '💡', '🚀', '🎓', '📝'];

export default function Notifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    body: '',
    target: 'all',
    icon: '📢',
    action_url: '',
    expires_at: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load notifications');
    } else {
      setNotifications(data ?? []);
    }
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setLoading(true);
    try {
      const fileName = `notification-${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('exam-papers')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('exam-papers').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err: any) {
      toast.error('Failed to upload image: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    try {
      // Upload image if present
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          setSending(false);
          return;
        }
      }

      const { error } = await supabaseAdmin.from('admin_notifications').insert({
        title: form.title.trim(),
        body: form.body.trim(),
        target: form.target,
        icon: form.icon || null,
        image_url: imageUrl,
        action_url: form.action_url.trim() || null,
        expires_at: form.expires_at || null,
      });

      if (error) throw error;

      toast.success('Notification sent!');
      setForm({ title: '', body: '', target: 'all', icon: '📢', action_url: '', expires_at: '' });
      handleRemoveImage();
      fetchNotifications();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    setDeletingId(id);
    const { error } = await supabaseAdmin.from('admin_notifications').delete().eq('id', id);
    if (error) {
      console.error('Delete notification error:', error);
      toast.error('Failed to delete notification');
    } else {
      toast.success('Notification deleted');
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
    setDeletingId(null);
  };

  const getTargetBadge = (target: string) => {
    return TARGET_OPTIONS.find(t => t.value === target) ?? TARGET_OPTIONS[0];
  };

  const isExpired = (n: AdminNotification) =>
    n.expires_at ? new Date(n.expires_at) < new Date() : false;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="h-6 w-6 text-indigo-400" />
          Push Notifications
        </h1>
        <p className="text-gray-400 mt-1">Send in-app notifications to your users. They appear in the bell icon on the home screen.</p>
      </div>

      {/* Compose form */}
      <div className="bg-[#1a1d2e] rounded-xl border border-gray-800 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Compose Notification</h2>

        {/* Icon picker */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
          <div className="flex gap-2 flex-wrap">
            {ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                onClick={() => setForm(f => ({ ...f, icon }))}
                className={`text-xl p-2 rounded-lg border transition-colors ${
                  form.icon === icon
                    ? 'border-indigo-500 bg-indigo-500/20'
                    : 'border-gray-700 bg-[#0f1117] hover:border-gray-600'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. New papers available!"
            maxLength={80}
            className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{form.title.length}/80</p>
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Message *</label>
          <textarea
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Write your message here..."
            rows={3}
            maxLength={300}
            className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">{form.body.length}/300</p>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Image className="inline h-4 w-4 mr-1" />
            Image <span className="text-gray-500">(optional, max 5MB)</span>
          </label>
          
          {imagePreview ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-[#0f1117]">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="block w-full cursor-pointer">
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors bg-[#0f1117]">
                <Image className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Click to upload an image</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Target + Action URL row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users className="inline h-4 w-4 mr-1" />
              Target Audience *
            </label>
            <select
              value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TARGET_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Action URL <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={form.action_url}
              onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))}
              placeholder="e.g. /library/books"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Clock className="inline h-4 w-4 mr-1" />
            Expires At <span className="text-gray-500">(optional — leave blank to never expire)</span>
          </label>
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Preview */}
        {(form.title || form.body || imagePreview) && (
          <div className="rounded-xl bg-[#0f1117] border border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Preview</p>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{form.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{form.title || 'Title'}</p>
                <p className="text-gray-400 text-xs mt-0.5">{form.body || 'Message...'}</p>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-2 rounded-lg w-full max-w-xs h-32 object-cover" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || !form.title.trim() || !form.body.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </div>

      {/* Sent notifications list */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Sent Notifications
          <span className="ml-2 text-sm font-normal text-gray-400">({notifications.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1d2e] rounded-xl border border-gray-800">
            <Bell className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No notifications sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const badge = getTargetBadge(n.target);
              const expired = isExpired(n);
              return (
                <div
                  key={n.id}
                  className={`bg-[#1a1d2e] rounded-xl border p-4 flex items-start gap-4 ${
                    expired ? 'border-gray-800 opacity-60' : 'border-gray-700'
                  }`}
                >
                  <span className="text-2xl shrink-0">{n.icon ?? '📢'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-white text-sm">{n.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {expired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">{n.body}</p>
                    {n.image_url && (
                      <img src={n.image_url} alt="" className="mt-2 rounded-lg w-full max-w-xs h-32 object-cover" />
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      <span>{format(new Date(n.created_at), 'MMM d, yyyy · HH:mm')}</span>
                      {n.action_url && <span>→ {n.action_url}</span>}
                      {n.expires_at && <span>Expires: {format(new Date(n.expires_at), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    disabled={deletingId === n.id}
                    className="shrink-0 p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === n.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
