import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, doc, onSnapshot, query, updateDoc, writeBatch, deleteDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Activity, Project, Status } from '../types';
import Dashboard from '../components/Dashboard';
import ActivityModal from '../components/ActivityModal';
import ActivityDetailsModal from '../components/ActivityDetailsModal';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as xlsx from 'xlsx';
import { Link2, Trash2, Download, Search, Settings2, Info, Check, Clock, RotateCcw, UploadCloud } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [intendedStatus, setIntendedStatus] = useState<Status | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!projectId) return;

    const unsubProject = onSnapshot(doc(db, 'projects', projectId), (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() } as Project);
      }
    });

    const q = query(collection(db, 'projects', projectId, 'activities'));
    const unsubActivities = onSnapshot(q, (querySnapshot) => {
      const acts: Activity[] = [];
      querySnapshot.forEach((d) => {
        acts.push({ id: d.id, ...d.data() } as Activity);
      });
      // Sort by order/id or something
      acts.sort((a, b) => {
        const orderA = parseInt(a.ordem) || 0;
        const orderB = parseInt(b.ordem) || 0;
        return orderA - orderB || a.ordem.localeCompare(b.ordem);
      });
      setActivities(acts);
      setLoading(false);
    });

    return () => {
      unsubProject();
      unsubActivities();
    };
  }, [projectId]);

  const isAdmin = user && project && user.uid === project.adminUid;

  const handleStatusChangeClick = async (activity: Activity, status: Status) => {
    if (status === 'Pendente') {
      await updateActivityStatus(activity, status, '', []);
    } else {
      await updateActivityStatus(activity, status, '', []);
      // Refresh selected activity so it opens modal with new status
      setSelectedActivity({...activity, status});
      setIntendedStatus(status);
      setIsActionModalOpen(true);
    }
  };

  const updateActivityStatus = async (activity: Activity, status: Status, obs: string, fotos: string[]) => {
    if (!projectId) return;
    
    const userName = user?.displayName || 'Visitante';
    const newEntry = {
      id: crypto.randomUUID(),
      usuario: userName,
      data: new Date().toISOString(),
      mensagem: `Status alterado de ${activity.status} para ${status}. ${obs ? `Obs: ${obs}` : ''}`
    };

    const docRef = doc(db, 'projects', projectId, 'activities', activity.id);
    await updateDoc(docRef, {
      status,
      observacoes: obs || activity.observacoes, // Keep old if empty, or maybe overwrite? Let's append or overwrite.
      fotos: fotos.length > 0 ? fotos : activity.fotos,
      historico: [...(activity.historico || []), newEntry]
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copiado para a área de transferência!');
  };

  const handleClearTable = async () => {
    if (!isAdmin || !projectId) return;
    if (!window.confirm('Tem certeza que deseja apagar todas as atividades? Esta ação não pode ser desfeita.')) return;
    
    const batch = writeBatch(db);
    activities.forEach(a => {
      batch.delete(doc(db, 'projects', projectId, 'activities', a.id));
    });
    await batch.commit();
  };

  const handleReplaceSpreadsheet = async () => {
    if (!isAdmin || !projectId) return;
    // Just navigate home? Or clear and go home?
    if (!window.confirm('Deseja carregar nova planilha e apagar o projeto atual?')) return;
    
    // Delete all acts
    const batch = writeBatch(db);
    activities.forEach(a => {
      batch.delete(doc(db, 'projects', projectId, 'activities', a.id));
    });
    await batch.commit();
    await deleteDoc(doc(db, 'projects', projectId));
    window.location.href = '/';
  };

  const exportPDF = () => {
    if (!project) return;
    const doc = new jsPDF();
    doc.text(`Relatório de Atividades - ${project.nome}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    
    const tableData = filteredActivities.map(a => [
      a.ordem,
      a.atividade,
      a.data,
      a.executante,
      a.status
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Ordem', 'Atividade', 'Data', 'Executante', 'Status']],
      body: tableData,
      didParseCell: function (data) {
        if (data.column.index === 4) { // Status column
          if (data.cell.raw === 'Concluído') {
            data.cell.styles.textColor = [16, 185, 129]; // Green
          } else if (data.cell.raw === 'Reprogramado') {
            data.cell.styles.textColor = [245, 158, 11]; // Orange
          } else {
            data.cell.styles.textColor = [59, 130, 246]; // Blue
          }
        }
      }
    });

    // We can also append photos and obs, but that could blow up PDF size quickly. 
    // In a real app we'd add pages per evidence. For now keep simple table.
    doc.save(`relatorio_${project.nome}.pdf`);
  };

  const exportExcel = () => {
    if (!project) return;
    const data = filteredActivities.map(a => ({
      Ordem: a.ordem,
      Atividade: a.atividade,
      Data: a.data,
      Executante: a.executante,
      Status: a.status,
      Observacoes: a.observacoes
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Atividades");
    xlsx.writeFile(wb, `relatorio_${project.nome}.xlsx`);
  };

  // Filter logic
  const filteredActivities = activities.filter(a => {
    const matchSearch = Object.values(a).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchStatus = statusFilter === 'Todos' || a.status === statusFilter;
    const matchDate = dateFilter === '' || a.data.includes(dateFilter);
    return matchSearch && matchStatus && matchDate;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Projeto não encontrado.</div>;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Painel Executivo</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight truncate" title={project.nome}>{project.nome}</h1>
        </div>
        
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 block">Filtros Avançados</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs">Atividade / Pesquisa</span>
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded p-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs">Status</span>
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded p-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Reprogramado">Reprogramado</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-xs">Data Exata</span>
                <input 
                  type="text"
                  placeholder="Ex: 24/10/2023"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded p-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Ao vivo sincronizado</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'Visitante'}</p>
            <p className="text-[10px] text-slate-500 truncate">{isAdmin ? 'Administrador' : 'Editor'}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 lg:px-8 lg:py-4 shrink-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 truncate" title={project.nome}>{project.nome}</h2>
              <p className="text-sm text-slate-500">Atualizado em tempo real • Resp: {project.adminName || 'Admin'}</p>
            </div>
            <div className="flex gap-2 shrink-0">
               <button onClick={handleShare} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors">
                 <Link2 size={14} /> <span className="hidden md:inline">Link Público</span>
               </button>
               
               <div className="relative group flex">
                  <button className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors">
                    <Download size={14} /> <span className="hidden md:inline">Relatórios</span>
                  </button>
                  <div className="absolute right-0 mt-8 w-36 bg-white border border-slate-200 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <button onClick={exportPDF} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 font-semibold text-slate-700 hover:text-blue-600">PDF</button>
                      <button onClick={exportExcel} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors font-semibold text-slate-700 hover:text-blue-600">Excel</button>
                  </div>
               </div>

               {isAdmin && (
                 <div className="relative group flex">
                    <button className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded flex items-center gap-2 transition-colors">
                      <Settings2 size={14} /> <span className="hidden md:inline">Ajustes</span>
                    </button>
                    <div className="absolute right-0 mt-8 w-48 bg-white border border-slate-200 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <button onClick={handleClearTable} className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors border-b border-slate-100 font-semibold">
                          <Trash2 size={14} /> Limpar Tabela
                        </button>
                        <button onClick={handleReplaceSpreadsheet} className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors font-semibold">
                          <UploadCloud size={14} /> Nova Planilha
                        </button>
                     </div>
                 </div>
               )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto">
          <Dashboard activities={activities} />

          {/* Top Area: Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px] order-2 w-full">
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-left text-sm whitespace-nowrap lg:whitespace-normal">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Atividade</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Ordem</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Data</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Executante</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Nenhuma atividade encontrada</td>
                    </tr>
                  ) : filteredActivities.map(act => (
                    <tr key={act.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate" title={act.atividade}>{act.atividade}</td>
                      <td className="px-4 py-3 text-slate-500">{act.ordem}</td>
                      <td className="px-4 py-3">{act.data}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                           {act.executante ? act.executante.slice(0, 2).toUpperCase() : '?'}
                        </div>
                        {act.executante}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] tracking-wider font-bold uppercase",
                          act.status === 'Concluído' && "bg-emerald-100 text-emerald-700",
                          act.status === 'Reprogramado' && "bg-amber-100 text-amber-700",
                          act.status === 'Pendente' && "bg-blue-100 text-blue-700"
                        )}>
                          {act.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setSelectedActivity(act); setIsDetailsModalOpen(true); }}
                            className="text-blue-600 hover:underline font-semibold text-xs"
                          >
                            Instruções
                          </button>
                          
                          {act.status === 'Pendente' && (
                            <>
                              <button 
                                onClick={() => handleStatusChangeClick(act, 'Concluído')}
                                className="bg-emerald-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-emerald-700 transition"
                              >
                                Concluir
                              </button>
                              <button 
                                onClick={() => handleStatusChangeClick(act, 'Reprogramado')}
                                className="bg-amber-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-amber-600 transition"
                              >
                                Reprogramar
                              </button>
                            </>
                          )}

                          {act.status !== 'Pendente' && (
                             <button 
                               onClick={() => handleStatusChangeClick(act, 'Pendente')}
                               className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                             >
                               Refazer
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Dashboard activities={activities} />

        </div>
        
        <footer className="px-8 py-2 border-t border-slate-200 bg-white flex justify-between items-center text-[10px] text-slate-400 shrink-0">
          <div>MODO: <span className="text-emerald-600 font-bold uppercase">Live Sincronizado</span></div>
          <div className="flex gap-4 uppercase">
            <span>Auditoria v2.4.0</span>
          </div>
        </footer>
      </main>

      {selectedActivity && (
        <ActivityModal 
          isOpen={isActionModalOpen}
          activity={selectedActivity}
          title={`Observações - ${intendedStatus}`}
          onClose={() => { setIsActionModalOpen(false); setSelectedActivity(null); }}
          onSave={async (obs, fotos) => {
            if (intendedStatus) {
              await updateActivityStatus({ ...selectedActivity, observacoes: obs, fotos }, intendedStatus, obs, fotos);
            }
          }}
        />
      )}

      {selectedActivity && (
         <ActivityDetailsModal 
           isOpen={isDetailsModalOpen}
           activity={selectedActivity}
           onClose={() => { setIsDetailsModalOpen(false); setSelectedActivity(null); }}
         />
      )}
    </div>
  );
}
