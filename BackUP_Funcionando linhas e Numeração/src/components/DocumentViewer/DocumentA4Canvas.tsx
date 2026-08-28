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
        modoA4 ? 'bg-slate-200/70' : 'bg-white'
      }`}
    >
      <div
        className={`flex-1 overflow-y-auto select-text print:p-0 print:bg-white ${
          modoA4
            ? 'p-4 md:p-8 flex justify-center items-start'
            : 'p-6 md:p-10 w-full'
        }`}
      >
        <div
          ref={docRef}
          id="documento-visualizado"
          style={
            modoA4
              ? { transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }
              : ({
                  fontSize: `${14 * fontScale}px`,
                  '--doc-font-scale': `${fontScale}`,
                } as React.CSSProperties)
          }
          className={`text-slate-900 font-sans print:shadow-none print:m-0 print:w-full transition-transform duration-150 select-text ${
            modoA4
              ? 'bg-white w-[210mm] min-h-[297mm] p-[25mm] shadow-xl border border-slate-200 rounded-sm'
              : 'w-full max-w-full p-0 bg-transparent border-0 shadow-none rounded-none'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
