sed -i 's/className="bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg aspect-video md:aspect-\[4\/3\] flex flex-col items-center justify-center text-white"/className="bg-gradient-to-br from-violet-950 via-slate-900 to-fuchsia-950 rounded-2xl overflow-hidden relative border border-violet-500\/30 shadow-2xl shadow-violet-500\/20 aspect-video md:aspect-[4\/3] flex flex-col items-center justify-center text-white"/g' src/components/BarcodeModal.tsx

sed -i 's/<X className="w-5 h-5" \/>/<ArrowRight className="w-5 h-5" \/>/g' src/components/BarcodeModal.tsx

sed -i "s/import { QrCode, X, Camera, Search, Printer, CheckCircle2, Box, RefreshCw, AlertCircle, Sparkles, Sliders } from 'lucide-react';/import { QrCode, X, Camera, Search, Printer, CheckCircle2, Box, RefreshCw, AlertCircle, Sparkles, Sliders, ArrowRight } from 'lucide-react';/g" src/components/BarcodeModal.tsx

npm run lint && npm run build
