import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import * as xlsx from 'xlsx';
import { Upload, LogIn, Layout } from 'lucide-react';
import { Status, Activity } from '../types';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || 'Erro desconhecido';
      if (errorMessage.includes('auth/unauthorized-domain')) {
        alert('Erro: Domínio não autorizado. Acesse o Firebase Console (console.firebase.google.com), selecione seu projeto, vá em Authentication > Settings > Authorized domains e adicione o domínio do Vercel.');
      } else {
        alert(`Erro no login: ${errorMessage}`);
      }
    }
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(json);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user || !projectName.trim()) return;
    
    setLoading(true);
    try {
      const file = e.target.files[0];
      const data = await parseExcel(file);
      
      // Expected header: [ATIVIDADE, ORDEM, DATA, EXECUTANTE]
      // Assume first row is header
      const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
      
      const projectRef = await addDoc(collection(db, 'projects'), {
        adminUid: user.uid,
        adminName: user.displayName,
        nome: projectName,
        dataCriacao: new Date().toISOString()
      });

      const projectId = projectRef.id;

      // Batch write activities in chunks of 450 to avoid Firestore limits
      const chunkSize = 450;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((row) => {
          const actRef = doc(collection(db, 'projects', projectId, 'activities'));
          const activity = {
            atividade: String(row[0] || ''),
            ordem: String(row[1] || ''),
            data: String(row[2] || ''),
            executante: String(row[3] || ''),
            status: 'Pendente' as Status,
            observacoes: '',
            fotos: [],
            historico: [{
              id: crypto.randomUUID(),
              usuario: user.displayName || 'Admin',
              data: new Date().toISOString(),
              mensagem: 'Atividade importada.'
            }]
          };
          batch.set(actRef, activity);
        });

        await batch.commit();
      }
      
      navigate(`/project/${projectId}`);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || 'Erro desconhecido.';
      alert(`Erro ao importar planilha: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex justify-center mb-6 text-indigo-600">
          <Layout size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold text-center text-slate-800 mb-2">
          Gestão de Atividades
        </h1>
        <p className="text-slate-500 text-center mb-8 text-sm">
          Importe sua planilha e gerencie operações em tempo real.
        </p>

        {!user ? (
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-medium transition-colors"
          >
            <LogIn size={20} />
            Continuar com Google
          </button>
        ) : (
          <div className="space-y-6">
            <div className="text-center text-sm text-slate-600">
              Logado como <span className="font-medium text-slate-900">{user.displayName}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nome do Projeto</label>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Vistorias Q3"
                className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${projectName.trim() ? 'border-indigo-300 hover:bg-indigo-50' : 'border-slate-200 opacity-50 cursor-not-allowed'}`}>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={!projectName.trim() || loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center gap-2 text-indigo-600">
                <Upload size={32} />
                <span className="font-medium">{loading ? 'Importando...' : 'Fazer upload da planilha'}</span>
                <span className="text-xs text-slate-500 font-normal">.xlsx ou .xls</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
