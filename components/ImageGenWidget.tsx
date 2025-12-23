import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, X, Download } from 'lucide-react';
import { generateLogisticsImage } from '../services/geminiService';
import { ImageSize } from '../types';

export const ImageGenWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError('');
    setGeneratedImage(null);

    try {
      const base64 = await generateLogisticsImage(prompt, size);
      setGeneratedImage(base64);
    } catch (e) {
      setError('Falha ao gerar imagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 z-50"
        title="Gerar Imagem AI"
      >
        <ImageIcon size={28} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="text-indigo-500" />
                H2 Studio Criativo
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prompt da Imagem</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Um caminhão de entrega futurista em Itajaí ao pôr do sol..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Qualidade (Gemini 3 Pro)</label>
                <div className="flex gap-2">
                  {Object.values(ImageSize).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        size === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Gerar Imagem
                  </>
                )}
              </button>

              {generatedImage && (
                <div className="mt-4 animate-in fade-in">
                  <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 relative group">
                    <img src={generatedImage} alt="Generated" className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a 
                            href={generatedImage} 
                            download="h2-logistics-ai.png"
                            className="bg-white text-indigo-900 px-4 py-2 rounded-full font-medium flex items-center gap-2"
                        >
                            <Download size={16} /> Baixar
                        </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
