const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`backdrop-blur-xl bg-white/40 border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-[32px] p-6 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}>
    {children}
  </div>
);
window.Card = Card;
