import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ClipForgeLogo from '@/components/shared/ClipForgeLogo';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0F1117] relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 y2k-pattern opacity-60" />
        <div className="pointer-events-none absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-[#00BFFF]/8 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute bottom-1/3 -right-20 w-64 h-64 rounded-full bg-[#9370DB]/8 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* Logo */}
                    <div className="flex justify-center mb-2">
                        <ClipForgeLogo size={64} variant="morph" showText />
                    </div>
                    {/* 404 Error Code */}
                    <div className="space-y-2">
                        <h1 className="text-7xl font-black gradient-text">404</h1>
                        <div className="h-0.5 w-16 mx-auto" style={{ background: "linear-gradient(90deg,#00BFFF,#9370DB)" }}></div>
                    </div>
                    
                    {/* Main Message */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium text-[#E8E8ED]">
                            Page Not Found
                        </h2>
                        <p className="text-[#8B8D97] leading-relaxed">
                            The page <span className="font-medium text-[#E8E8ED]">"{pageName}"</span> could not be found in this application.
                        </p>
                    </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-[#1A1D27] rounded-lg border border-[#2A2D3A]">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-900/30 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium text-[#E8E8ED]">Admin Note</p>
                                    <p className="text-sm text-[#8B8D97] leading-relaxed">
                                        This could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="pt-6">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#E8E8ED] bg-[#1A1D27] border border-[#2A2D3A] rounded-lg hover:bg-[#2A2D3A] hover:border-[#00BFFF]/40 transition-colors duration-200 focus:outline-none"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}