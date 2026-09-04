import React from 'react';

interface DocumentA4CanvasProps {
  modoA4: boolean;
  zoom: number;
  fontScale: number;
  docRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}

/**
 * Container de apresentação da folha física A4 e modo de visualização fluido
 */
export const DocumentA4Canvas: React.FC<DocumentA4CanvasProps> = ({
  modoA4,
  zoom,
  fontScale,
  docRef,
  children,
}) => {
  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden select-text ${
        modoA4 ? 'bg-slate-200/70 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'
      }`}
    >
      <div
        className={`flex-1 overflow-y-auto select-text print:p-0 print:bg-white ${
          modoA4
            ? 'p-4 md:p-8'
            : 'p-[4px] md:p-10 w-full'
        }`}
      >
        <div
          ref={docRef}
          id="documento-visualizado"
          style={
            modoA4
              ? { zoom: zoom / 100 }
              : ({
                  fontSize: `${14 * fontScale}px`,
                  '--doc-font-scale': `${fontScale}`,
                } as React.CSSProperties)
          }
          className={`text-slate-900 dark:text-slate-100 font-sans print:shadow-none print:m-0 print:w-full transition-[zoom] duration-150 select-text ${
            modoA4
              ? 'bg-white dark:bg-slate-800 w-[210mm] min-h-[297mm] p-[25mm] shadow-xl border border-slate-200 dark:border-slate-700 rounded-sm mx-auto block'
              : 'w-full max-w-full p-0 bg-transparent dark:bg-transparent border-0 shadow-none rounded-none'
          }`}
        >
          {children}
        </div>

        {/* Espaçador real no fluxo de rolagem: garante espaço visível entre o fim da folha A4 e a borda inferior do navegador */}
        {modoA4 && <div className="h-10 md:h-16 w-full shrink-0" aria-hidden="true" />}
      </div>
    </div>
  );
};
