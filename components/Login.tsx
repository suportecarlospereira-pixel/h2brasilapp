
import React, { useState } from 'react';
import { UserRole } from '../types';
import { Truck, ShieldCheck, ArrowRight, Lock, User, Briefcase } from 'lucide-react';
import { Logo } from './Logo';

interface LoginProps {
  onLogin: (name: string, role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState(''); // Used for Driver Name
  const [password, setPassword] = useState(''); // Used for Admin Password
  const [role, setRole] = useState<UserRole>(UserRole.DRIVER);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulation of authentication delay
    setTimeout(() => {
        setIsLoading(false);
        
        if (role === UserRole.ADMIN) {
            // Admin Login: Only Password check
            if (password === 'lulaladrao') { 
                onLogin('Gestor Logístico', UserRole.ADMIN);
            } else {
                setError('Senha de acesso inválida.');
            }
        } else {
            // Driver Login: Name check
            if (email.length > 2) {
                // Using email variable to store driver name input
                const name = email.split('@')[0]; // Just in case they type an email
                const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
                onLogin(formattedName, UserRole.DRIVER);
            } else {
                setError('Por favor, insira seu nome ou identificação.');
            }
        }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Abstract Corporate Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
             <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#002776] rounded-full blur-[120px] opacity-40"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#009c3b] rounded-full blur-[120px] opacity-30"></div>
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        </div>

      <div className="bg-white/95 backdrop-blur-xl border border-white/20 p-8 rounded-2xl w-full max-w-md shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
            <Logo className="w-24 h-24 mb-4" />
            <h2 className="text-slate-800 font-bold text-xl">Acesso Corporativo</h2>
            <p className="text-slate-500 text-sm">H2 Brasil Logística Inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex">
              <button
                type="button"
                onClick={() => { setRole(UserRole.DRIVER); setError(''); setPassword(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  role === UserRole.DRIVER
                    ? 'bg-white text-[#002776] shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Truck size={16} /> Motorista
              </button>
              <button
                type="button"
                onClick={() => { setRole(UserRole.ADMIN); setError(''); setEmail(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  role === UserRole.ADMIN
                    ? 'bg-white text-[#009c3b] shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ShieldCheck size={16} /> Gestão
              </button>
          </div>

          <div className="space-y-4">
            {/* INPUT MOTORISTA (SÓ NOME) */}
            {role === UserRole.DRIVER && (
                <div className="animate-in fade-in slide-in-from-left-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                        Nome do Motorista
                    </label>
                    <div className="relative group">
                        <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#002776] transition-colors">
                            <User size={20} />
                        </div>
                        <input
                            type="text"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#002776]/20 focus:border-[#002776] outline-none transition-all"
                        />
                    </div>
                </div>
            )}

            {/* INPUT GESTÃO (SÓ SENHA) */}
            {role === UserRole.ADMIN && (
                <div className="animate-in fade-in slide-in-from-right-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Senha Administrativa</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#002776] transition-colors">
                            <Lock size={20} />
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#002776]/20 focus:border-[#002776] outline-none transition-all"
                        />
                    </div>
                </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-lg flex items-center gap-2 animate-pulse">
                <ShieldCheck size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#002776] hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:translate-y-0"
          >
            {isLoading ? (
                <span className="animate-pulse">Autenticando...</span>
            ) : (
                <>ACESSAR PAINEL <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
            <span>v2.4.1 (Stable)</span>
            <span className="flex items-center gap-1"><Briefcase size={12} /> Uso exclusivo corporativo</span>
        </div>
      </div>
    </div>
  );
};
