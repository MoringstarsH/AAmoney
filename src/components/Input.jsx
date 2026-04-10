const Input = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div className="flex flex-col gap-2 mb-4">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-white/50 border border-white/40 rounded-2xl px-5 py-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338ca]/20 transition-all font-medium" />
  </div>
);
window.Input = Input;
