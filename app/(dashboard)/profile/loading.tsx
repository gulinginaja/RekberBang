export default function ProfileLoading() {
  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10 p-4 animate-pulse">
      <div className="flex flex-col items-center justify-center pt-8 pb-4">
        <div className="w-24 h-24 rounded-full bg-slate-200 mb-4"></div>
        <div className="h-6 w-40 bg-slate-200 rounded mb-2"></div>
        <div className="h-4 w-24 bg-slate-200 rounded"></div>
      </div>
      
      <div className="space-y-4">
        <div className="h-4 w-32 bg-slate-200 rounded ml-2"></div>
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4">
          <div className="flex justify-between">
            <div className="h-5 w-24 bg-slate-200 rounded"></div>
            <div className="h-5 w-8 bg-slate-200 rounded"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-5 w-32 bg-slate-200 rounded"></div>
            <div className="h-5 w-16 bg-slate-200 rounded"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-5 w-20 bg-slate-200 rounded"></div>
            <div className="h-5 w-12 bg-slate-200 rounded"></div>
          </div>
        </div>
        
        <div className="h-14 bg-slate-200 rounded-2xl mt-8"></div>
      </div>
    </div>
  )
}
