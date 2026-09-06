import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Download, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        id="btn-install-android-pwa"
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 transition duration-150 active:scale-95"
        title="Installeer als Android app / PWA"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Installeer App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="btn-install-ios-pwa"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5 text-orange-400" />
          <span>iOS Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-slate-750 bg-slate-900 p-6 text-slate-100 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-400" />
                Installeer op iPhone / iPad
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                1. Tik in Safari onderaan op het <strong>Deel-icoon</strong> (vierkantje met pijl omhoog).<br />
                2. Scroll naar beneden en tik op <strong>Zet op beginscherm</strong> (Add to Home Screen).<br />
                3. Open de app direct als een native app zonder browserbalken!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-orange-600 py-2.5 text-xs font-semibold text-white hover:bg-orange-500 transition"
              >
                Begrepen
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
