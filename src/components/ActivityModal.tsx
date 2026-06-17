import { useState, useRef } from 'react';
import { Activity } from '../types';
import { X, Mic, StopCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ActivityModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
  onSave: (obs: string, base64Images: string[]) => void;
  title: string;
}

export default function ActivityModal({ activity, isOpen, onClose, onSave, title }: ActivityModalProps) {
  const [obs, setObs] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("A transcrição de voz não é suportada neste navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setObs(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
  };

  const handleDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const dropzoneOptions: any = { onDrop: handleDrop, accept: {'image/*': []} };
  const { getRootProps, getInputProps } = useDropzone(dropzoneOptions);

  const handleSave = () => {
    onSave(obs, images);
    setObs('');
    setImages([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button onClick={handleSave} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <span className="text-slate-500 font-medium">Atividade:</span>
              <span className="font-semibold text-slate-800">{activity.atividade}</span>
              <span className="text-slate-500 font-medium">Executante:</span>
              <span className="text-slate-800">{activity.executante}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Observações
              <button 
                onClick={handleMicClick} 
                className={`p-1.5 rounded-full border transition-colors ${isRecording ? 'bg-red-100 text-red-600 border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'}`}
                title="Falar"
              >
                {isRecording ? <StopCircle size={16} /> : <Mic size={16} />}
              </button>
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Digite aqui ou use o microfone..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Anexar Fotos</label>
            <div {...getRootProps()} className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
              <input {...getInputProps()} />
              <Upload className="mx-auto text-indigo-400 mb-2" size={24} />
              <p className="text-sm text-slate-500 font-medium">Arraste fotos ou clique para selecionar</p>
            </div>
            
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Concluir Edição
          </button>
        </div>
      </div>
    </div>
  );
}
