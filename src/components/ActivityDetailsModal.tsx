import { Activity } from '../types';
import { X, FileText, Clock, User, CheckCircle, RefreshCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityDetailsModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityDetailsModal({ activity, isOpen, onClose }: ActivityDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <FileText className="text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-800">Detalhes da Atividade</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Ordem" value={activity.ordem} />
            <DetailItem label="Data Base" value={activity.data} />
            <DetailItem label="Executante" value={activity.executante} />
            <DetailItem label="Status" value={activity.status} />
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Descrição</h3>
            <p className="text-lg font-medium text-slate-800">{activity.atividade}</p>
          </div>

          {(activity.observacoes || (activity.fotos && activity.fotos.length > 0)) && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
               <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Últimas Evidências</h3>
               {activity.observacoes && (
                 <p className="text-slate-700 whitespace-pre-wrap mb-4">{activity.observacoes}</p>
               )}
               {activity.fotos && activity.fotos.length > 0 && (
                 <div className="flex flex-wrap gap-2">
                   {activity.fotos.map((f, i) => (
                     <img key={i} src={f} alt="Evidência" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                   ))}
                 </div>
               )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-wider">Histórico de Alterações</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {activity.historico?.map((entry, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <User size={16} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900">{entry.usuario}</div>
                      <time className="font-medium text-xs text-indigo-600">{format(new Date(entry.data), 'dd/MM/yyyy HH:mm')}</time>
                    </div>
                    <div className="text-slate-500 text-sm">{entry.mensagem}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div className="font-semibold text-slate-800 break-words">{value}</div>
    </div>
  );
}
