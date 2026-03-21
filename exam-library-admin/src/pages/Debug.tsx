export default function Debug() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-red-600">DEBUG PAGE - If you see this, routing works!</h1>
      <p className="mt-4">This is a simple test page with no dependencies.</p>
      <div className="mt-8 p-4 bg-green-100 border border-green-500 rounded">
        <p className="font-bold">✓ React is working</p>
        <p className="font-bold">✓ Routing is working</p>
        <p className="font-bold">✓ Tailwind CSS is working</p>
      </div>
    </div>
  );
}
