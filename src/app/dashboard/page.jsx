"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // 1. Client-side Validation
    if (!uid || !password) {
      setStatus("error");
      setErrorMessage("Please enter both UID and Password.");
      return;
    }

    // 2. Loading State
    setStatus("loading");

    try {
      // Simulate API Authentication Call (Replace with your actual backend route)
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (uid === "HYPERLOOP" && password === "EHW") {
            resolve();
          } else {
            reject(new Error("Invalid credentials provided."));
          }
        }, 1500); // 1.5s simulated network delay
      });

      // 3. Success State & Animation Transition
      setStatus("success");
      
      // Wait 2 seconds for the animation to play, then redirect
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (err) {
      // 4. Error Handling (Network or Invalid Credentials)
      setStatus("error");
      setErrorMessage(err.message || "A server error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] p-4 text-white">
      {/* Frosted Glass Container */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* Success State Overlay (Fades in on success) */}
        <div 
          className={`absolute inset-0 bg-[#0a0f1c]/90 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-500 z-10 ${
            status === "success" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white animate-fade-in-up">
            Welcome, Aman
          </h2>
          <p className="text-sm text-gray-400 mt-2 animate-fade-in-up delay-75">
            Connecting to dashboard...
          </p>
        </div>

        {/* Login Form */}
        <div className={`transition-all duration-500 ${status === "success" ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">System Login</h1>
            <p className="text-gray-400 text-sm mt-2">Enter your credentials to access the node.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* UID Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">User ID</label>
              <input
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                disabled={status === "loading"}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-gray-500 disabled:opacity-50"
                placeholder="Enter UID"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === "loading"}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-white placeholder-gray-500 disabled:opacity-50"
                placeholder="Enter Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.71-2.29c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
                )}
              </button>
            </div>

            {/* Error Message */}
            {status === "error" && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

}
