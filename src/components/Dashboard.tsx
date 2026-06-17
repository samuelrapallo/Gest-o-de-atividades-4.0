import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from '../types';

interface DashboardProps {
  activities: Activity[];
}

export default function Dashboard({ activities }: DashboardProps) {
  const total = activities.length;
  const pendentes = activities.filter(a => a.status === 'Pendente').length;
  const concluidos = activities.filter(a => a.status === 'Concluído').length;
  const reprogramados = activities.filter(a => a.status === 'Reprogramado').length;

  const pieData = [
    { name: 'Concluído', value: concluidos, color: '#10b981' }, // emerald-500
    { name: 'Pendente', value: pendentes, color: '#3b82f6' }, // blue-500
    { name: 'Reprogramado', value: reprogramados, color: '#f59e0b' }, // amber-500
  ].filter(d => d.value > 0);

  // Executante stats
  const executantesMap = new Map<string, any>();
  activities.forEach(a => {
    const ex = a.executante || 'Não definido';
    if (!executantesMap.has(ex)) {
      executantesMap.set(ex, { name: ex, Pendente: 0, Concluído: 0, Reprogramado: 0 });
    }
    executantesMap.get(ex)[a.status]++;
  });
  const barData = Array.from(executantesMap.values());

  const eficiencia = total > 0 ? ((concluidos / total) * 100).toFixed(1) + '%' : '0%';

  return (
    <div className="contents">
      {/* Stats Cards - visually appears First (order-1) by default or implicitly */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 order-1 w-full">
        <StatCard title="Total Atividades" value={total} containerClass="bg-white border-slate-200" titleClass="text-slate-400" textClass="text-slate-800" />
        <StatCard title="Pendentes" value={pendentes} containerClass="bg-blue-50 border-blue-100" titleClass="text-blue-600" textClass="text-blue-800" />
        <StatCard title="Concluídas" value={concluidos} containerClass="bg-emerald-50 border-emerald-100" titleClass="text-emerald-600" textClass="text-emerald-800" />
        <StatCard title="Reprogramadas" value={reprogramados} containerClass="bg-amber-50 border-amber-100" titleClass="text-amber-600" textClass="text-amber-800" />
        <StatCard title="Eficiência" value={eficiencia} containerClass="bg-slate-50 border-slate-200" titleClass="text-slate-400" textClass="text-slate-800" />
      </div>

      {/* Charts - visually appears Third (order-3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 order-3 w-full pb-8">
        {/* Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Status das Atividades</h3>
          <div className="flex-1 min-h-[200px]">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados</div>}
          </div>
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center pt-8">
            <span className="block text-xl font-bold bg-white text-slate-800 px-2">{total}</span>
            <span className="text-[10px] text-slate-400 uppercase bg-white px-2">Total</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase font-bold text-center">
            <div className="text-emerald-600">{concluidos}<br/>Concl</div>
            <div className="text-blue-600">{pendentes}<br/>Pend</div>
            <div className="text-amber-600">{reprogramados}<br/>Repr</div>
          </div>
        </div>

        {/* Performance by Executant */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Performance por Executante</h3>
          <div className="h-64 pr-2">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12, fontWeight: 500}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="Concluído" stackId="a" fill="#10b981" barSize={12} radius={[4, 0, 0, 4]} />
                  <Bar dataKey="Pendente" stackId="a" fill="#3b82f6" barSize={12} />
                  <Bar dataKey="Reprogramado" stackId="a" fill="#f59e0b" barSize={12} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, containerClass, titleClass, textClass }: { title: string, value: number | string, containerClass: string, titleClass: string, textClass: string }) {
  return (
    <div className={`p-3 rounded-lg border shadow-sm ${containerClass}`}>
      <p className={`text-[10px] uppercase font-bold mb-1 ${titleClass}`}>{title}</p>
      <p className={`text-xl font-bold ${textClass}`}>{value}</p>
    </div>
  );
}
