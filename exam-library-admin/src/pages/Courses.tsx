import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Edit, Trash2, Eye, EyeOff, Star, StarOff, Image, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { format } from 'date-fns';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string | null;
  price: string | null;
  duration: string | null;
  level: string;
  category: string;
  image_url: string | null;
  link_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

const CATEGORIES = ['General', 'Math', 'Science', 'Languages', 'Programming', 'Business', 'Art', 'Music'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    instructor: '',
    price: '',
    duration: '',
    level: 'Beginner',
    category: 'General',
    link_url: '',
    expires_at: '',
    is_featured: false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_posts')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load courses');
    } else {
      setCourses(data ?? []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      instructor: '',
      price: '',
      duration: '',
      level: 'Beginner',
      category: 'General',
      link_url: '',
      expires_at: '',
      is_featured: false,
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingCourse(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

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

    setUploading(true);
    try {
      const fileName = `course-${Date.now()}-${imageFile.name}`;
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
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl) return;
      } else if (editingCourse) {
        imageUrl = editingCourse.image_url;
      }

      const courseData = {
        title: form.title.trim(),
        description: form.description.trim(),
        instructor: form.instructor.trim() || null,
        price: form.price.trim() || null,
        duration: form.duration.trim() || null,
        level: form.level,
        category: form.category,
        image_url: imageUrl,
        link_url: form.link_url.trim() || null,
        expires_at: form.expires_at || null,
        is_featured: form.is_featured,
      };

      if (editingCourse) {
        const { error } = await supabaseAdmin
          .from('course_posts')
          .update(courseData)
          .eq('id', editingCourse.id);
        if (error) throw error;
        toast.success('Course updated!');
      } else {
        const { error } = await supabaseAdmin
          .from('course_posts')
          .insert(courseData);
        if (error) throw error;
        toast.success('Course created!');
      }

      resetForm();
      setShowForm(false);
      fetchCourses();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save course');
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description,
      instructor: course.instructor || '',
      price: course.price || '',
      duration: course.duration || '',
      level: course.level,
      category: course.category,
      link_url: course.link_url || '',
      expires_at: course.expires_at || '',
      is_featured: course.is_featured,
    });
    if (course.image_url) {
      setImagePreview(course.image_url);
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    setDeletingId(id);
    const { error } = await supabaseAdmin.from('course_posts').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete course: ' + error.message);
    } else {
      toast.success('Course deleted');
      setCourses(prev => prev.filter(c => c.id !== id));
    }
    setDeletingId(null);
  };

  const toggleActive = async (course: Course) => {
    const { error } = await supabaseAdmin
      .from('course_posts')
      .update({ is_active: !course.is_active })
      .eq('id', course.id);

    if (error) {
      console.error('Toggle active error:', error);
      toast.error('Failed to update course');
    } else {
      toast.success(course.is_active ? 'Course hidden' : 'Course activated');
      setCourses(prev => prev.map(c => 
        c.id === course.id ? { ...c, is_active: !c.is_active } : c
      ));
    }
  };

  const toggleFeatured = async (course: Course) => {
    const { error } = await supabaseAdmin
      .from('course_posts')
      .update({ is_featured: !course.is_featured })
      .eq('id', course.id);

    if (error) {
      console.error('Toggle featured error:', error);
      toast.error('Failed to update course');
    } else {
      toast.success(course.is_featured ? 'Removed from featured' : 'Added to featured');
      setCourses(prev => prev.map(c => 
        c.id === course.id ? { ...c, is_featured: !c.is_featured } : c
      ));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-400" />
            Course Management
          </h1>
          <p className="text-gray-400 mt-1">Manage online course announcements and flyers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Course
        </button>
      </div>

      {/* Course Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1a1d2e] rounded-xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Course title"
                  className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Course description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Course Image</label>
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-700">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full cursor-pointer">
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors">
                      <Image className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Click to upload course image</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                )}
              </div>

              {/* Row 1: Instructor & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Instructor</label>
                  <input
                    type="text"
                    value={form.instructor}
                    onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
                    placeholder="Instructor name"
                    className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="e.g. Free, $99, €50"
                    className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Duration & Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 4 weeks, Self-paced"
                    className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Level</label>
                  <select
                    value={form.level}
                    onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Course Link</label>
                <input
                  type="url"
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://example.com/course"
                  className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Expires At */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Featured / Hero Carousel Promotion */}
              <div className="flex items-center gap-2 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg">
                <input
                  type="checkbox"
                  id="featured"
                  checked={form.is_featured}
                  onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-700 bg-[#0f1117] text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="featured" className="text-sm font-semibold text-white block cursor-pointer">
                    ⭐ Promote on Hero Carousel
                  </label>
                  <p className="text-xs text-gray-400">
                    Course will auto-slide at the top of the mobile & web Courses page banner.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-700 text-gray-300 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : editingCourse ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          All Courses
          <span className="ml-2 text-sm font-normal text-gray-400">({courses.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1d2e] rounded-xl border border-gray-800">
            <GraduationCap className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No courses created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <div
                key={course.id}
                className={`bg-[#1a1d2e] rounded-xl border p-4 ${
                  course.is_active ? 'border-gray-700' : 'border-gray-800 opacity-60'
                }`}
              >
                {/* Image */}
                {course.image_url && (
                  <img src={course.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
                )}

                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm line-clamp-2">{course.title}</h3>
                    <div className="flex gap-1 shrink-0">
                      {course.is_featured && (
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      )}
                      {!course.is_active && (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs line-clamp-2">{course.description}</p>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">{course.category}</span>
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">{course.level}</span>
                  </div>

                  {course.price && (
                    <p className="text-indigo-400 font-bold text-sm">{course.price}</p>
                  )}

                  <p className="text-gray-500 text-xs">
                    {format(new Date(course.created_at), 'MMM d, yyyy')}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => toggleActive(course)}
                      className={`p-2 rounded-lg transition-colors ${
                        course.is_active
                          ? 'text-green-400 hover:bg-green-400/10'
                          : 'text-gray-500 hover:bg-gray-500/10'
                      }`}
                      title={course.is_active ? 'Hide course' : 'Show course'}
                    >
                      {course.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => toggleFeatured(course)}
                      className={`p-2 rounded-lg transition-colors ${
                        course.is_featured
                          ? 'text-yellow-400 hover:bg-yellow-400/10'
                          : 'text-gray-500 hover:bg-gray-500/10'
                      }`}
                      title={course.is_featured ? 'Remove from featured' : 'Add to featured'}
                    >
                      {course.is_featured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(course)}
                      className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Edit course"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      disabled={deletingId === course.id}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete course"
                    >
                      {deletingId === course.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}