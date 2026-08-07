cat << 'CSS_EOF' > src/index.css
@import "tailwindcss";

@layer base {
  body {
    font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
    background-color: #f8fafc;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
    /* Soft animated ambient background */
    background-image: 
      radial-gradient(at 0% 0%, hsla(253,16%,7%,0.03) 0, transparent 50%), 
      radial-gradient(at 50% 0%, hsla(225,39%,30%,0.03) 0, transparent 50%), 
      radial-gradient(at 100% 0%, hsla(339,49%,30%,0.03) 0, transparent 50%);
    background-attachment: fixed;
  }
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* Pulse animation for scanner */
@keyframes scan-line {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(400%); }
}
.animate-scan {
  animation: scan-line 2s linear infinite;
}

@media print {
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
}
CSS_EOF
npm run lint && npm run build
