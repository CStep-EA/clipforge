import React from 'react';
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F1117]">
      <div className="max-w-md w-full p-8 bg-[#1A1D27] rounded-2xl border border-[#2A2D3A] text-center space-y-5 mx-4">
        <div className="flex justify-center">
          <ClipForgeLogo size={56} variant="morph" showText />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-[#E8E8ED]">Access Restricted</h1>
        <p className="text-sm text-[#8B8D97]">
          You are not registered to use ClipForge. Please contact the administrator to request access.
        </p>
        <div className="p-4 bg-[#0F1117] rounded-xl border border-[#2A2D3A] text-left text-xs text-[#8B8D97] space-y-1">
          <p className="font-semibold text-[#E8E8ED] mb-2">Try these steps:</p>
          <p>• Verify you're logged in with the correct account</p>
          <p>• Contact the app administrator for access</p>
          <p>• Log out and back in again</p>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;