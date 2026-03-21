import UploadForm from '../components/UploadForm';

export default function Upload() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Upload Exam Paper</h1>
        <p className="text-gray-400 mt-1">Add a new exam paper to the library</p>
      </div>
      <UploadForm />
    </div>
  );
}
