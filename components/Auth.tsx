
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Connection Diagnostics State
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [projectUrl, setProjectUrl] = useState('');

  const checkConnection = async () => {
    setConnectionStatus('checking');
    setConnectionError(null);
    try {
      // @ts-ignore - Accessing internal property for display purposes
      const url = (supabase as any).supabaseUrl || 'Supabase';
      setProjectUrl(url);

      // Simple ping to check if we can reach the auth service
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      
      setConnectionStatus('connected');
    } catch (err: any) {
      console.error('Connection check failed:', err);
      setConnectionStatus('error');
      setConnectionError(err.message || 'Failed to reach Supabase');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (connectionStatus === 'error') {
        setError('Cannot proceed: Database connection failed. Please check the status below.');
        return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Sign up successful! Check your email for the confirmation link.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-700"></div>

        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
            THE <span className="text-blue-600">NEWS</span>
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Sign in to access your dashboard' : 'Create a new account'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-t-xl relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-b-xl relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-start animate-pulse">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || connectionStatus === 'error'}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-95"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <span className="flex items-center">
                  {isLogin ? 'Sign In' : 'Sign Up'} 
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>

      {/* Connection Status Diagnostic Bar */}
      <div className="mt-8 max-w-md w-full bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 text-xs">
        <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 font-semibold uppercase tracking-wider">System Status</span>
            {connectionStatus === 'error' && (
                <button 
                    onClick={checkConnection}
                    className="text-blue-600 hover:text-blue-700 flex items-center"
                >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </button>
            )}
        </div>
        
        <div className="flex items-center space-x-3">
            {connectionStatus === 'checking' && (
                <div className="flex items-center text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Checking connection...
                </div>
            )}
            
            {connectionStatus === 'connected' && (
                <div className="flex items-center w-full">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                    <div className="flex-1">
                        <p className="text-gray-700 font-medium">Connected to Supabase</p>
                        <p className="text-gray-400 text-[10px] truncate">{projectUrl}</p>
                    </div>
                    <Wifi className="h-4 w-4 text-blue-500 opacity-50" />
                </div>
            )}
            
            {connectionStatus === 'error' && (
                <div className="flex items-center w-full">
                    <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                    <div className="flex-1">
                        <p className="text-red-600 font-medium">Connection Failed</p>
                        <p className="text-gray-500 text-[10px] mt-0.5 break-all">{connectionError}</p>
                    </div>
                    <WifiOff className="h-4 w-4 text-red-500 opacity-50" />
                </div>
            )}
        </div>
      </div>
    </div>
  );
}