import TaskBar from "@/components/TaskBar";

const LibraryTest = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-3xl font-black text-foreground mb-4">Library Test Page</h1>
        <p className="text-lg text-muted-foreground">If you can see this, the route is working!</p>
        
        <div className="mt-8 bg-card p-6 rounded-2xl card-shadow">
          <h2 className="text-xl font-bold mb-2">Test Card</h2>
          <p className="text-sm text-muted-foreground">This is a test to verify the UI is rendering.</p>
        </div>
      </div>
      <TaskBar />
    </div>
  );
};

export default LibraryTest;
