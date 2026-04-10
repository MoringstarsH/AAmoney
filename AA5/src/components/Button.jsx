const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon }) => {
  const baseStyle = 'flex items-center justify-center gap-2 px-6 py-4 rounded-full font-medium transition-all active:scale-95 shadow-lg';
  const variants = {
    primary: 'bg-[#4338ca] text-white shadow-indigo-500/30 hover:bg-[#3730a3]',
    secondary: 'bg-white/80 text-slate-700 shadow-slate-200/50 hover:bg-white',
    danger: 'bg-red-50 text-red-500 hover:bg-red-100',
    ghost: 'bg-transparent text-slate-500 shadow-none hover:bg-slate-100/20'
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
};
window.Button = Button;
